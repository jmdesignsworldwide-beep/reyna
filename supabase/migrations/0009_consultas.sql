-- ============================================================
-- 0009_consultas.sql — Historia Clínica Cardiológica (consultas)
-- ============================================================
-- Registro de consultas de seguimiento por paciente: signos vitales,
-- exploración, impresión diagnóstica (varios dx en JSONB), plan/conducta,
-- prescripción (JSONB, mismo patrón que pacientes.medicacion), evolución.
--
-- Fort Knox: RLS + FORCE, atada a role_permissions vía private.puede('consultas').
--   admin      → ver/crear/editar/borrar (Dra. Reyna).
--   asistente  → ver/crear/editar (registra signos vitales), SIN borrar.
--   recepcion  → SIN acceso al detalle clínico (deny total).
-- ============================================================

-- ---------- Tipo ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_consulta_clinica') then
    create type public.tipo_consulta_clinica as enum
      ('primera_vez', 'seguimiento', 'control', 'post_estudio');
  end if;
end $$;

-- ---------- Tabla: consultas ----------
create table if not exists public.consultas (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid not null references public.pacientes (id) on delete cascade,
  -- Cita de agenda de la que nace la consulta (opcional; walk-in => null).
  cita_id       uuid references public.citas (id) on delete set null,
  fecha         date not null default current_date,
  tipo          public.tipo_consulta_clinica not null default 'seguimiento',
  motivo        text,

  -- Signos vitales
  ta_sistolica          smallint check (ta_sistolica is null or ta_sistolica between 40 and 320),
  ta_diastolica         smallint check (ta_diastolica is null or ta_diastolica between 20 and 200),
  frecuencia_cardiaca   smallint check (frecuencia_cardiaca is null or frecuencia_cardiaca between 20 and 300),
  frecuencia_respiratoria smallint check (frecuencia_respiratoria is null or frecuencia_respiratoria between 4 and 80),
  spo2                  smallint check (spo2 is null or spo2 between 40 and 100),
  temperatura           numeric(4, 1) check (temperatura is null or temperatura between 30 and 45),
  peso                  numeric(5, 2) check (peso is null or peso between 0 and 500),
  talla                 numeric(5, 2) check (talla is null or talla between 0 and 260),
  imc numeric generated always as (
    case
      when peso is not null and talla is not null and talla > 0
      then round((peso / ((talla / 100.0) ^ 2))::numeric, 1)
      else null
    end
  ) stored,

  exploracion_fisica    text,
  -- Impresión diagnóstica: lista de {diagnostico, cie10}.
  diagnosticos          jsonb not null default '[]'::jsonb,
  plan_conducta         text,
  -- Prescripción / plan terapéutico: lista de {medicamento, dosis, frecuencia, duracion}.
  prescripcion          jsonb not null default '[]'::jsonb,
  proxima_reevaluacion  text,
  notas_evolucion       text,

  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.consultas is
  'Historia clínica: consultas de seguimiento por paciente (signos vitales, dx, plan, evolución).';

create index if not exists idx_consultas_paciente on public.consultas (paciente_id, fecha desc);
create index if not exists idx_consultas_cita on public.consultas (cita_id);

alter table public.consultas enable row level security;
alter table public.consultas force  row level security;

drop trigger if exists trg_consultas_touch on public.consultas;
create trigger trg_consultas_touch
  before update on public.consultas
  for each row execute function public.touch_updated_at();

-- ---------- Permisos del recurso 'consultas' ----------
insert into public.role_permissions (rol, recurso, puede_ver, puede_crear, puede_editar, puede_borrar) values
  ('admin',     'consultas', true,  true,  true,  true),
  -- Asistente/enfermera: registra signos vitales y ve; no borra.
  ('asistente', 'consultas', true,  true,  true,  false),
  -- Recepción: sin acceso al detalle clínico de consultas.
  ('recepcion', 'consultas', false, false, false, false)
on conflict (rol, recurso) do update set
  puede_ver = excluded.puede_ver, puede_crear = excluded.puede_crear,
  puede_editar = excluded.puede_editar, puede_borrar = excluded.puede_borrar;

-- ---------- Políticas RLS (atadas a la matriz vía private.puede) ----------
drop policy if exists consultas_select on public.consultas;
create policy consultas_select on public.consultas
  for select to authenticated using (private.puede('consultas', 'ver'));

drop policy if exists consultas_insert on public.consultas;
create policy consultas_insert on public.consultas
  for insert to authenticated with check (private.puede('consultas', 'crear'));

drop policy if exists consultas_update on public.consultas;
create policy consultas_update on public.consultas
  for update to authenticated
  using (private.puede('consultas', 'editar'))
  with check (private.puede('consultas', 'editar'));

drop policy if exists consultas_delete on public.consultas;
create policy consultas_delete on public.consultas
  for delete to authenticated using (private.puede('consultas', 'borrar'));
