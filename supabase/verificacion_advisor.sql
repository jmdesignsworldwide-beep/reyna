-- ============================================================
-- verificacion_advisor.sql
-- Verificación de la postura de seguridad tras aplicar las migraciones.
-- Ejecuta este archivo en el SQL Editor de Supabase (o psql) DESPUÉS de
-- correr 0001 → 0005. Debe reflejar lo que el Security Advisor espera.
-- Cárgalo tú con tus credenciales; no requiere ningún secreto en el repo.
-- ============================================================

-- 1) RLS + FORCE RLS habilitados en TODAS las tablas de 'public'.
--    Esperado: rls = true y force = true en las 6 tablas.
select
  c.relname                    as tabla,
  c.relrowsecurity             as rls,
  c.relforcerowsecurity        as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
-- Tablas esperadas: audit_log, estudios_cardiologicos, pacientes,
-- rate_limits, role_permissions, profiles  → todas con rls=true, force=true.

-- 2) Tablas de 'public' SIN RLS (debe devolver 0 filas).
select c.relname as tabla_sin_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;

-- 3) Políticas por tabla (para revisar que cada tabla tiene sus políticas).
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4) Funciones SECURITY DEFINER y su search_path fijo.
--    Todas las funciones definer deben tener 'search_path' explícito
--    (mitiga secuestro de search_path). Revisa que ninguna quede sin él.
select
  p.proname                                   as funcion,
  p.prosecdef                                 as security_definer,
  coalesce(array_to_string(p.proconfig, ', '), '(sin search_path)') as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
-- Esperado: is_admin, current_user_role, count_active_admins, puede,
-- log_audit, enforce_rate_limit, handle_new_user, guard_admin_invariants
-- → security_definer = true y config con 'search_path=public, pg_temp'.

-- 5) Bucket de Storage 'estudios' debe ser PRIVADO (public = false).
select id, name, public from storage.buckets where id = 'estudios';

-- 6) Políticas RLS sobre storage.objects para el bucket 'estudios'.
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'estudios_obj_%'
order by policyname;

-- ============================================================
-- RECORDATORIOS DE CONFIGURACIÓN (panel de Supabase, no SQL):
--   • Authentication → Providers → Email: "Allow new users to sign up" = OFF.
--   • Auth → URL Configuration: agregar la URL de producción y /auth/callback.
--   • Security Advisor: debe quedar sin advertencias tras lo anterior.
-- ============================================================
