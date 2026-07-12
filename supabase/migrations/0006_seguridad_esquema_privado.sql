-- ============================================================
-- 0006_seguridad_esquema_privado.sql
-- Endurecimiento: Security Advisor limpio
-- ============================================================
-- Mueve los helpers de RLS (SECURITY DEFINER) a un esquema `private`
-- que PostgREST NO expone, de modo que ni anon ni authenticated puedan
-- invocarlos por /rest/v1/rpc, pero las políticas RLS sí los usen.
-- Además: deny-all en rate_limits (elimina el INFO rls_enabled_no_policy)
-- y se retira la ejecución pública de las funciones internas/trigger.
-- ============================================================

create schema if not exists private;
-- USAGE para que las políticas puedan resolver private.* (no expuesto por API).
grant usage on schema private to authenticated, service_role;

-- ---------- Helpers en el esquema privado ----------
create or replace function private.current_user_role()
returns public.user_role language sql stable security definer
set search_path = public, pg_temp as $$
  select rol from public.profiles where id = auth.uid();
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin' and activo = true
  );
$$;

create or replace function private.puede(p_recurso text, p_accion text)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select coalesce((
    select case p_accion
      when 'ver'    then puede_ver
      when 'crear'  then puede_crear
      when 'editar' then puede_editar
      when 'borrar' then puede_borrar
      else false
    end
    from public.role_permissions
    where rol = private.current_user_role() and recurso = p_recurso
  ), false);
$$;

-- Ejecución solo para authenticated/service_role (PostgREST no expone 'private').
revoke all on function private.current_user_role() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.puede(text, text) from public;
grant execute on function private.current_user_role() to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.puede(text, text) to authenticated, service_role;

-- ---------- Trigger que dependía de public.is_admin ----------
create or replace function public.guard_admin_invariants()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    if old.rol = 'admin' and old.activo then
      if (select count(*) from public.profiles
          where rol = 'admin' and activo and id <> old.id) = 0 then
        raise exception 'No se puede eliminar al último administrador activo.'
          using errcode = 'check_violation';
      end if;
    end if;
    return old;
  end if;

  if auth.role() <> 'service_role' then
    if new.rol <> old.rol and not private.is_admin() then
      raise exception 'No autorizada para cambiar el rol.'
        using errcode = 'insufficient_privilege';
    end if;
    if new.activo <> old.activo and not private.is_admin() then
      raise exception 'No autorizada para cambiar el estado de la cuenta.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if old.rol = 'admin' and old.activo
     and (new.rol <> 'admin' or new.activo = false) then
    if (select count(*) from public.profiles
        where rol = 'admin' and activo and id <> old.id) = 0 then
      raise exception 'No se puede degradar ni desactivar al último administrador activo.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- ---------- Recrear políticas usando private.* ----------
-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (private.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or private.is_admin())
  with check (id = auth.uid() or private.is_admin());
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (private.is_admin());

-- audit_log
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select to authenticated
  using (private.is_admin());

-- role_permissions
drop policy if exists perm_write on public.role_permissions;
create policy perm_write on public.role_permissions
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- pacientes
drop policy if exists pacientes_select on public.pacientes;
create policy pacientes_select on public.pacientes
  for select to authenticated using (private.puede('pacientes', 'ver'));
drop policy if exists pacientes_insert on public.pacientes;
create policy pacientes_insert on public.pacientes
  for insert to authenticated with check (private.puede('pacientes', 'crear'));
drop policy if exists pacientes_update on public.pacientes;
create policy pacientes_update on public.pacientes
  for update to authenticated
  using (private.puede('pacientes', 'editar'))
  with check (private.puede('pacientes', 'editar'));
drop policy if exists pacientes_delete on public.pacientes;
create policy pacientes_delete on public.pacientes
  for delete to authenticated using (private.puede('pacientes', 'borrar'));

-- estudios_cardiologicos
drop policy if exists estudios_select on public.estudios_cardiologicos;
create policy estudios_select on public.estudios_cardiologicos
  for select to authenticated using (private.puede('estudios', 'ver'));
drop policy if exists estudios_insert on public.estudios_cardiologicos;
create policy estudios_insert on public.estudios_cardiologicos
  for insert to authenticated with check (private.puede('estudios', 'crear'));
drop policy if exists estudios_update on public.estudios_cardiologicos;
create policy estudios_update on public.estudios_cardiologicos
  for update to authenticated
  using (private.puede('estudios', 'editar'))
  with check (private.puede('estudios', 'editar'));
drop policy if exists estudios_delete on public.estudios_cardiologicos;
create policy estudios_delete on public.estudios_cardiologicos
  for delete to authenticated using (private.puede('estudios', 'borrar'));

-- storage.objects (bucket estudios)
drop policy if exists estudios_obj_select on storage.objects;
create policy estudios_obj_select on storage.objects
  for select to authenticated
  using (bucket_id = 'estudios' and private.puede('estudios', 'ver'));
drop policy if exists estudios_obj_insert on storage.objects;
create policy estudios_obj_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'estudios' and private.puede('estudios', 'crear'));
drop policy if exists estudios_obj_delete on storage.objects;
create policy estudios_obj_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'estudios' and private.puede('estudios', 'borrar'));

-- ---------- Retirar exposición de las funciones public ----------
-- Helpers ahora en private: eliminar las versiones public.
drop function if exists public.is_admin();
drop function if exists public.current_user_role();
drop function if exists public.puede(text, text);
-- Sin uso desde el cliente: eliminar.
drop function if exists public.count_active_admins();
drop function if exists public.log_audit(text, text, text, jsonb);

-- Funciones trigger/servidor que quedan en public: no deben ser invocables por API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_admin_invariants() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
-- enforce_rate_limit ya está restringida a service_role (0002); reforzamos.
revoke all on function public.enforce_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.enforce_rate_limit(text, integer, integer) to service_role;

-- ---------- rate_limits: política deny-all (elimina INFO rls_enabled_no_policy) ----------
-- Deniega todo acceso a roles normales; service_role sigue operando por BYPASSRLS.
drop policy if exists rate_limits_deny on public.rate_limits;
create policy rate_limits_deny on public.rate_limits
  for all to authenticated, anon
  using (false) with check (false);
