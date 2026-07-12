-- ============================================================
-- 0001_esquema.sql — Esquema base + roles + auditoría
-- Sistema clínico Dra. Reyna Massiel · JM Designs Worldwide
-- ============================================================
-- Todas las tablas nacen con RLS + FORCE ROW LEVEL SECURITY.
-- Las funciones de acceso son SECURITY DEFINER con search_path fijo
-- (blindaje contra secuestro de search_path / inyección).
-- ============================================================

-- ---------- Tipos ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'recepcion', 'asistente');
  end if;
end $$;

-- ---------- Tabla: profiles ----------
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

-- ---------- Tabla: audit_log ----------
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

-- ---------- Tabla: role_permissions (catálogo de permisos) ----------
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

-- ---------- Tabla: rate_limits (limitación de tasa server-side) ----------
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

-- ============================================================
-- Funciones auxiliares (SECURITY DEFINER, propiedad de postgres
-- que posee BYPASSRLS → evitan recursión en las políticas).
-- ============================================================

-- Rol del usuario autenticado actual.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select rol from public.profiles where id = auth.uid();
$$;

-- ¿El usuario actual es admin activo?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin' and activo = true
  );
$$;

-- Cantidad de administradores activos (para proteger al último admin).
create or replace function public.count_active_admins()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int from public.profiles where rol = 'admin' and activo = true;
$$;

-- Registro de auditoría (única vía de escritura en audit_log).
create or replace function public.log_audit(
  p_accion     text,
  p_entidad    text default null,
  p_entidad_id text default null,
  p_metadata   jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_log (actor_id, actor_email, accion, entidad, entidad_id, metadata)
  values (
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    p_accion,
    p_entidad,
    p_entidad_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

-- Rate limiting de ventana fija. Devuelve true si la petición está permitida.
create or replace function public.enforce_rate_limit(
  p_bucket         text,
  p_max            integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window timestamptz;
  v_hits   integer;
begin
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start)
    do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  return v_hits <= p_max;
end;
$$;

-- ============================================================
-- Triggers
-- ============================================================

-- updated_at automático en profiles.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Crear perfil automáticamente al crear una usuaria en auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, nombre_completo, cedula, telefono, rol, activo)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre_completo', ''), 'Usuaria'),
    nullif(new.raw_user_meta_data ->> 'cedula', ''),
    nullif(new.raw_user_meta_data ->> 'telefono', ''),
    coalesce((new.raw_user_meta_data ->> 'rol')::public.user_role, 'asistente'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Invariantes de administrador: proteger al último admin y bloquear
-- auto-escalada de rol/estado por usuarias no administradoras.
create or replace function public.guard_admin_invariants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

  -- UPDATE
  -- Bloquear cambios de rol/estado por quien no es admin (anti auto-escalada).
  -- El service_role (usado por route handlers ya autenticados como admin)
  -- está exento de esta comprobación, pero NO de la protección del último admin.
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

  -- Proteger al último admin ante degradación o desactivación.
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
create trigger trg_guard_admin
  before update or delete on public.profiles
  for each row execute function public.guard_admin_invariants();
