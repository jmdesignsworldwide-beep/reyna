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
  admin: "Acceso total: pacientes, agenda, finanzas, reportes y usuarias.",
  recepcion: "Pacientes y agenda. Sin acceso a finanzas.",
  asistente: "Permisos acotados de apoyo clínico.",
};

export const ROLES: UserRole[] = ["admin", "recepcion", "asistente"];

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
    etiqueta: "Inicio",
    recurso: "inicio",
    roles: ["admin", "recepcion", "asistente"],
    icono: "inicio",
  },
  {
    href: "/panel/usuarios",
    etiqueta: "Usuarias",
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
