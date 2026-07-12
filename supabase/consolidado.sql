-- ############################################################
-- CONSOLIDADO — Sistema clínico Dra. Reyna Massiel
-- Ejecuta TODO este archivo de una vez en el SQL Editor de Supabase.
-- Equivale a correr 0001 → 0005 en orden. Idempotente (se puede repetir).
-- Al final: verificación del Security Advisor + recordatorio de ajustes.
-- ############################################################


-- ============================================================
-- 0001 — Esquema base + roles + auditoría
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'recepcion', 'asistente');
  end if;
end $$;

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text        not null,
  cedula          text,
  telefono        text,
  rol             public.user_role not null default 'asistente',
  activo          boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.profiles is 'Perfil y rol de cada usuaria del sistema. Fuente de verdad de autorización.';
alter table public.profiles enable row level security;
alter table public.profiles force  row level security;

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  actor_email text,
  accion      text        not null,
  entidad     text,
  entidad_id  text,
  metadata    jsonb       not null default '{}'::jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
comment on table public.audit_log is 'Bitácora inmutable: quién, qué, cuándo. Solo lectura para admin; escritura solo vía función.';
create index if not exists idx_audit_log_created_at on public.audit_log (created_at desc);
create index if not exists idx_audit_log_actor on public.audit_log (actor_id);
alter table public.audit_log enable row level security;
alter table public.audit_log force  row level security;

create table if not exists public.role_permissions (
  rol          public.user_role not null,
  recurso      text    not null,
  puede_ver    boolean not null default false,
  puede_crear  boolean not null default false,
  puede_editar boolean not null default false,
  puede_borrar boolean not null default false,
  primary key (rol, recurso)
);
comment on table public.role_permissions is 'Matriz de permisos por rol y recurso. Autoridad server-side.';
alter table public.role_permissions enable row level security;
alter table public.role_permissions force  row level security;

create table if not exists public.rate_limits (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, window_start)
);
comment on table public.rate_limits is 'Contador de ventana fija para rate limiting. Solo accesible vía función SECURITY DEFINER / service_role.';
create index if not exists idx_rate_limits_window on public.rate_limits (window_start);
alter table public.rate_limits enable row level security;
alter table public.rate_limits force  row level security;

create or replace function public.current_user_role()
returns public.user_role language sql stable security definer
set search_path = public, pg_temp as $$
  select rol from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin' and activo = true
  );
$$;

create or replace function public.count_active_admins()
returns integer language sql stable security definer
set search_path = public, pg_temp as $$
  select count(*)::int from public.profiles where rol = 'admin' and activo = true;
$$;

create or replace function public.log_audit(
  p_accion text, p_entidad text default null,
  p_entidad_id text default null, p_metadata jsonb default '{}'::jsonb
)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  insert into public.audit_log (actor_id, actor_email, accion, entidad, entidad_id, metadata)
  values (
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    p_accion, p_entidad, p_entidad_id, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.enforce_rate_limit(
  p_bucket text, p_max integer, p_window_seconds integer
)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_window timestamptz;
  v_hits   integer;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, nombre_completo, cedula, telefono, rol, activo)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre_completo', ''), 'Usuaria'),
    nullif(new.raw_user_meta_data ->> 'cedula', ''),
    nullif(new.raw_user_meta_data ->> 'telefono', ''),
    'asistente',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.guard_admin_invariants()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    if old.rol = 'admin' and old.activo then
      if (select count(*) from public.profiles
          where rol = 'admin' and activo and id <> old.id) = 0 then
        raise exception 'No se puede eliminar al último administrador activo.'
          using errcode = 'check_violation';
      end if;
    end if;
    return old;
  end if;

  if auth.role() <> 'service_role' then
    if new.rol <> old.rol and not public.is_admin() then
      raise exception 'No autorizada para cambiar el rol.'
        using errcode = 'insufficient_privilege';
    end if;
    if new.activo <> old.activo and not public.is_admin() then
      raise exception 'No autorizada para cambiar el estado de la cuenta.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if old.rol = 'admin' and old.activo
     and (new.rol <> 'admin' or new.activo = false) then
    if (select count(*) from public.profiles
        where rol = 'admin' and activo and id <> old.id) = 0 then
      raise exception 'No se puede degradar ni desactivar al último administrador activo.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_admin on public.profiles;
