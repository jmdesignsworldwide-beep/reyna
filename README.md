# Sistema de gestión clínica — Dra. Reyna Massiel

Cardiología · Medicina interna · Ecocardiografía · República Dominicana
Desarrollado por **JM Designs Worldwide**.

Stack: **Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase** (Postgres + Auth + Storage + RLS). Deploy en Vercel.

**Alcance (acotado):** 4 módulos premium — **Pacientes**, **Agenda de citas**, **Historia clínica cardiológica** y **Dashboard**. Sin portal del paciente, panel financiero, nóminas ni IA externa.

---

## Estado — Tanda 1: Cimientos seguros + Diseño base

Base funcional con seguridad Fort Knox horneada desde la línea uno:

- **Autenticación** con 3 roles: `admin` (Administradora / Dra. Reyna), `recepcion` (Secretaria), `asistente` (Enfermera).
- **Gestión de usuarias**: alta con rol asignado, cambio de rol, activar/desactivar, eliminar. Protección del **último administrador** (no se puede degradar, desactivar ni eliminar al único admin activo) garantizada por trigger en la base de datos.
- **Contraseñas**: recuperación por correo y cambio de contraseña para todos los roles (verificando la contraseña actual server-side).
- **Auditoría**: bitácora inmutable `audit_log` (quién, qué, cuándo, IP).
- **ADN visual**: login cinemático, sidebar colapsable, fondo aurora, modo claro/oscuro y sistema de tarjetas — todo con plomería real de Supabase.

---

## Estado — Tanda 2: Módulo de pacientes (cardiología a fondo)

- **Expediente cardiológico completo**: identificación y demográficos, contacto, seguro (ARS + plan), contacto de emergencia, **antropometría con IMC calculado**, **factores de riesgo cardiovascular** (HTA, diabetes, dislipidemia, tabaquismo, sedentarismo, obesidad derivada del IMC, antecedentes familiares, ERC), antecedentes personales, **medicación estructurada** y alergias.
- **Alertas visibles en la ficha**: alergias en **rojo** (alerta crítica) y factores de riesgo en **ámbar**, con un **perfil de riesgo cardiovascular** resumido.
- **Estudios cardiológicos** (ecocardiograma, ECG, prueba de esfuerzo, Holter de ritmo/presión): historial por paciente ordenado por fecha, con **carga de archivo** (PDF/imagen) en un **bucket privado de Supabase Storage** servido mediante *signed URLs*.
- **Búsqueda** por nombre, apellido o cédula (validación de cédula dominicana).
- Permisos por rol atados a la matriz `role_permissions` vía RLS (función `puede()`). Todas las acciones pasan por **Server Actions** con verificación de rol, rate limiting y auditoría. Archivar/reactivar en lugar de borrado destructivo.

## Estado — Tanda 3: Agenda de citas

- **Dos sedes con horarios reales**: Centro Oriental de Ginecología y Obstetricia (Lun–Sáb 9:00–19:00) y Centro Médico Real (Mar y Jue 14:30–19:00), sembrados en base de datos.
- **Anti-doble-reserva** a nivel de base de datos (constraint `EXCLUDE` por sede + rango de tiempo) y validación server-side contra el horario de la sede y solapes de la doctora entre sedes.
- **Tipos de consulta**: primera vez, seguimiento, ecocardiograma, electrocardiograma, chequeo cardiovascular. **Estados**: agendada, confirmada, atendida, cancelada, no asistió.
- **Vistas** día / semana / mes / próximas, con **filtros** (sede, estado) y **búsqueda por paciente**.
- **Conexión con la ficha**: botón “Agendar cita” desde el expediente del paciente.
- RLS+FORCE en `sedes`, `sede_horarios` y `citas`; permisos por rol vía la matriz (`agenda`); todo auditado. Cero botones muertos.

## Seguridad (Fort Knox)

- **RLS + FORCE ROW LEVEL SECURITY** en todas las tablas; políticas que niegan por defecto.
- **`service_role` solo en el servidor**: se lee de `SUPABASE_SERVICE_ROLE_KEY` (sin prefijo `NEXT_PUBLIC_`) y el import `server-only` rompe el build si se filtra al cliente. Nunca en el repo (`.env.local` está en `.gitignore`).
- **Verificación de rol server-side** en cada página y route handler (`requerirRol`, `requerirApi`).
- **Anti-inyección SQL**: acceso vía cliente parametrizado de Supabase; funciones SQL con `search_path` fijo.
- **Security headers**: HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` y **CSP con nonce por petición** (sin `unsafe-inline` en scripts).
- **Rate limiting server-side** respaldado en Postgres (compartido entre instancias, falla cerrado).
- **Anti-enumeración de cuentas** en la recuperación de contraseña.
- **Contraseñas robustas**: mínimo 10 caracteres con mayúscula, minúscula y número.
- **Dependencias limpias**: `npm audit` sin vulnerabilidades (Next.js 15 + `overrides` de `postcss`).

Tras aplicar las migraciones, ejecuta [`supabase/verificacion_advisor.sql`](./supabase/verificacion_advisor.sql) para confirmar RLS+FORCE, políticas, `search_path` de funciones y el bucket privado de Storage.

---

## Puesta en marcha

### 1. Variables de entorno

```bash
cp .env.example .env.local
```

Rellena con los valores de tu proyecto Supabase (**Settings → API**):

| Variable | Dónde | Notas |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor | Público |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente y servidor | Público (RLS lo contiene) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** | ⚠️ Secreto. Nunca en el cliente ni en el repo |
| `NEXT_PUBLIC_SITE_URL` | Enlaces de correo | Ej. `https://tu-dominio.vercel.app` |

### 2. Base de datos

Aplica las migraciones y crea la primera administradora siguiendo
[`supabase/README.md`](./supabase/README.md).

### 3. Desarrollo

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

### 4. Comprobaciones

```bash
npm run typecheck   # Tipos
npm run lint        # ESLint
npm run build       # Build de producción
```

---

## Estructura

```
src/
  app/
    login/                 Pantalla de bienvenida cinemática
    panel/                 Área protegida (layout con sidebar + aurora)
      page.tsx             Inicio con datos reales
      usuarios/            Gestión de usuarias (admin)
      auditoria/           Bitácora (admin)
      cuenta/              Cambio / recuperación de contraseña (todos)
    api/
      admin/usuarias/      Alta, cambio de rol/estado, borrado (admin)
      cuenta/clave/        Cambio de contraseña (verifica la actual)
    auth/callback/         Intercambio de código de recuperación
  components/              UI de marca (aurora, tarjetas, sidebar, tema…)
  lib/                     Clientes Supabase, auth, permisos, auditoría, rate limit
  types/                   Tipos de la base de datos
supabase/migrations/       Esquema + RLS + permisos
middleware.ts              Sesión + CSP con nonce + protección de rutas
```

---

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura las mismas variables de entorno (la `service_role` como *Environment Variable* estándar, **no** expuesta).
3. Ajusta `NEXT_PUBLIC_SITE_URL` al dominio de producción y añádelo en Supabase
   → **Authentication → URL Configuration → Redirect URLs** (incluye `/auth/callback`).
