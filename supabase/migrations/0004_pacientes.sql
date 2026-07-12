-- ============================================================
-- 0004_pacientes.sql — Módulo de pacientes
-- ============================================================
-- RLS atada a la matriz role_permissions vía la función public.puede().
-- admin: todo · recepcion: crear/editar · asistente: ver/editar · borrar: admin.
-- ============================================================

-- ---------- Tipo: sexo ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sexo_paciente') then
    create type public.sexo_paciente as enum ('femenino', 'masculino');
  end if;
end $$;

-- ---------- Helper: ¿el rol actual puede <accion> sobre <recurso>? ----------
-- Fuente de autoridad: la tabla role_permissions (matriz por rol).
create or replace function public.puede(p_recurso text, p_accion text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
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

-- ---------- Tabla: pacientes ----------
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
  ars                     text,           -- Aseguradora (ARS) en RD
  numero_afiliado         text,
  tipo_sangre             text,
  alergias                text,
  antecedentes            text,           -- Antecedentes clínicos / cardiológicos
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

-- updated_at automático (reutiliza touch_updated_at de 0001).
drop trigger if exists trg_pacientes_touch on public.pacientes;
create trigger trg_pacientes_touch
  before update on public.pacientes
  for each row execute function public.touch_updated_at();

-- ---------- Políticas RLS (atadas a la matriz de permisos) ----------
drop policy if exists pacientes_select on public.pacientes;
create policy pacientes_select on public.pacientes
  for select to authenticated
  using (public.puede('pacientes', 'ver'));

drop policy if exists pacientes_insert on public.pacientes;
create policy pacientes_insert on public.pacientes
  for insert to authenticated
  with check (public.puede('pacientes', 'crear'));

drop policy if exists pacientes_update on public.pacientes;
create policy pacientes_update on public.pacientes
  for update to authenticated
  using (public.puede('pacientes', 'editar'))
  with check (public.puede('pacientes', 'editar'));

drop policy if exists pacientes_delete on public.pacientes;
create policy pacientes_delete on public.pacientes
  for delete to authenticated
  using (public.puede('pacientes', 'borrar'));
