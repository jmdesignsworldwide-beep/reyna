# Seguridad — Sistema Clínico Dra. Reyna Massiel

> Este documento describe **qué protege cada capa** del sistema. El activo más
> sensible son los **datos médicos reales de pacientes** (factores de riesgo,
> alergias, antecedentes, estudios cardiológicos y sus archivos). El estándar
> es defensa en profundidad: la interfaz **oculta**, pero el **servidor decide**,
> y la autoridad final vive en la base de datos (RLS + `private.puede()`), no en
> el navegador.

## Modelo de roles

| Rol | Pacientes | Estudios clínicos | Consultas (historia clínica) | Evaluaciones formales | Agenda | Usuarias | Auditoría |
|-----|-----------|-------------------|------------------------------|-----------------------|--------|----------|-----------|
| **admin** (Dra. Reyna) | ver/crear/editar/borrar | ver/crear/editar/borrar | ver/crear/editar/borrar | ver/crear/editar/borrar + **firmar** | ver/crear/editar/borrar | ver/crear/editar/borrar | ver |
| **recepción** | ver/crear/editar | **sin acceso** | **sin acceso** | **sin acceso** | ver/crear/editar/borrar | — | — |
| **asistente** | ver/editar | ver/crear/editar | ver/crear/editar (sin borrar) | ver/crear/editar (sin borrar, **sin firmar**) | ver | — | — |

> **Firma:** la firma de una evaluación es exclusiva del médico (administradora);
> se valida como `rol === 'admin'` en la Server Action de firmar, no como columna
> de la matriz.

La matriz vive en la tabla `role_permissions` y se resuelve server-side con
`private.puede(recurso, accion)`. El archivo `src/lib/permissions.ts` es un
**espejo solo para gatear la UI**; nunca es la autoridad.

## Capas de defensa

### 1. Row Level Security (RLS) + FORCE
Las **11 tablas** del esquema `public` nacen con `ENABLE` **y** `FORCE ROW LEVEL
SECURITY` (FORCE aplica incluso al dueño de la tabla):

`profiles`, `audit_log`, `role_permissions`, `rate_limits`, `pacientes`,
`estudios_cardiologicos`, `sedes`, `sede_horarios`, `citas`, `consultas`,
`evaluaciones`.

### Inmutabilidad de documentos firmados
Una **evaluación firmada** es un documento legal sellado: el trigger
`guard_evaluacion_sellada` (BEFORE UPDATE/DELETE) bloquea **toda** modificación
o borrado una vez `estado = 'firmada'`, **sin exención de `service_role`** — ni
siquiera un proceso con la llave maestra puede alterarla. Al firmar se calcula un
**hash SHA-256** del contenido canónico + datos de firma y se archiva un **PDF**
en el bucket privado `evaluaciones` (signed URL temporal). El hash permite
verificar que el documento no fue alterado.

- **Negar por defecto:** sin política que lo permita, no hay acceso.
- Las políticas de datos clínicos se atan a la matriz vía `private.puede(...)`.
- `rate_limits` tiene una política **deny-all** para roles normales (solo el
  `service_role` la toca por `BYPASSRLS`).
- `audit_log` **no tiene** políticas de `insert/update/delete` → es de solo
  lectura para admin e inescribible/inalterable desde cualquier cliente.

### 2. Helpers en el esquema `private` (no expuesto por la API)
`private.is_admin()`, `private.current_user_role()` y `private.puede()` son
`SECURITY DEFINER` con `search_path` fijo (`public, pg_temp`). Viven en el
esquema `private`, que **PostgREST no expone**, de modo que:
- las políticas RLS pueden invocarlos sin recursión;
- ni `anon` ni `authenticated` pueden llamarlos por `/rest/v1/rpc`.

Las funciones internas/trigger de `public` (`handle_new_user`,
`guard_admin_invariants`, `touch_updated_at`, `enforce_rate_limit`) tienen su
ejecución **revocada** para `public/anon/authenticated`.

### 3. Aislamiento de datos clínicos
- Recepción **no** puede leer `estudios_cardiologicos` (RLS deniega). Además, la
  ficha del paciente **no ejecuta** la consulta ni genera URLs firmadas para
  roles sin `estudios.ver` (defensa en profundidad en el servidor).
- Los **archivos** de estudios (PDF de ecos, ECG) están en un bucket **privado**
  (`estudios`, `public=false`). Solo se acceden por **URL firmada temporal
  (600 s)** generada server-side, y `storage.objects` tiene políticas RLS que
  exigen `private.puede('estudios', …)`. No hay forma de listar ni adivinar
  URLs de archivos de otros pacientes.

### 4. Invariantes de administrador (trigger `guard_admin_invariants`)
- Ninguna usuaria no-admin puede cambiar su propio `rol` ni `activo` (bloqueado
  aunque manipule el request/API).
- El **último administrador activo** no se puede degradar, desactivar ni
  eliminar.
- El `service_role` (route handlers ya autenticados como admin) está exento del
  chequeo de auto-escalada, pero **nunca** de la protección del último admin.

### 5. Autenticación y sesión
- `getUser()` **revalida el token** contra Supabase en middleware y en el
  servidor (no confía en la cookie a ciegas).