create trigger trg_guard_admin before update or delete on public.profiles
  for each row execute function public.guard_admin_invariants();


-- ============================================================
-- 0002 — Políticas RLS (negar por defecto)
-- ============================================================

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select to authenticated
  using (public.is_admin());

drop policy if exists perm_select on public.role_permissions;
create policy perm_select on public.role_permissions
  for select to authenticated
  using (true);

drop policy if exists perm_write on public.role_permissions;
create policy perm_write on public.role_permissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on function public.enforce_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.enforce_rate_limit(text, integer, integer) to service_role;
grant execute on function public.is_admin()            to authenticated;
grant execute on function public.current_user_role()   to authenticated;
grant execute on function public.log_audit(text, text, text, jsonb) to authenticated;


-- ============================================================
-- 0003 — Matriz de permisos (4 módulos + infraestructura)
-- ============================================================

insert into public.role_permissions (rol, recurso, puede_ver, puede_crear, puede_editar, puede_borrar) values
  ('admin', 'pacientes',  true, true, true, true),
  ('admin', 'agenda',     true, true, true, true),
  ('admin', 'usuarios',   true, true, true, true),
  ('admin', 'auditoria',  true, false, false, false),
  ('recepcion', 'pacientes', true, true, true, false),
  ('recepcion', 'agenda',    true, true, true, true),
  ('recepcion', 'usuarios',  false, false, false, false),
  ('recepcion', 'auditoria', false, false, false, false),
  ('asistente', 'pacientes', true, false, true, false),
  ('asistente', 'agenda',    true, false, false, false),
  ('asistente', 'usuarios',  false, false, false, false),
  ('asistente', 'auditoria', false, false, false, false)
on conflict (rol, recurso) do update set
  puede_ver = excluded.puede_ver, puede_crear = excluded.puede_crear,
  puede_editar = excluded.puede_editar, puede_borrar = excluded.puede_borrar;


-- ============================================================
-- 0004 — Módulo de pacientes + función puede()
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'sexo_paciente') then
    create type public.sexo_paciente as enum ('femenino', 'masculino');
  end if;
end $$;

create or replace function public.puede(p_recurso text, p_accion text)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select coalesce((
    select case p_accion
      when 'ver'    then puede_ver
      when 'crear'  then puede_crear
      when 'editar' then puede_editar
      when 'borrar' then puede_borrar
      else false
    end
    from public.role_permissions
    where rol = public.current_user_role() and recurso = p_recurso
  ), false);
$$;
grant execute on function public.puede(text, text) to authenticated;

