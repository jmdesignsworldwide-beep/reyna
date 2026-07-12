-- ============================================================
-- 0003_permisos_seed.sql — Matriz de permisos por rol
-- ============================================================
-- Recursos previstos para las próximas tandas (pacientes, agenda,
-- finanzas, etc.). Define quién ve/crea/edita/borra cada recurso.
--   admin      → Administradora / Dra. Reyna: todo.
--   recepcion  → Secretaria: pacientes y agenda, SIN finanzas.
--   asistente  → Enfermera: permisos acotados (lectura de apoyo).
-- ============================================================

insert into public.role_permissions (rol, recurso, puede_ver, puede_crear, puede_editar, puede_borrar) values
  -- Administradora / Dra. Reyna
  ('admin', 'pacientes',  true, true, true, true),
  ('admin', 'agenda',     true, true, true, true),
  ('admin', 'finanzas',   true, true, true, true),
  ('admin', 'reportes',   true, true, true, true),
  ('admin', 'usuarios',   true, true, true, true),
  ('admin', 'auditoria',  true, false, false, false),

  -- Recepción / Secretaria (sin finanzas)
  ('recepcion', 'pacientes', true, true, true, false),
  ('recepcion', 'agenda',    true, true, true, true),
  ('recepcion', 'finanzas',  false, false, false, false),
  ('recepcion', 'reportes',  false, false, false, false),
  ('recepcion', 'usuarios',  false, false, false, false),
  ('recepcion', 'auditoria', false, false, false, false),

  -- Asistente / Enfermera (permisos acotados)
  ('asistente', 'pacientes', true, false, true, false),
  ('asistente', 'agenda',    true, false, false, false),
  ('asistente', 'finanzas',  false, false, false, false),
  ('asistente', 'reportes',  false, false, false, false),
  ('asistente', 'usuarios',  false, false, false, false),
  ('asistente', 'auditoria', false, false, false, false)
on conflict (rol, recurso) do update set
  puede_ver    = excluded.puede_ver,
  puede_crear  = excluded.puede_crear,
  puede_editar = excluded.puede_editar,
  puede_borrar = excluded.puede_borrar;
