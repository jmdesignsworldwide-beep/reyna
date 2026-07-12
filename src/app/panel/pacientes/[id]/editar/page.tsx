import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { HeartMark } from "@/components/ui/HeartMark";
import { PacienteForm } from "@/components/panel/PacienteForm";
import type { Paciente } from "@/types/database";

export const metadata: Metadata = { title: "Editar paciente" };

export default async function EditarPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "pacientes", "editar")) {
    redirect(`/panel/pacientes/${id}`);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const p = data as Paciente;

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <Link
          href={`/panel/pacientes/${p.id}`}
          className="text-sm text-texto-secundario hover:text-rosa-principal"
        >
          ← Ficha de {p.nombres} {p.apellidos}
        </Link>
        <div className="mt-2 flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4" />
          <span>Edición</span>
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-texto-principal">
          Editar paciente
        </h1>
      </header>

      <PacienteForm modo="editar" paciente={p} />
    </div>
  );
}
