-- ============================================================
-- 0007_recepcion_sin_estudios.sql
-- Ajuste de permisos: Recepción NO puede ver estudios cardiológicos.
-- Los ecos/ECG/hallazgos son data clínica sensible → solo admin y asistente.
-- Recepción se queda con pacientes (ver/crear/editar) y agenda.
-- ============================================================

update public.role_permissions
set puede_ver = false, puede_crear = false, puede_editar = false, puede_borrar = false
where rol = 'recepcion' and recurso = 'estudios';
