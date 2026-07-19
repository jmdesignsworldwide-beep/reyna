-- ============================================================
-- 0010_evaluaciones.sql — Evaluación Clínica Formal con firma
-- ============================================================
-- Documento formal de valoración cardiológica por paciente, con
-- consentimiento y firma digital. Una vez firmado se sella e inmutable
-- (trigger a nivel BD bloquea UPDATE/DELETE, sin exención de service_role).
--
-- Fort Knox: RLS + FORCE, atada a role_permissions vía private.puede('evaluaciones').
--   admin      → ver/crear/editar/borrar (+ firmar: se valida en la acción).
--   asistente  → ver/crear/editar (prepara el borrador), SIN borrar ni firmar.
--   recepcion  → SIN acceso al detalle clínico.
-- PDF sellado en bucket privado 'evaluaciones' (signed URL temporal).
-- ============================================================

-- ---------- Tipos ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_evaluacion') then
    create type public.estado_evaluacion as enum ('borrador', 'firmada');
  end if;
  if not exists (select 1 from pg_type where typname = 'riesgo_cv') then
    create type public.riesgo_cv as enum ('bajo', 'moderado', 'alto', 'muy_alto');
  end if;
end $$;

-- ---------- Tabla: evaluaciones ----------
create table if not exists public.evaluaciones (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid not null references public.pacientes (id) on delete cascade,
  fecha         date not null default current_date,
  estado        public.estado_evaluacion not null default 'borrador',

  motivo                text,
  -- Antecedentes copiados de la ficha, editables para esta evaluación.
  antecedentes          text,
  antecedentes_familiares text,
  factores_riesgo       text,

  -- Signos vitales y antropometría
  ta_sistolica          smallint check (ta_sistolica is null or ta_sistolica between 40 and 320),
  ta_diastolica         smallint check (ta_diastolica is null or ta_diastolica between 20 and 200),
  frecuencia_cardiaca   smallint check (frecuencia_cardiaca is null or frecuencia_cardiaca between 20 and 300),
  peso                  numeric(5, 2) check (peso is null or peso between 0 and 500),
  talla                 numeric(5, 2) check (talla is null or talla between 0 and 260),
  imc numeric generated always as (
    case when peso is not null and talla is not null and talla > 0
      then round((peso / ((talla / 100.0) ^ 2))::numeric, 1) else null end
  ) stored,

  -- Exploración cardiovascular estructurada
  ex_inspeccion         text,
  ex_auscultacion       text,
  ex_ruidos_cardiacos   text,
  ex_soplos             text,
  ex_pulsos             text,
  ex_edemas             text,
  ex_ingurgitacion      text,
  ex_otros              text,

  -- Estudios revisados (lista de {id, tipo, fecha}).
  estudios_revisados    jsonb not null default '[]'::jsonb,

  impresion_diagnostica text,
  recomendaciones       text,
  riesgo_cv             public.riesgo_cv,

  -- Consentimiento
  consentimiento_texto  text,
  paciente_acepto       boolean not null default false,
  paciente_nombre_firma text,

  -- Firma / sellado
  firmada_por           uuid references auth.users (id) on delete set null,
  firmada_en            timestamptz,
  firma_medico_nombre   text,
  hash_integridad       text,
  pdf_path              text,

  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.evaluaciones is
  'Evaluación cardiológica formal con consentimiento y firma. Inmutable tras firmar.';

create index if not exists idx_evaluaciones_paciente on public.evaluaciones (paciente_id, fecha desc);

alter table public.evaluaciones enable row level security;
alter table public.evaluaciones force  row level security;

drop trigger if exists trg_evaluaciones_touch on public.evaluaciones;
create trigger trg_evaluaciones_touch
  before update on public.evaluaciones
  for each row execute function public.touch_updated_at();

-- ---------- Sellado inmutable ----------
-- Una vez firmada, la evaluación no se puede modificar ni eliminar POR NADIE
-- (tampoco el service_role): garantía de integridad del documento legal.
create or replace function public.guard_evaluacion_sellada()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.estado = 'firmada' then
      raise exception 'Una evaluación firmada es inmutable: no se puede eliminar.'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;
  -- UPDATE
  if old.estado = 'firmada' then
    raise exception 'Una evaluación firmada es inmutable: no se puede modificar.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_evaluacion_sellada() from public, anon, authenticated;

drop trigger if exists trg_guard_evaluacion on public.evaluaciones;
create trigger trg_guard_evaluacion
  before update or delete on public.evaluaciones
  for each row execute function public.guard_evaluacion_sellada();

-- ---------- Permisos del recurso 'evaluaciones' ----------
insert into public.role_permissions (rol, recurso, puede_ver, puede_crear, puede_editar, puede_borrar) values
  ('admin',     'evaluaciones', true,  true,  true,  true),
  ('asistente', 'evaluaciones', true,  true,  true,  false),
  ('recepcion', 'evaluaciones', false, false, false, false)
on conflict (rol, recurso) do update set
  puede_ver = excluded.puede_ver, puede_crear = excluded.puede_crear,
  puede_editar = excluded.puede_editar, puede_borrar = excluded.puede_borrar;

-- ---------- Políticas RLS ----------
drop policy if exists evaluaciones_select on public.evaluaciones;
create policy evaluaciones_select on public.evaluaciones
  for select to authenticated using (private.puede('evaluaciones', 'ver'));
drop policy if exists evaluaciones_insert on public.evaluaciones;
create policy evaluaciones_insert on public.evaluaciones
  for insert to authenticated with check (private.puede('evaluaciones', 'crear'));
drop policy if exists evaluaciones_update on public.evaluaciones;
create policy evaluaciones_update on public.evaluaciones
  for update to authenticated
  using (private.puede('evaluaciones', 'editar'))
  with check (private.puede('evaluaciones', 'editar'));
drop policy if exists evaluaciones_delete on public.evaluaciones;
create policy evaluaciones_delete on public.evaluaciones
  for delete to authenticated using (private.puede('evaluaciones', 'borrar'));

-- ---------- Storage: bucket privado 'evaluaciones' ----------
insert into storage.buckets (id, name, public)
values ('evaluaciones', 'evaluaciones', false)
on conflict (id) do nothing;

drop policy if exists eval_obj_select on storage.objects;
create policy eval_obj_select on storage.objects
  for select to authenticated
  using (bucket_id = 'evaluaciones' and private.puede('evaluaciones', 'ver'));
drop policy if exists eval_obj_insert on storage.objects;
create policy eval_obj_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evaluaciones' and private.puede('evaluaciones', 'crear'));
drop policy if exists eval_obj_delete on storage.objects;
create policy eval_obj_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'evaluaciones' and private.puede('evaluaciones', 'borrar'));
