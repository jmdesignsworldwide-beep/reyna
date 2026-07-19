-- ============================================================
-- 0011_finanzas.sql — Módulo Financiero + Recibos de pago
-- ============================================================
-- Pagos de pacientes (ingresos), gastos del consultorio y categorías.
-- SIN facturación fiscal DGII: el NCF es un campo manual opcional.
--
-- Fort Knox: RLS + FORCE, atadas a role_permissions vía private.puede().
--   recurso 'pagos'    → admin todo; recepción ver/crear/editar (cobra); asistente nada.
--   recurso 'finanzas' → admin todo; recepción y asistente sin acceso.
-- El panel calcula ingresos = SUM(pagos.monto) y egresos = SUM(gastos.monto):
-- los pagos son la ÚNICA fuente de ingresos (sin doble conteo).
-- ============================================================

-- ---------- Tipos ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'metodo_pago') then
    create type public.metodo_pago as enum ('efectivo', 'transferencia', 'tarjeta');
  end if;
  if not exists (select 1 from pg_type where typname = 'tipo_pago') then
    create type public.tipo_pago as enum
      ('consulta', 'ecocardiograma', 'electrocardiograma', 'chequeo', 'otro');
  end if;
end $$;

-- Secuencia para el número de recibo (REC-000123).
create sequence if not exists public.recibo_seq start 1;

-- ---------- Tabla: categorias_gasto ----------
create table if not exists public.categorias_gasto (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  activo     boolean not null default true,
  orden      smallint not null default 0,
  created_at timestamptz not null default now()
);
comment on table public.categorias_gasto is 'Categorías editables de gastos del consultorio.';
alter table public.categorias_gasto enable row level security;
alter table public.categorias_gasto force  row level security;