- El middleware protege `/` y `/panel` (exigen sesión) y saca de `/login` a
  quien ya tiene sesión.
- **Auto-registro deshabilitado** en Supabase Auth: solo el admin crea cuentas.
  Como cinturón y tirantes, el trigger `handle_new_user` **jamás** lee el rol
  del metadata: todo perfil nace como `asistente` (mínimo privilegio); el rol
  real lo asigna después el route handler de admin con `service_role`.
- Recuperación de contraseña: el callback (`/auth/callback`) solo permite
  **redirecciones internas** (anti open-redirect) y el formulario **no revela**
  si un correo existe (anti-enumeración de cuentas).

### 6. Autoridad server-side (la UI no decide)
- **Server Actions** (`pacientes`, `estudios`, `citas`): cada una revalida rol
  con `puedeUI`, valida con Zod, aplica rate limit y audita. La RLS vuelve a
  comprobar en la base de datos.
- **Route handlers** (`/api/admin/*`, `/api/cuenta/clave`): protegidos por
  `requerirApi(...roles)` (401/403), validados con Zod, auditados. El cambio de
  contraseña **verifica la clave actual** server-side antes de aplicarla.

### 7. Validación e inyección
- **SQL injection:** todo pasa por el cliente de Supabase (parametrizado); las
  funciones son `SECURITY DEFINER` con `search_path` fijo. No hay concatenación
  de SQL. La búsqueda de pacientes neutraliza los metacaracteres del filtro
  PostgREST (`, ( ) * : \ %`) antes de interpolar el término.
- **Validación de entradas:** Zod en cada acción/handler (longitudes, formatos,
  enums, cédula dominicana, tipos y tamaño de archivo ≤ 15 MB con lista blanca
  de MIME).
- **XSS:** React escapa por defecto; el texto libre (notas, hallazgos, nombres)
  se renderiza como texto, nunca como HTML. El único `dangerouslySetInnerHTML`
  es un script **estático** anti-parpadeo de tema, servido con **nonce** por
  petición (sin datos de usuario).
- **CSRF:** las Server Actions de Next.js validan el origen; los route handlers
  mutantes exigen sesión (cookie `SameSite`) + rol.

### 8. Rate limiting server-side (falla cerrado)
`enforce_rate_limit` (ventana fija en Postgres, compartida entre instancias
serverless) respalda `limitarTasa`. Ante **cualquier** error de infraestructura
**deniega** (fail-closed). Se aplica a crear usuaria, cambiar contraseña, crear
paciente, crear estudio y crear/editar citas.

### 9. Cabeceras de seguridad
- **CSP con nonce por petición** (middleware): en producción `script-src` usa
  `'nonce-…' 'strict-dynamic'` **sin** `'unsafe-inline'`; `frame-ancestors
  'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `upgrade-insecure-requests`.
- Estáticas (`next.config.mjs`): **HSTS** (2 años, includeSubDomains, preload),
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  restrictiva, `Cross-Origin-Opener-Policy: same-origin`, `poweredByHeader` off.

### 10. Secretos
- `SUPABASE_SERVICE_ROLE_KEY` se lee **solo** en `src/lib/supabase/admin.ts`
  (con `import "server-only"`), desde `process.env`, **sin** prefijo
  `NEXT_PUBLIC_`. Nunca llega al bundle del cliente ni al repositorio.
- La `anon key` es la única llave pública; su exposición es segura porque la RLS
  la contiene en el servidor.
- `.env*` está en `.gitignore`; el repo solo trae `.env.example` con
  marcadores. No hay secretos en el historial de commits. Sin `console.log` de
  datos sensibles.

## Auditoría
`audit_log` registra actor, acción, entidad, metadata e IP de las acciones
sensibles. Se escribe **únicamente** vía `service_role` (helper `registrarAuditoria`)
y se lee **solo** por admin. No es escribible ni alterable desde el cliente.

## Riesgo residual conocido
- **Protección de contraseñas filtradas (HIBP)** en Supabase Auth requiere plan
  **Pro**; en plan gratuito queda como único WARN del Security Advisor. Mitigado
  parcialmente por la política de contraseñas (≥10, mayúscula, minúscula y
  número).
- **Rate limit del login:** el inicio de sesión va directo del navegador a
  Supabase Auth (GoTrue), que aplica **su propio** rate limiting anti-fuerza
  bruta (configurable en Auth → Rate Limits). El limitador propio de la app
  cubre los route handlers del servidor.
- `style-src` mantiene `'unsafe-inline'` (requerido por estilos en línea de
  Next/Tailwind). El riesgo es de inyección de estilos, no de scripts, y es bajo.

## Configuración de producción (checklist de despliegue)
- `NEXT_PUBLIC_SITE_URL`, **Site URL** y **Redirect URLs** de Supabase Auth
  deben apuntar al dominio de producción (no `localhost`):
  `https://<dominio>/auth/callback` y `https://<dominio>/**`.
- Confirmar **auto-registro deshabilitado** en Supabase Auth.
- Ejecutar `supabase/verificacion_advisor.sql` y confirmar Security Advisor
  limpio (salvo HIBP en plan gratuito).

## Reporte de vulnerabilidades
Contacto: **jm.nexus.designs@gmail.com**. Por favor reporta de forma responsable
y privada; no abras un issue público con detalles explotables.
