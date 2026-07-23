import type { UserRole } from "@/types/database";

/**
 * Metadatos de roles para la interfaz. La autoridad real vive en la base
 * de datos (RLS + role_permissions); esto es solo presentación.
 */
export const ETIQUETAS_ROL: Record<UserRole, string> = {
  admin: "Administradora",
  recepcion: "Recepción",
  asistente: "Asistente",
};

export const DESCRIPCION_ROL: Record<UserRole, string> = {
  admin: "Acceso total: pacientes, agenda, historia clínica, dashboard y usuarias.",
  recepcion: "Pacientes y agenda. Consulta de estudios.",
  asistente: "Apoyo clínico: pacientes y estudios cardiológicos.",
};

export const ROLES: UserRole[] = ["admin", "recepcion", "asistente"];

export type Accion = "ver" | "crear" | "editar" | "borrar";

/**
 * Espejo de la matriz `role_permissions` de la base de datos, para gatear la
 * UI. La autoridad real es la RLS server-side (función `puede`); esto solo
 * evita mostrar controles que el servidor rechazaría.
 */
const MATRIZ: Record<UserRole, Record<string, Accion[]>> = {
  admin: {
    pacientes: ["ver", "crear", "editar", "borrar"],
    estudios: ["ver", "crear", "editar", "borrar"],
    consultas: ["ver", "crear", "editar", "borrar"],
    evaluaciones: ["ver", "crear", "editar", "borrar"],
    reportes: ["ver", "crear", "editar", "borrar"],
    agenda: ["ver", "crear", "editar", "borrar"],
    pagos: ["ver", "crear", "editar", "borrar"],
    finanzas: ["ver", "crear", "editar", "borrar"],
    usuarios: ["ver", "crear", "editar", "borrar"],
    auditoria: ["ver"],
  },
  recepcion: {
    pacientes: ["ver", "crear", "editar"],
    // Sin acceso a estudios, consultas ni evaluaciones (data clínica sensible):
    // solo pacientes y agenda.
    agenda: ["ver", "crear", "editar", "borrar"],
    // Puede cobrar (registrar pagos) pero NO ve el panel gerencial ni los gastos.
    pagos: ["ver", "crear", "editar"],
  },
  asistente: {
    pacientes: ["ver", "editar"],
    estudios: ["ver", "crear", "editar"],
    // Registra signos vitales y ve la historia clínica; no borra consultas.
    consultas: ["ver", "crear", "editar"],
    // Prepara el borrador de la evaluación; la firma es solo del médico.
    evaluaciones: ["ver", "crear", "editar"],
    // Puede generar y ver reportes del paciente; no editar ni borrar.
    reportes: ["ver", "crear"],
    agenda: ["ver"],
    // Sin acceso financiero.
  },
};

/** ¿El rol puede realizar la acción sobre el recurso? (solo para gatear UI). */
export function puedeUI(rol: UserRole, recurso: string, accion: Accion): boolean {
  return MATRIZ[rol]?.[recurso]?.includes(accion) ?? false;
}

export type SeccionNav = "clinica" | "negocio" | "config";

export interface ItemNavegacion {
  href: string;
  etiqueta: string;
  recurso: string;
  /** Sección del menú donde se agrupa el ítem. */
  seccion: SeccionNav;
  /** Roles que ven el ítem en el menú (control fino se refuerza server-side). */
  roles: UserRole[];
  icono: string;
}

/** Encabezados visibles de cada sección del menú (en orden). */
export const SECCIONES_NAV: { clave: SeccionNav; etiqueta: string }[] = [
  { clave: "clinica", etiqueta: "Clínica" },
  { clave: "negocio", etiqueta: "Negocio" },
  { clave: "config", etiqueta: "Configuración" },
];

/**
 * Navegación del panel, agrupada por sección. `roles` decide visibilidad en el
 * sidebar; cada página además revalida con requerirRol()/puede() en el servidor.
 * Las vistas clínicas globales son solo para roles con acceso clínico
 * (admin y asistente): recepción NO ve data clínica.
 */
export const NAVEGACION: ItemNavegacion[] = [
  // ---- Clínica ----
  {
    href: "/panel",
    etiqueta: "Dashboard",
    recurso: "dashboard",
    seccion: "clinica",
    roles: ["admin", "recepcion", "asistente"],
    icono: "inicio",
  },
  {
    href: "/panel/pacientes",
    etiqueta: "Pacientes",
    recurso: "pacientes",
    seccion: "clinica",
    roles: ["admin", "recepcion", "asistente"],
    icono: "pacientes",
  },
  {
    href: "/panel/agenda",
    etiqueta: "Agenda",
    recurso: "agenda",
    seccion: "clinica",
    roles: ["admin", "recepcion", "asistente"],
    icono: "agenda",
  },
  {
    href: "/panel/consultas",
    etiqueta: "Consultas",
    recurso: "consultas",
    seccion: "clinica",
    roles: ["admin", "asistente"],
    icono: "consultas",
  },
  {
    href: "/panel/evaluaciones",
    etiqueta: "Evaluaciones",
    recurso: "evaluaciones",
    seccion: "clinica",
    roles: ["admin", "asistente"],
    icono: "evaluaciones",
  },
  {
    href: "/panel/estudios",
    etiqueta: "Estudios",
    recurso: "estudios",
    seccion: "clinica",
    roles: ["admin", "asistente"],
    icono: "estudios",
  },
  {
    href: "/panel/reportes",
    etiqueta: "Reportes",
    recurso: "reportes",
    seccion: "clinica",
    roles: ["admin", "asistente"],
    icono: "reportes",
  },
  // ---- Negocio ----
  {
    href: "/panel/finanzas",
    etiqueta: "Finanzas",
    recurso: "finanzas",
    seccion: "negocio",
    roles: ["admin"],
    icono: "finanzas",
  },
  // ---- Configuración ----
  {
    href: "/panel/usuarios",
    etiqueta: "Usuarios",
    recurso: "usuarios",
    seccion: "config",
    roles: ["admin"],
    icono: "usuarios",
  },
  {
    href: "/panel/auditoria",
    etiqueta: "Auditoría",
    recurso: "auditoria",
    seccion: "config",
    roles: ["admin"],
    icono: "auditoria",
  },
  {
    href: "/panel/cuenta",
    etiqueta: "Mi cuenta",
    recurso: "cuenta",
    seccion: "config",
    roles: ["admin", "recepcion", "asistente"],
    icono: "cuenta",
  },
];
