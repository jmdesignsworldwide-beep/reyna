-- ============================================================
-- 0005_pacientes_cardiologia.sql
-- Expansión cardiológica de pacientes + estudios_cardiologicos + Storage
-- ============================================================
-- Mantiene Fort Knox: RLS + FORCE RLS en ambas tablas, atadas a
-- role_permissions vía public.puede(). Storage privado con políticas RLS.
-- ============================================================

-- ---------- Tipos nuevos ----------
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

-- ---------- Expansión de la tabla pacientes ----------
-- Demográficos
alter table public.pacientes
  add column if not exists estado_civil public.estado_civil,
  add column if not exists ocupacion text;

-- Contacto
alter table public.pacientes
  add column if not exists telefono_secundario text,
  add column if not exists ciudad_sector text;

-- Seguro
alter table public.pacientes
  add column if not exists tipo_plan text;

-- Contacto de emergencia
alter table public.pacientes
  add column if not exists contacto_emergencia_parentesco text;

-- Antropometría (IMC calculado como columna generada)
alter table public.pacientes
  add column if not exists peso numeric(5, 2),   -- kg
  add column if not exists talla numeric(5, 2),  -- cm
  add column if not exists circunferencia_abdominal numeric(5, 2); -- cm

alter table public.pacientes
  add column if not exists imc numeric
  generated always as (
    case
      when peso is not null and talla is not null and talla > 0
      then round((peso / ((talla / 100.0) ^ 2))::numeric, 1)
      else null
    end
  ) stored;

-- Factores de riesgo cardiovascular
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

-- Antecedentes personales (renombra el genérico y agrega los específicos)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pacientes'
      and column_name = 'antecedentes'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pacientes'
      and column_name = 'antecedentes_patologicos'
  ) then
    alter table public.pacientes rename column antecedentes to antecedentes_patologicos;
  end if;
end $$;

alter table public.pacientes
  add column if not exists antecedentes_patologicos text,
  add column if not exists antecedentes_quirurgicos text,
  add column if not exists antecedentes_cardiovasculares text;

-- Medicación actual: estructura como JSONB (lista de {medicamento, dosis, frecuencia})
alter table public.pacientes
  add column if not exists medicacion jsonb not null default '[]'::jsonb;

-- Otros
alter table public.pacientes
  add column if not exists referido_por text;

-- ---------- Tabla: estudios_cardiologicos (1 paciente → N estudios) ----------
create table if not exists public.estudios_cardiologicos (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes (id) on delete cascade,
  tipo           public.tipo_estudio not null,
  fecha_estudio  date not null,
  hallazgos      text,
  conclusion     text,
  archivo_path   text,   -- ruta en el bucket privado 'estudios' de Storage
  archivo_nombre text,   -- nombre original del archivo
  realizado_por  text,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);

comment on table public.estudios_cardiologicos is
  'Historial de estudios cardiológicos por paciente (ecocardiograma, ECG, Holter, etc.).';

create index if not exists idx_estudios_paciente on public.estudios_cardiologicos (paciente_id, fecha_estudio desc);

alter table public.estudios_cardiologicos enable row level security;
alter table public.estudios_cardiologicos force  row level security;

-- ---------- Permisos del recurso 'estudios' ----------
insert into public.role_permissions (rol, recurso, puede_ver, puede_crear, puede_editar, puede_borrar) values
  ('admin',     'estudios', true,  true,  true,  true),
  ('recepcion', 'estudios', true,  false, false, false),
  ('asistente', 'estudios', true,  true,  true,  false)
on conflict (rol, recurso) do update set
  puede_ver = excluded.puede_ver, puede_crear = excluded.puede_crear,
  puede_editar = excluded.puede_editar, puede_borrar = excluded.puede_borrar;

-- ---------- Políticas RLS de estudios_cardiologicos ----------
drop policy if exists estudios_select on public.estudios_cardiologicos;
create policy estudios_select on public.estudios_cardiologicos
  for select to authenticated
  using (public.puede('estudios', 'ver'));

drop policy if exists estudios_insert on public.estudios_cardiologicos;
create policy estudios_insert on public.estudios_cardiologicos
  for insert to authenticated
  with check (public.puede('estudios', 'crear'));

drop policy if exists estudios_update on public.estudios_cardiologicos;
create policy estudios_update on public.estudios_cardiologicos
  for update to authenticated
  using (public.puede('estudios', 'editar'))
  with check (public.puede('estudios', 'editar'));

drop policy if exists estudios_delete on public.estudios_cardiologicos;
create policy estudios_delete on public.estudios_cardiologicos
  for delete to authenticated
  using (public.puede('estudios', 'borrar'));

-- ---------- Storage: bucket privado 'estudios' ----------
insert into storage.buckets (id, name, public)
values ('estudios', 'estudios', false)
on conflict (id) do nothing;

-- Políticas sobre storage.objects (RLS ya habilitado por Supabase).
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
