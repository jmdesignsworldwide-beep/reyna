import type { Metadata } from "next";
import { requerirRol } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GestorUsuarias } from "@/components/panel/GestorUsuarias";
import { HeartMark } from "@/components/ui/HeartMark";
import type { UserRole } from "@/types/database";

export const metadata: Metadata = { title: "Usuarios" };

export interface UsuariaLista {
  id: string;
  nombre_completo: string;
  correo: string;
  cedula: string | null;
  rol: UserRole;
  activo: boolean;
  created_at: string;
}

export default async function UsuariasPage() {
  const actual = await requerirRol("admin");
  const admin = createAdminClient();

  const { data: perfiles } = await admin
    .from("profiles")
    .select("id, nombre_completo, cedula, rol, activo, created_at")
    .order("created_at", { ascending: true });

  // Mapa de correos desde Auth.
  const { data: usuariosAuth } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  const correos = new Map(
    (usuariosAuth?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  const usuarias: UsuariaLista[] = (perfiles ?? []).map((p) => ({
    id: p.id,
    nombre_completo: p.nombre_completo,
    correo: correos.get(p.id) ?? "—",
    cedula: p.cedula,
    rol: p.rol,
    activo: p.activo,
    created_at: p.created_at,
  }));

  const totalAdmins = usuarias.filter(
    (u) => u.rol === "admin" && u.activo,
  ).length;

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <div className="flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4" />
          <span>Administración</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">
          Usuarios del sistema
        </h1>
        <p className="mt-1 text-texto-secundario">
          Crea cuentas, asigna roles y controla el acceso. El último
          administrador activo está protegido.
        </p>
      </header>

      <GestorUsuarias
        inicial={usuarias}
        actualId={actual.id}
        totalAdmins={totalAdmins}
      />
    </div>
  );
}