-- ---------- Tabla: pagos (ingresos de pacientes) ----------
create table if not exists public.pagos (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid references public.pacientes (id) on delete set null,
  cita_id       uuid references public.citas (id) on delete set null,
  consulta_id   uuid references public.consultas (id) on delete set null,
  recibo_numero integer not null default nextval('public.recibo_seq'),
  fecha         date not null default current_date,
  monto         numeric(12, 2) not null check (monto > 0 and monto < 100000000),
  tipo          public.tipo_pago not null default 'consulta',
  concepto      text,
  metodo_pago   public.metodo_pago not null default 'efectivo',
  ncf           text,   -- opcional, manual, SIN valor fiscal (no DGII)
  notas         text,
  pdf_path      text,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.pagos is 'Pagos de pacientes. Única fuente de ingresos del panel financiero.';
create index if not exists idx_pagos_fecha on public.pagos (fecha desc);
create index if not exists idx_pagos_paciente on public.pagos (paciente_id);
create unique index if not exists idx_pagos_recibo on public.pagos (recibo_numero);
alter table public.pagos enable row level security;
alter table public.pagos force  row level security;

drop trigger if exists trg_pagos_touch on public.pagos;
create trigger trg_pagos_touch
  before update on public.pagos
  for each row execute function public.touch_updated_at();

-- ---------- Tabla: gastos ----------
create table if not exists public.gastos (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null default current_date,
  monto          numeric(12, 2) not null check (monto > 0 and monto < 100000000),
  categoria_id   uuid references public.categorias_gasto (id) on delete set null,
  metodo_pago    public.metodo_pago not null default 'efectivo',
  nota           text,
  comprobante_path text,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.gastos is 'Gastos del consultorio por categoría.';
create index if not exists idx_gastos_fecha on public.gastos (fecha desc);
create index if not exists idx_gastos_categoria on public.gastos (categoria_id);
alter table public.gastos enable row level security;
alter table public.gastos force  row level security;

drop trigger if exists trg_gastos_touch on public.gastos;
create trigger trg_gastos_touch
  before update on public.gastos
  for each row execute function public.touch_updated_at();

-- ---------- Permisos ----------
insert into public.role_permissions (rol, recurso, puede_ver, puede_crear, puede_editar, puede_borrar) values
  ('admin',     'pagos',    true,  true,  true,  true),
  ('recepcion', 'pagos',    true,  true,  true,  false),
  ('asistente', 'pagos',    false, false, false, false),
  ('admin',     'finanzas', true,  true,  true,  true),
  ('recepcion', 'finanzas', false, false, false, false),
  ('asistente', 'finanzas', false, false, false, false)
on conflict (rol, recurso) do update set
  puede_ver = excluded.puede_ver, puede_crear = excluded.puede_crear,
  puede_editar = excluded.puede_editar, puede_borrar = excluded.puede_borrar;

-- ---------- Políticas RLS ----------
-- pagos → recurso 'pagos'
drop policy if exists pagos_select on public.pagos;
create policy pagos_select on public.pagos
  for select to authenticated using (private.puede('pagos', 'ver'));
drop policy if exists pagos_insert on public.pagos;
create policy pagos_insert on public.pagos
  for insert to authenticated with check (private.puede('pagos', 'crear'));
drop policy if exists pagos_update on public.pagos;
create policy pagos_update on public.pagos
  for update to authenticated
  using (private.puede('pagos', 'editar')) with check (private.puede('pagos', 'editar'));
drop policy if exists pagos_delete on public.pagos;
create policy pagos_delete on public.pagos
  for delete to authenticated using (private.puede('pagos', 'borrar'));

-- gastos + categorias_gasto → recurso 'finanzas' (solo admin)
drop policy if exists gastos_select on public.gastos;
create policy gastos_select on public.gastos
  for select to authenticated using (private.puede('finanzas', 'ver'));
drop policy if exists gastos_insert on public.gastos;
create policy gastos_insert on public.gastos
  for insert to authenticated with check (private.puede('finanzas', 'crear'));
drop policy if exists gastos_update on public.gastos;
create policy gastos_update on public.gastos
  for update to authenticated
  using (private.puede('finanzas', 'editar')) with check (private.puede('finanzas', 'editar'));
drop policy if exists gastos_delete on public.gastos;
create policy gastos_delete on public.gastos
  for delete to authenticated using (private.puede('finanzas', 'borrar'));

drop policy if exists categorias_select on public.categorias_gasto;
create policy categorias_select on public.categorias_gasto
  for select to authenticated using (private.puede('finanzas', 'ver'));
drop policy if exists categorias_write on public.categorias_gasto;
create policy categorias_write on public.categorias_gasto
  for all to authenticated
  using (private.puede('finanzas', 'editar')) with check (private.puede('finanzas', 'editar'));

-- ---------- Storage: buckets privados ----------
insert into storage.buckets (id, name, public) values
  ('recibos', 'recibos', false),
  ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

-- recibos → recurso 'pagos'
drop policy if exists recibos_obj_select on storage.objects;
create policy recibos_obj_select on storage.objects
  for select to authenticated
  using (bucket_id = 'recibos' and private.puede('pagos', 'ver'));
drop policy if exists recibos_obj_insert on storage.objects;
create policy recibos_obj_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recibos' and private.puede('pagos', 'crear'));
drop policy if exists recibos_obj_delete on storage.objects;
create policy recibos_obj_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'recibos' and private.puede('pagos', 'borrar'));

-- comprobantes → recurso 'finanzas'
drop policy if exists comprobantes_obj_select on storage.objects;
create policy comprobantes_obj_select on storage.objects
  for select to authenticated
  using (bucket_id = 'comprobantes' and private.puede('finanzas', 'ver'));
drop policy if exists comprobantes_obj_insert on storage.objects;
create policy comprobantes_obj_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprobantes' and private.puede('finanzas', 'crear'));
drop policy if exists comprobantes_obj_delete on storage.objects;
create policy comprobantes_obj_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprobantes' and private.puede('finanzas', 'borrar'));

-- ---------- Seed: categorías de gasto por defecto ----------
insert into public.categorias_gasto (nombre, orden) values
  ('Alquiler', 1), ('Insumos', 2), ('Personal', 3),
  ('Servicios', 4), ('Equipos', 5), ('Otros', 6)
on conflict (nombre) do nothing;
