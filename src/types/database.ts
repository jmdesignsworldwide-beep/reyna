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
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
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
    };
    CompositeTypes: { [_ in never]: never };
  };
}
