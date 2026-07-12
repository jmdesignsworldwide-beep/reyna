-- ============================================================
-- 0002_politicas.sql — Políticas RLS
-- ============================================================
-- Principio: negar por defecto. Cada acceso es explícito y mínimo.
-- El service_role (usado solo en el servidor) ignora RLS por diseño;
-- toda operación privilegiada pasa por route handlers con auth de admin.
-- ============================================================

-- ---------- profiles ----------
-- Lectura: cada quien ve su perfil; admin ve todos.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- Inserción: solo admin (el alta normal ocurre vía trigger/servicio).
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert
  to authenticated
  with check (public.is_admin());

-- Actualización: la usuaria puede tocar su propio perfil (nombre/teléfono/cédula);
-- admin puede tocar cualquiera. Los cambios de rol/estado los frena el trigger
-- guard_admin_invariants para quien no sea admin.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Borrado: solo admin (y el trigger protege al último admin).
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete
  to authenticated
  using (public.is_admin());

-- ---------- audit_log ----------
-- Lectura: solo admin. Escritura: NADIE vía cliente (solo función log_audit).
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select
  to authenticated
  using (public.is_admin());
-- (Sin políticas de insert/update/delete → prohibido para todo rol autenticado.)

-- ---------- role_permissions ----------
-- Lectura: cualquier autenticado (para pintar la UI según permisos).
drop policy if exists perm_select on public.role_permissions;
create policy perm_select on public.role_permissions
  for select
  to authenticated
  using (true);

-- Escritura: solo admin.
drop policy if exists perm_write on public.role_permissions;
create policy perm_write on public.role_permissions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- rate_limits ----------
-- Sin políticas → inaccesible para roles autenticados/anónimos.
-- Solo la función enforce_rate_limit (SECURITY DEFINER) y el service_role
-- pueden tocarla. Esto es intencional.

-- ============================================================
-- Permisos de ejecución de funciones
-- ============================================================
-- enforce_rate_limit: solo el servidor (service_role) la ejecuta.
revoke all on function public.enforce_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.enforce_rate_limit(text, integer, integer) to service_role;

-- log_audit e is_admin/current_user_role las usa el cliente autenticado:
grant execute on function public.is_admin()            to authenticated;
grant execute on function public.current_user_role()   to authenticated;
grant execute on function public.log_audit(text, text, text, jsonb) to authenticated;
