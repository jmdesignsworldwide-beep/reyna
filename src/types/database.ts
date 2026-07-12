/**
 * Tipos de la base de datos (mantener en sync con supabase/migrations).
 * Sigue la forma canónica que espera @supabase/supabase-js para que el
 * cliente tipado infiera correctamente Row/Insert/Update y las funciones.
 * En tandas futuras se puede regenerar con `supabase gen types typescript`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "recepcion" | "asistente";

export type SexoPaciente = "femenino" | "masculino";
export type EstadoCivil =
  | "soltero"
  | "casado"
  | "union_libre"
  | "divorciado"
  | "viudo"
  | "otro";
export type DiabetesTipo = "no" | "tipo_1" | "tipo_2";
export type TabaquismoEstado = "nunca" | "exfumador" | "activo";
export type TipoEstudio =
  | "ecocardiograma"
  | "electrocardiograma"
  | "prueba_esfuerzo"
  | "holter_ritmo"
  | "holter_presion"
  | "otro";

export type Medicamento = {
  medicamento: string;
  dosis: string;
  frecuencia: string;
};

export type Paciente = {
  id: string;
  // Identificación y demográficos
  nombres: string;
  apellidos: string;
  cedula: string | null;
  fecha_nacimiento: string | null;
  sexo: SexoPaciente | null;
  estado_civil: EstadoCivil | null;
  ocupacion: string | null;
  // Contacto
  telefono: string | null;
  telefono_secundario: string | null;
  correo: string | null;
  direccion: string | null;
  ciudad_sector: string | null;
  // Seguro
  ars: string | null;
  numero_afiliado: string | null;
  tipo_plan: string | null;
  // Contacto de emergencia
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_parentesco: string | null;
  contacto_emergencia_telefono: string | null;
  // Antropometría
  peso: number | null;
  talla: number | null;
  imc: number | null; // columna generada
  circunferencia_abdominal: number | null;
  // Factores de riesgo cardiovascular
  rf_hipertension: boolean;
  rf_hipertension_desde: string | null;
  rf_diabetes: DiabetesTipo;
  rf_diabetes_desde: string | null;
  rf_dislipidemia: boolean;
  rf_tabaquismo: TabaquismoEstado;
  rf_tabaquismo_paquetes_ano: number | null;
  rf_sedentarismo: boolean;
  rf_antecedentes_familiares: boolean;
  rf_antecedentes_familiares_parentesco: string | null;
  rf_enfermedad_renal: boolean;
  // Antecedentes personales
  antecedentes_patologicos: string | null;
  antecedentes_quirurgicos: string | null;
  antecedentes_cardiovasculares: string | null;
  // Medicación
  medicacion: Medicamento[];
  // Alergias y otros
  tipo_sangre: string | null;
  alergias: string | null;
  referido_por: string | null;
  notas: string | null;
  activo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Estudio = {
  id: string;
  paciente_id: string;
  tipo: TipoEstudio;
  fecha_estudio: string;
  hallazgos: string | null;
  conclusion: string | null;
  archivo_path: string | null;
  archivo_nombre: string | null;
  realizado_por: string | null;
  created_by: string | null;
  created_at: string;
};

// Se usan `type` (no `interface`) a propósito: los alias de tipo son
// asignables a Record<string, unknown> que exige GenericSchema de Supabase;
// las interfaces no lo son (les falta la index signature implícita).
export type Profile = {
  id: string;
  nombre_completo: string;
  cedula: string | null;
  telefono: string | null;
  rol: UserRole;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  metadata: Json;
  ip: string | null;
  created_at: string;
};

export type RolePermission = {
  rol: UserRole;
  recurso: string;
  puede_ver: boolean;
  puede_crear: boolean;
  puede_editar: boolean;
  puede_borrar: boolean;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          nombre_completo: string;
          cedula?: string | null;
          telefono?: string | null;
          rol?: UserRole;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre_completo?: string;
          cedula?: string | null;
          telefono?: string | null;
          rol?: UserRole;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: AuditLog;
        Insert: {
          id?: number;
          actor_id?: string | null;
          actor_email?: string | null;
          accion: string;
          entidad?: string | null;
          entidad_id?: string | null;
          metadata?: Json;
          ip?: string | null;
          created_at?: string;
        };
        Update: {
          accion?: string;
          entidad?: string | null;
          entidad_id?: string | null;
          metadata?: Json;
          ip?: string | null;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: RolePermission;
        Insert: RolePermission;
        Update: Partial<RolePermission>;
        Relationships: [];
      };
      rate_limits: {
        Row: { bucket: string; window_start: string; hits: number };
        Insert: { bucket: string; window_start: string; hits?: number };
        Update: { hits?: number };
        Relationships: [];
      };
      pacientes: {
        Row: Paciente;
        Insert: Partial<
          Omit<Paciente, "id" | "imc" | "created_at" | "updated_at">
        > & { nombres: string; apellidos: string };
        Update: Partial<
          Omit<Paciente, "id" | "imc" | "created_at" | "updated_at">
        >;
        Relationships: [];
      };
      estudios_cardiologicos: {
        Row: Estudio;
        Insert: Partial<Omit<Estudio, "id" | "created_at">> & {
          paciente_id: string;
          tipo: TipoEstudio;
          fecha_estudio: string;
        };
        Update: Partial<Omit<Estudio, "id" | "paciente_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      puede: {
        Args: { p_recurso: string; p_accion: string };
        Returns: boolean;
      };
      count_active_admins: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      enforce_rate_limit: {
        Args: { p_bucket: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      log_audit: {
        Args: {
          p_accion: string;
          p_entidad?: string;
          p_entidad_id?: string;
          p_metadata?: Json;
        };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      sexo_paciente: SexoPaciente;
      estado_civil: EstadoCivil;
      diabetes_tipo: DiabetesTipo;
      tabaquismo_estado: TabaquismoEstado;
      tipo_estudio: TipoEstudio;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
