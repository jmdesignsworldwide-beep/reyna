-- ============================================================
-- 0013_reportes.sql — Reportes Médicos del paciente
-- ============================================================
-- Documentos que la Dra. Reyna genera para el paciente (resumen de consulta,
-- resultado de estudio, reporte general), exportados a PDF premium y
-- compartibles por WhatsApp. Cada reporte pertenece a un paciente y guarda
-- un SNAPSHOT (contenido jsonb) de los datos usados: el documento queda fijo
-- a su fecha aunque luego se edite la consulta/estudio de origen.
--
-- Fort Knox: RLS + FORCE atadas a role_permissions vía private.puede('reportes').
--   admin      → todo (genera, ve, comparte, borra).
--   asistente  → ver + crear (apoyo clínico), sin editar ni borrar.
--   recepcion  → SIN acceso (no ve el detalle clínico).
-- PDF en bucket privado 'reportes', accesible solo por signed URL temporal.
-- ============================================================

-- ---------- Tipo ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_reporte') then
    create type public.tipo_reporte as enum
      ('resumen_consulta', 'resultado_estudio', 'reporte_general');
  end if;
end $$;

-- ---------- Tabla: reportes ----------
create table if not exists public.reportes (
  id           uuid primary key default gen_random_uuid(),
  paciente_id  uuid not null references public.pacientes (id) on delete cascade,
  tipo         public.tipo_reporte not null,
  titulo       text not null,
  fecha        date not null default current_date,
  consulta_id  uuid references public.consultas (id) on delete set null,
  estudio_id   uuid references public.estudios_cardiologicos (id) on delete set null,
  contenido    jsonb not null default '{}',  -- snapshot de los datos del reporte
  resumen_texto text,                         -- mensaje listo para WhatsApp
  pdf_path     text,                          -- ruta en bucket privado 'reportes'
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.reportes is 'Reportes médicos del paciente (PDF + resumen WhatsApp). Snapshot inmutable de contenido.';
create index if not exists idx_reportes_paciente on public.reportes (paciente_id, fecha desc);
alter table public.reportes enable row level security;
alter table public.reportes force  row level security;

drop trigger if exists trg_reportes_touch on public.reportes;
create trigger trg_reportes_touch
  before update on public.reportes
  for each row execute function public.touch_updated_at();

-- ---------- Permisos ----------
insert into public.role_permissions (rol, recurso, puede_ver, puede_crear, puede_editar, puede_borrar) values
  ('admin',     'reportes', true,  true,  true,  true),
  ('asistente', 'reportes', true,  true,  false, false),
  ('recepcion', 'reportes', false, false, false, false)
on conflict (rol, recurso) do update set
  puede_ver = excluded.puede_ver, puede_crear = excluded.puede_crear,
  puede_editar = excluded.puede_editar, puede_borrar = excluded.puede_borrar;

-- ---------- Políticas RLS ----------
drop policy if exists reportes_select on public.reportes;
create policy reportes_select on public.reportes
  for select to authenticated using (private.puede('reportes', 'ver'));
drop policy if exists reportes_insert on public.reportes;
create policy reportes_insert on public.reportes
  for insert to authenticated with check (private.puede('reportes', 'crear'));
drop policy if exists reportes_update on public.reportes;
create policy reportes_update on public.reportes
  for update to authenticated
  using (private.puede('reportes', 'editar')) with check (private.puede('reportes', 'editar'));
drop policy if exists reportes_delete on public.reportes;
create policy reportes_delete on public.reportes
  for delete to authenticated using (private.puede('reportes', 'borrar'));

-- ---------- Storage: bucket privado ----------
insert into storage.buckets (id, name, public) values ('reportes', 'reportes', false)
on conflict (id) do nothing;

drop policy if exists reportes_obj_select on storage.objects;
create policy reportes_obj_select on storage.objects
  for select to authenticated
  using (bucket_id = 'reportes' and private.puede('reportes', 'ver'));
drop policy if exists reportes_obj_insert on storage.objects;
create policy reportes_obj_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'reportes' and private.puede('reportes', 'crear'));
drop policy if exists reportes_obj_delete on storage.objects;
create policy reportes_obj_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'reportes' and private.puede('reportes', 'borrar'));
