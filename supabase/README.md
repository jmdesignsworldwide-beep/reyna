# Base de datos — Supabase

Migraciones para el sistema clínico de la Dra. Reyna Massiel.
Se aplican en orden. Todas las tablas nacen con **RLS + FORCE ROW LEVEL SECURITY**.

## Orden de aplicación

1. `0001_esquema.sql` — Tipos, tablas (`profiles`, `audit_log`, `role_permissions`, `rate_limits`), funciones y triggers.
2. `0002_politicas.sql` — Políticas RLS (negar por defecto).
3. `0003_permisos_seed.sql` — Matriz de permisos por rol.

## Cómo aplicarlas

**Opción A — CLI de Supabase (recomendada):**

```bash
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

**Opción B — SQL Editor del panel de Supabase:**
Pega y ejecuta el contenido de cada archivo, en orden.

## Crear la primera administradora (bootstrap)

El sistema exige un admin para crear cuentas, así que la primera se siembra a mano:

1. En el panel de Supabase → **Authentication → Users → Add user**, crea la cuenta
   de la Dra. Reyna con su correo y una contraseña temporal (marca *Auto Confirm*).
2. En el **SQL Editor**, promuévela a administradora:

```sql
update public.profiles
set rol = 'admin', nombre_completo = 'Dra. Reyna Massiel', activo = true
where id = (select id from auth.users where email = 'CORREO_DE_LA_DOCTORA');
```

A partir de ahí, la Dra. Reyna crea el resto de cuentas desde el panel
(**Usuarias → Nueva usuaria**) con el rol que corresponda.

## Ajuste de seguridad obligatorio en Auth

En el panel de Supabase → **Authentication → Sign In / Providers → Email**,
**deshabilita el registro público** (*Allow new users to sign up = OFF*).
Solo las administradoras crean cuentas desde el sistema. Como defensa en
profundidad, el trigger `handle_new_user` ya crea cualquier perfil como
`asistente` (mínimo privilegio) y nunca toma el rol del metadata, de modo que
un eventual auto-registro no podría escalar a administradora.

## Verificación de seguridad

Tras aplicar las migraciones, confirma que el **Security Advisor** de Supabase
está limpio. Todas las tablas deben mostrar RLS habilitado y forzado:

```sql
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r';
```

Las cuatro tablas deben devolver `relrowsecurity = true` y `relforcerowsecurity = true`.
