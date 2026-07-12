-- ============================================================
-- 0008_agenda.sql — Módulo de Agenda de citas
-- ============================================================
-- Fort Knox: RLS + FORCE en sedes, sede_horarios y citas.
-- citas atadas a role_permissions vía private.puede('agenda', …).
-- Anti-doble-reserva a nivel de base de datos (constraint EXCLUDE).
-- ============================================================

create extension if not exists btree_gist with schema extensions;

-- ---------- Tipos ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_consulta') then
    create type public.tipo_consulta as enum
      ('primera_vez', 'seguimiento', 'ecocardiograma', 'electrocardiograma', 'chequeo_cardiovascular');
  end if;
  if not exists (select 1 from pg_type where typname = 'estado_cita') then
    create type public.estado_cita as enum
      ('agendada', 'confirmada', 'atendida', 'cancelada', 'no_show');
  end if;
end $$;

-- ---------- Tabla: sedes ----------
create table if not exists public.sedes (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  nombre     text not null,
  direccion  text,
  color      text,               -- color de marca para distinguir en el calendario
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.sedes is 'Sedes/consultorios donde la Dra. Reyna atiende.';
alter table public.sedes enable row level security;
alter table public.sedes force  row level security;

-- ---------- Tabla: sede_horarios (disponibilidad por día de semana) ----------
-- dia_semana: 0=domingo … 6=sábado (coincide con Date.getDay() de JS).
create table if not exists public.sede_horarios (
  id          uuid primary key default gen_random_uuid(),
  sede_id     uuid not null references public.sedes (id) on delete cascade,
  dia_semana  smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fin    time not null,
  check (hora_fin > hora_inicio),
  unique (sede_id, dia_semana)
);
comment on table public.sede_horarios is 'Horario de atención por sede y día de la semana.';
alter table public.sede_horarios enable row level security;
alter table public.sede_horarios force  row level security;

-- ---------- Tabla: citas ----------
create table if not exists public.citas (
  id           uuid primary key default gen_random_uuid(),
  paciente_id  uuid not null references public.pacientes (id) on delete cascade,
  sede_id      uuid not null references public.sedes (id) on delete restrict,
  fecha        date not null,
  hora_inicio  time not null,
  hora_fin     time not null,
  tipo         public.tipo_consulta not null,
  estado       public.estado_cita not null default 'agendada',
  motivo       text,
  notas        text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (hora_fin > hora_inicio),
  -- Anti-doble-reserva: no se permiten dos citas NO canceladas que se solapen
  -- en la misma sede y fecha (rango de tiempo compuesto fecha+hora).
  constraint citas_sin_solape exclude using gist (
    sede_id with =,
    tsrange((fecha + hora_inicio), (fecha + hora_fin)) with &&
  ) where (estado <> 'cancelada')
);
comment on table public.citas is 'Citas de la consulta. Anti-doble-reserva por sede/horario a nivel BD.';

create index if not exists idx_citas_fecha on public.citas (fecha);
create index if not exists idx_citas_paciente on public.citas (paciente_id);
create index if not exists idx_citas_sede_fecha on public.citas (sede_id, fecha);
create index if not exists idx_citas_estado on public.citas (estado);

alter table public.citas enable row level security;
alter table public.citas force  row level security;

drop trigger if exists trg_citas_touch on public.citas;
create trigger trg_citas_touch
  before update on public.citas
  for each row execute function public.touch_updated_at();

-- ---------- Políticas RLS ----------
-- sedes: lectura para autenticados (necesaria para agendar/ver); escritura admin.
drop policy if exists sedes_select on public.sedes;
create policy sedes_select on public.sedes
  for select to authenticated using (true);
drop policy if exists sedes_write on public.sedes;
create policy sedes_write on public.sedes
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- sede_horarios: igual que sedes.
drop policy if exists horarios_select on public.sede_horarios;
create policy horarios_select on public.sede_horarios
  for select to authenticated using (true);
drop policy if exists horarios_write on public.sede_horarios;
create policy horarios_write on public.sede_horarios
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- citas: atadas a la matriz (recurso 'agenda').
drop policy if exists citas_select on public.citas;
create policy citas_select on public.citas
  for select to authenticated using (private.puede('agenda', 'ver'));
drop policy if exists citas_insert on public.citas;
create policy citas_insert on public.citas
  for insert to authenticated with check (private.puede('agenda', 'crear'));
drop policy if exists citas_update on public.citas;
create policy citas_update on public.citas
  for update to authenticated
  using (private.puede('agenda', 'editar'))
  with check (private.puede('agenda', 'editar'));
drop policy if exists citas_delete on public.citas;
create policy citas_delete on public.citas
  for delete to authenticated using (private.puede('agenda', 'borrar'));

-- ---------- Seed: sedes + horarios reales ----------
insert into public.sedes (slug, nombre, direccion, color) values
  ('centro-oriental', 'Centro Oriental de Ginecología y Obstetricia', null, '#B14A73'),
  ('centro-medico-real', 'Centro Médico Real', null, '#C25A82')
on conflict (slug) do update set nombre = excluded.nombre, color = excluded.color;

-- Centro Oriental: Lunes a Sábado 9:00am–7:00pm
insert into public.sede_horarios (sede_id, dia_semana, hora_inicio, hora_fin)
select s.id, d.dia, time '09:00', time '19:00'
from public.sedes s
cross join (values (1),(2),(3),(4),(5),(6)) as d(dia)
where s.slug = 'centro-oriental'
on conflict (sede_id, dia_semana) do update
  set hora_inicio = excluded.hora_inicio, hora_fin = excluded.hora_fin;

-- Centro Médico Real: Martes y Jueves 2:30pm–7:00pm
insert into public.sede_horarios (sede_id, dia_semana, hora_inicio, hora_fin)
select s.id, d.dia, time '14:30', time '19:00'
from public.sedes s
cross join (values (2),(4)) as d(dia)
where s.slug = 'centro-medico-real'
on conflict (sede_id, dia_semana) do update
  set hora_inicio = excluded.hora_inicio, hora_fin = excluded.hora_fin;

-- ---------- Permisos del recurso 'agenda' ya sembrados en 0003 ----------
-- admin: todo · recepcion: ver/crear/editar/borrar · asistente: ver.
-- (Reafirmamos por idempotencia.)
insert into public.role_permissions (rol, recurso, puede_ver, puede_crear, puede_editar, puede_borrar) values
  ('admin',     'agenda', true, true, true, true),
  ('recepcion', 'agenda', true, true, true, true),
  ('asistente', 'agenda', true, false, false, false)
on conflict (rol, recurso) do update set
  puede_ver = excluded.puede_ver, puede_crear = excluded.puede_crear,
  puede_editar = excluded.puede_editar, puede_borrar = excluded.puede_borrar;