create table if not exists public.pacientes (
  id                      uuid primary key default gen_random_uuid(),
  nombres                 text not null,
  apellidos               text not null,
  cedula                  text unique,
  fecha_nacimiento        date,
  sexo                    public.sexo_paciente,
  telefono                text,
  correo                  text,
  direccion               text,
  ars                     text,
  numero_afiliado         text,
  tipo_sangre             text,
  alergias                text,
  antecedentes            text,
  contacto_emergencia_nombre   text,
  contacto_emergencia_telefono text,
  notas                   text,
  activo                  boolean not null default true,
  created_by              uuid references auth.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
comment on table public.pacientes is 'Expediente base de pacientes de la consulta.';
create index if not exists idx_pacientes_apellidos on public.pacientes (apellidos, nombres);
create index if not exists idx_pacientes_cedula on public.pacientes (cedula);
create index if not exists idx_pacientes_activo on public.pacientes (activo);
alter table public.pacientes enable row level security;
alter table public.pacientes force  row level security;

drop trigger if exists trg_pacientes_touch on public.pacientes;
create trigger trg_pacientes_touch before update on public.pacientes
  for each row execute function public.touch_updated_at();

drop policy if exists pacientes_select on public.pacientes;
create policy pacientes_select on public.pacientes
  for select to authenticated using (public.puede('pacientes', 'ver'));

drop policy if exists pacientes_insert on public.pacientes;
create policy pacientes_insert on public.pacientes
  for insert to authenticated with check (public.puede('pacientes', 'crear'));

drop policy if exists pacientes_update on public.pacientes;
create policy pacientes_update on public.pacientes
  for update to authenticated
  using (public.puede('pacientes', 'editar'))
  with check (public.puede('pacientes', 'editar'));

drop policy if exists pacientes_delete on public.pacientes;
create policy pacientes_delete on public.pacientes
  for delete to authenticated using (public.puede('pacientes', 'borrar'));


-- ============================================================
-- 0005 — Expansión cardiológica + estudios_cardiologicos + Storage
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_civil') then
    create type public.estado_civil as enum
      ('soltero', 'casado', 'union_libre', 'divorciado', 'viudo', 'otro');
  end if;
  if not exists (select 1 from pg_type where typname = 'diabetes_tipo') then
    create type public.diabetes_tipo as enum ('no', 'tipo_1', 'tipo_2');
  end if;
  if not exists (select 1 from pg_type where typname = 'tabaquismo_estado') then
    create type public.tabaquismo_estado as enum ('nunca', 'exfumador', 'activo');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_estudio') then
    create type public.tipo_estudio as enum
      ('ecocardiograma', 'electrocardiograma', 'prueba_esfuerzo',
       'holter_ritmo', 'holter_presion', 'otro');
  end if;
end $$;

alter table public.pacientes
  add column if not exists estado_civil public.estado_civil,
  add column if not exists ocupacion text,
  add column if not exists telefono_secundario text,
  add column if not exists ciudad_sector text,
  add column if not exists tipo_plan text,
  add column if not exists contacto_emergencia_parentesco text,
  add column if not exists peso numeric(5, 2),
  add column if not exists talla numeric(5, 2),
  add column if not exists circunferencia_abdominal numeric(5, 2);

alter table public.pacientes
  add column if not exists imc numeric
  generated always as (
    case
      when peso is not null and talla is not null and talla > 0
      then round((peso / ((talla / 100.0) ^ 2))::numeric, 1)
      else null
    end
  ) stored;

alter table public.pacientes
  add column if not exists rf_hipertension boolean not null default false,
  add column if not exists rf_hipertension_desde text,
  add column if not exists rf_diabetes public.diabetes_tipo not null default 'no',
  add column if not exists rf_diabetes_desde text,
  add column if not exists rf_dislipidemia boolean not null default false,
  add column if not exists rf_tabaquismo public.tabaquismo_estado not null default 'nunca',
  add column if not exists rf_tabaquismo_paquetes_ano numeric(5, 1),
  add column if not exists rf_sedentarismo boolean not null default false,
  add column if not exists rf_antecedentes_familiares boolean not null default false,
  add column if not exists rf_antecedentes_familiares_parentesco text,
  add column if not exists rf_enfermedad_renal boolean not null default false;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pacientes' and column_name = 'antecedentes'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pacientes' and column_name = 'antecedentes_patologicos'
  ) then
    alter table public.pacientes rename column antecedentes to antecedentes_patologicos;
  end if;
end $$;

alter table public.pacientes
  add column if not exists antecedentes_patologicos text,
  add column if not exists antecedentes_quirurgicos text,
  add column if not exists antecedentes_cardiovasculares text,
  add column if not exists medicacion jsonb not null default '[]'::jsonb,
  add column if not exists referido_por text;

create table if not exists public.estudios_cardiologicos (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes (id) on delete cascade,
  tipo           public.tipo_estudio not null,
  fecha_estudio  date not null,
  hallazgos      text,
  conclusion     text,
  archivo_path   text,
  archivo_nombre text,
  realizado_por  text,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);
comment on table public.estudios_cardiologicos is
  'Historial de estudios cardiológicos por paciente (ecocardiograma, ECG, Holter, etc.).';
create index if not exists idx_estudios_paciente on public.estudios_cardiologicos (paciente_id, fecha_estudio desc);
alter table public.estudios_cardiologicos enable row level security;
alter table public.estudios_cardiologicos force  row level security;

