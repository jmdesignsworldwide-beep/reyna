import type { Metadata } from "next";
import { requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { formatearFechaHora } from "@/lib/formato";

export const metadata: Metadata = { title: "Auditoría" };

const ETIQUETA_ACCION: Record<string, string> = {
  crear_usuaria: "Creó una cuenta",
  actualizar_usuaria: "Actualizó una cuenta",
  eliminar_usuaria: "Eliminó una cuenta",
  cambiar_clave: "Cambió su contraseña",
  crear_paciente: "Registró un paciente",
  actualizar_paciente: "Actualizó un paciente",
  archivar_paciente: "Archivó un paciente",
  reactivar_paciente: "Reactivó un paciente",
  crear_estudio: "Registró un estudio",
  eliminar_estudio: "Eliminó un estudio",
  crear_consulta: "Registró una consulta",
  actualizar_consulta: "Actualizó una consulta",
  eliminar_consulta: "Eliminó una consulta",
  crear_evaluacion: "Creó una evaluación formal",
  actualizar_evaluacion: "Actualizó una evaluación",
  eliminar_evaluacion: "Eliminó una evaluación",
  firmar_evaluacion: "Firmó y selló una evaluación",
  crear_cita: "Agendó una cita",
  actualizar_cita: "Editó una cita",
  cambiar_estado_cita: "Cambió el estado de una cita",
  eliminar_cita: "Eliminó una cita",
};

export default async function AuditoriaPage() {
  await requerirRol("admin");
  const supabase = await createClient();

  const { data: eventos } = await supabase
    .from("audit_log")
    .select("id, actor_email, accion, entidad, entidad_id, created_at, ip")
    .order("created_at", { ascending: false })
    .limit(100);

  const lista = eventos ?? [];

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <div className="flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4" />
          <span>Seguridad</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">
          Bitácora de auditoría
        </h1>
        <p className="mt-1 text-texto-secundario">
          Registro inmutable de acciones sensibles: quién, qué y cuándo.
        </p>
      </header>

      <Card className="overflow-hidden !p-0">
        {lista.length === 0 ? (
          <p className="p-6 text-sm text-texto-secundario">
            Aún no hay eventos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--borde)] text-xs uppercase tracking-wide text-texto-secundario">
                  <th className="px-5 py-3.5 font-medium">Acción</th>
                  <th className="px-5 py-3.5 font-medium">Usuaria</th>
                  <th className="px-5 py-3.5 font-medium">Fecha y hora</th>
                  <th className="px-5 py-3.5 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-[var(--borde)] last:border-0 hover:bg-[var(--superficie-suave)]"
                  >
                    <td className="px-5 py-3.5 font-medium text-texto-principal">
                      {ETIQUETA_ACCION[e.accion] ?? e.accion}
                    </td>
                    <td className="px-5 py-3.5 text-texto-secundario">
                      {e.actor_email ?? "sistema"}
                    </td>
                    <td className="px-5 py-3.5 text-texto-secundario">
                      {formatearFechaHora(e.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-texto-secundario">
                      {e.ip ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
