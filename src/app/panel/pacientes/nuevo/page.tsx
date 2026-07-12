import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { puedeUI } from "@/lib/permissions";
import { HeartMark } from "@/components/ui/HeartMark";
import { PacienteForm } from "@/components/panel/PacienteForm";

export const metadata: Metadata = { title: "Nuevo paciente" };

export default async function NuevoPacientePage() {
  const usuaria = await requerirUsuaria();
  // Verificación de permiso server-side (además de la RLS).
  if (!puedeUI(usuaria.rol, "pacientes", "crear")) {
    redirect("/panel/pacientes");
  }

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <Link
          href="/panel/pacientes"
          className="text-sm text-texto-secundario hover:text-rosa-principal"
        >
          ← Pacientes
        </Link>
        <div className="mt-2 flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4" />
          <span>Nuevo registro</span>
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-texto-principal">
          Registrar paciente
        </h1>
      </header>

      <PacienteForm modo="crear" />
    </div>
  );
}
