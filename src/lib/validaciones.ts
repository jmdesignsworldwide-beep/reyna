import { z } from "zod";

const ROLES = ["admin", "recepcion", "asistente"] as const;

// Contraseña robusta: mínimo 10, con mayúscula, minúscula y número.
export const claveSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres.")
  .regex(/[A-Z]/, "Debe incluir al menos una mayúscula.")
  .regex(/[a-z]/, "Debe incluir al menos una minúscula.")
  .regex(/[0-9]/, "Debe incluir al menos un número.");

export const crearUsuariaSchema = z.object({
  nombre_completo: z
    .string()
    .trim()
    .min(3, "El nombre es obligatorio.")
    .max(120),
  correo: z.string().trim().toLowerCase().email("Correo inválido."),
  cedula: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
  telefono: z.string().trim().max(20).optional().or(z.literal("")),
  rol: z.enum(ROLES),
  clave: claveSchema,
});

export const actualizarUsuariaSchema = z
  .object({
    rol: z.enum(ROLES).optional(),
    activo: z.boolean().optional(),
  })
  .refine((d) => d.rol !== undefined || d.activo !== undefined, {
    message: "No hay cambios que aplicar.",
  });

export const cambiarClaveSchema = z.object({
  clave_actual: z.string().min(1, "Ingresa tu contraseña actual."),
  clave_nueva: claveSchema,
});

export const claveRecuperacionSchema = z.object({
  clave_nueva: claveSchema,
});

export type CrearUsuaria = z.infer<typeof crearUsuariaSchema>;
