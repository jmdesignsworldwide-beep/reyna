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

// ---------- Pacientes ----------
const textoOpcional = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const pacienteSchema = z.object({
  nombres: z.string().trim().min(2, "Los nombres son obligatorios.").max(80),
  apellidos: z.string().trim().min(2, "Los apellidos son obligatorios.").max(80),
  cedula: textoOpcional(20),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.")
    .optional()
    .or(z.literal("")),
  sexo: z.enum(["femenino", "masculino"]).optional().or(z.literal("")),
  telefono: textoOpcional(20),
  correo: z
    .string()
    .trim()
    .email("Correo inválido.")
    .optional()
    .or(z.literal("")),
  direccion: textoOpcional(200),
  ars: textoOpcional(80),
  numero_afiliado: textoOpcional(40),
  tipo_sangre: textoOpcional(8),
  alergias: textoOpcional(500),
  antecedentes: textoOpcional(1000),
  contacto_emergencia_nombre: textoOpcional(80),
  contacto_emergencia_telefono: textoOpcional(20),
  notas: textoOpcional(1000),
});

export type PacienteInput = z.infer<typeof pacienteSchema>;
