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

const fechaOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.")
  .optional()
  .or(z.literal(""));

// Cédula dominicana: 11 dígitos (con o sin guiones). Opcional.
const cedulaDominicana = z
  .string()
  .trim()
  .regex(/^\d{3}-?\d{7}-?\d{1}$/, "Cédula inválida (formato dominicano: 000-0000000-0).")
  .optional()
  .or(z.literal(""));

const numeroOpcional = z.number().nonnegative().nullable();

const medicamentoSchema = z.object({
  medicamento: z.string().trim().min(1).max(120),
  dosis: z.string().trim().max(80).optional().or(z.literal("")),
  frecuencia: z.string().trim().max(80).optional().or(z.literal("")),
});

export const pacienteSchema = z.object({
  // Identificación y demográficos
  nombres: z.string().trim().min(2, "Los nombres son obligatorios.").max(80),
  apellidos: z.string().trim().min(2, "Los apellidos son obligatorios.").max(80),
  cedula: cedulaDominicana,
  fecha_nacimiento: fechaOpcional,
  sexo: z.enum(["femenino", "masculino"]).nullable(),
  estado_civil: z
    .enum(["soltero", "casado", "union_libre", "divorciado", "viudo", "otro"])
    .nullable(),
  ocupacion: textoOpcional(80),
  // Contacto
  telefono: textoOpcional(20),
  telefono_secundario: textoOpcional(20),
  correo: z.string().trim().email("Correo inválido.").optional().or(z.literal("")),
  direccion: textoOpcional(200),
  ciudad_sector: textoOpcional(120),
  // Seguro
  ars: textoOpcional(80),
  numero_afiliado: textoOpcional(40),
  tipo_plan: textoOpcional(80),
  // Contacto de emergencia
  contacto_emergencia_nombre: textoOpcional(80),
  contacto_emergencia_parentesco: textoOpcional(40),
  contacto_emergencia_telefono: textoOpcional(20),
  // Antropometría
  peso: numeroOpcional,
  talla: numeroOpcional,
  circunferencia_abdominal: numeroOpcional,
  // Factores de riesgo cardiovascular
  rf_hipertension: z.boolean(),
  rf_hipertension_desde: textoOpcional(40),
  rf_diabetes: z.enum(["no", "tipo_1", "tipo_2"]),
  rf_diabetes_desde: textoOpcional(40),
  rf_dislipidemia: z.boolean(),
  rf_tabaquismo: z.enum(["nunca", "exfumador", "activo"]),
  rf_tabaquismo_paquetes_ano: numeroOpcional,
  rf_sedentarismo: z.boolean(),
  rf_antecedentes_familiares: z.boolean(),
  rf_antecedentes_familiares_parentesco: textoOpcional(80),
  rf_enfermedad_renal: z.boolean(),
  // Antecedentes personales
  antecedentes_patologicos: textoOpcional(2000),
  antecedentes_quirurgicos: textoOpcional(2000),
  antecedentes_cardiovasculares: textoOpcional(2000),
  // Medicación
  medicacion: z.array(medicamentoSchema).max(50),
  // Alergias y otros
  tipo_sangre: textoOpcional(8),
  alergias: textoOpcional(1000),
  referido_por: textoOpcional(120),
  notas: textoOpcional(2000),
});

export type PacienteInput = z.infer<typeof pacienteSchema>;

// ---------- Estudios cardiológicos ----------
export const estudioSchema = z.object({
  tipo: z.enum([
    "ecocardiograma",
    "electrocardiograma",
    "prueba_esfuerzo",
    "holter_ritmo",
    "holter_presion",
    "otro",
  ]),
  fecha_estudio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha del estudio es obligatoria."),
  hallazgos: textoOpcional(4000),
  conclusion: textoOpcional(2000),
  realizado_por: textoOpcional(120),
});

export type EstudioInput = z.infer<typeof estudioSchema>;

// ---------- Citas / Agenda ----------
export const citaSchema = z.object({
  paciente_id: z.string().uuid("Selecciona un paciente."),
  sede_id: z.string().uuid("Selecciona una sede."),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida."),
  duracion: z.coerce.number().int().min(10).max(240),
  tipo: z.enum([
    "primera_vez",
    "seguimiento",
    "ecocardiograma",
    "electrocardiograma",
    "chequeo_cardiovascular",
  ]),
  motivo: z.string().trim().max(300).optional().or(z.literal("")),
  notas: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const estadoCitaSchema = z.object({
  estado: z.enum(["agendada", "confirmada", "atendida", "cancelada", "no_show"]),
});

export type CitaInput = z.infer<typeof citaSchema>;
