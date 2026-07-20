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

export interface ItemNavegacion {
  href: string;
  etiqueta: string;
  recurso: string;
  /** Roles que ven el ítem en el menú (control fino se refuerza server-side). */
  roles: UserRole[];
  icono: string;
}

/**
 * Navegación del panel. `roles` decide visibilidad en el sidebar; cada
 * página además revalida con requerirRol() en el servidor.
 */
export const NAVEGACION: ItemNavegacion[] = [
  {
    href: "/panel",
    etiqueta: "Dashboard",
    recurso: "dashboard",
    roles: ["admin", "recepcion", "asistente"],
    icono: "inicio",
  },
  {
    href: "/panel/pacientes",
    etiqueta: "Pacientes",
    recurso: "pacientes",
    roles: ["admin", "recepcion", "asistente"],
    icono: "pacientes",
  },
  {
    href: "/panel/agenda",
    etiqueta: "Agenda",
    recurso: "agenda",
    roles: ["admin", "recepcion", "asistente"],
    icono: "agenda",
  },
  {
    href: "/panel/finanzas",
    etiqueta: "Finanzas",
    recurso: "finanzas",
    roles: ["admin"],
    icono: "finanzas",
  },
  {
    href: "/panel/usuarios",
    etiqueta: "Usuarios",
    recurso: "usuarios",
    roles: ["admin"],
    icono: "usuarios",
  },
  {
    href: "/panel/auditoria",
    etiqueta: "Auditoría",
    recurso: "auditoria",
    roles: ["admin"],
    icono: "auditoria",
  },
  {
    href: "/panel/cuenta",
    etiqueta: "Mi cuenta",
    recurso: "cuenta",
    roles: ["admin", "recepcion", "asistente"],
    icono: "cuenta",
  },
];