insert into public.role_permissions (rol, recurso, puede_ver, puede_crear, puede_editar, puede_borrar) values
  ('admin',     'estudios', true,  true,  true,  true),
  ('recepcion', 'estudios', true,  false, false, false),
  ('asistente', 'estudios', true,  true,  true,  false)
on conflict (rol, recurso) do update set
  puede_ver = excluded.puede_ver, puede_crear = excluded.puede_crear,
  puede_editar = excluded.puede_editar, puede_borrar = excluded.puede_borrar;

drop policy if exists estudios_select on public.estudios_cardiologicos;
create policy estudios_select on public.estudios_cardiologicos
  for select to authenticated using (public.puede('estudios', 'ver'));

drop policy if exists estudios_insert on public.estudios_cardiologicos;
create policy estudios_insert on public.estudios_cardiologicos
  for insert to authenticated with check (public.puede('estudios', 'crear'));

drop policy if exists estudios_update on public.estudios_cardiologicos;
create policy estudios_update on public.estudios_cardiologicos
  for update to authenticated
  using (public.puede('estudios', 'editar'))
  with check (public.puede('estudios', 'editar'));

drop policy if exists estudios_delete on public.estudios_cardiologicos;
create policy estudios_delete on public.estudios_cardiologicos
  for delete to authenticated using (public.puede('estudios', 'borrar'));

insert into storage.buckets (id, name, public)
values ('estudios', 'estudios', false)
on conflict (id) do nothing;

drop policy if exists estudios_obj_select on storage.objects;
create policy estudios_obj_select on storage.objects
  for select to authenticated
  using (bucket_id = 'estudios' and public.puede('estudios', 'ver'));

drop policy if exists estudios_obj_insert on storage.objects;
create policy estudios_obj_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'estudios' and public.puede('estudios', 'crear'));

drop policy if exists estudios_obj_delete on storage.objects;
create policy estudios_obj_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'estudios' and public.puede('estudios', 'borrar'));


-- ############################################################
-- VERIFICACIÓN DEL SECURITY ADVISOR
-- Corre esta sección (idealmente por separado) para revisar cada resultado.
-- ############################################################

-- 1) RLS + FORCE en TODAS las tablas de 'public' (esperado: true/true en las 6).
select c.relname as tabla, c.relrowsecurity as rls, c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- 2) Tablas de 'public' SIN RLS (debe devolver 0 filas).
select c.relname as tabla_sin_rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;

-- 3) Políticas por tabla.
select schemaname, tablename, policyname, cmd
from pg_policies where schemaname = 'public'
order by tablename, policyname;

-- 4) Funciones SECURITY DEFINER y su search_path fijo (todas con config).
select p.proname as funcion, p.prosecdef as security_definer,
  coalesce(array_to_string(p.proconfig, ', '), '(sin search_path)') as config
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- 5) Bucket 'estudios' debe ser PRIVADO (public = false).
select id, name, public from storage.buckets where id = 'estudios';

-- 6) Políticas RLS sobre storage.objects del bucket 'estudios'.
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'estudios_obj_%'
order by policyname;

-- ############################################################
-- AJUSTES EN EL PANEL (no SQL) — obligatorios para Fort Knox:
--   • Authentication → Sign In / Providers → Email:
--       "Allow new users to sign up" = OFF  (solo la admin crea cuentas).
--   • Authentication → URL Configuration → Redirect URLs:
--       agregar la URL de producción y .../auth/callback
--   • Tras esto, el Security Advisor debe quedar SIN advertencias.
--
-- BOOTSTRAP de la primera administradora (una sola vez):
--   1) Authentication → Users → Add user (con Auto Confirm) para la Dra. Reyna.
--   2) Ejecuta, reemplazando el correo:
--        update public.profiles
--        set rol = 'admin', nombre_completo = 'Dra. Reyna Massiel', activo = true
--        where id = (select id from auth.users where email = 'CORREO_DE_LA_DOCTORA');
-- ############################################################
