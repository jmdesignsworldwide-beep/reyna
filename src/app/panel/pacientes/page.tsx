import type { Metadata } from "next";
import Link from "next/link";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { BuscadorPacientes } from "@/components/panel/BuscadorPacientes";
import { calcularEdad } from "@/lib/formato";
import { factoresDeRiesgo, nivelRiesgo } from "@/lib/cardio";
import type { Paciente } from "@/types/database";

export const metadata: Metadata = { title: "Pacientes" };

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: qRaw } = await searchParams;
  const usuaria = await requerirUsuaria();
  const supabase = await createClient();
  const q = (qRaw ?? "").trim();

  const clinico = puedeUI(usuaria.rol, "estudios", "ver");

  let consulta = supabase
    .from("pacientes")
    .select(
      "id, nombres, apellidos, cedula, fecha_nacimiento, telefono, ars, activo, alergias, imc, rf_hipertension, rf_hipertension_desde, rf_diabetes, rf_diabetes_desde, rf_dislipidemia, rf_tabaquismo, rf_tabaquismo_paquetes_ano, rf_sedentarismo, rf_antecedentes_familiares, rf_antecedentes_familiares_parentesco, rf_enfermedad_renal",
    )
    .order("apellidos", { ascending: true })
    .limit(100);

  if (q) {
    // Búsqueda segura: Supabase parametriza; escapamos comas para el filtro OR.
    const t = q.replace(/[,%]/g, " ");
    consulta = consulta.or(
      `nombres.ilike.%${t}%,apellidos.ilike.%${t}%,cedula.ilike.%${t}%`,
    );
  }

  const { data: pacientes } = await consulta;
  const lista = pacientes ?? [];
  const puedeCrear = puedeUI(usuaria.rol, "pacientes", "crear");

  return (
    <div className="space-y-6">
      <header className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-rosa-medio">
            <HeartMark className="h-4 w-4" />
            <span>Expediente</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">
            Pacientes
          </h1>
          <p className="mt-1 text-texto-secundario">
            {lista.length} {lista.length === 1 ? "paciente" : "pacientes"}
            {q && ` para “${q}”`}
          </p>
        </div>
        {puedeCrear && (
          <Link
            href="/panel/pacientes/nuevo"
            className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
          >
            ＋ Nuevo paciente
          </Link>
        )}
      </header>

      <BuscadorPacientes inicial={q} />

      {lista.length === 0 ? (
        <Card>
          <p className="text-sm text-texto-secundario">
            {q
              ? "No se encontraron pacientes con ese criterio."
              : "Aún no hay pacientes registrados."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--borde)] text-xs uppercase tracking-wide text-texto-secundario">
                  <th className="px-5 py-3.5 font-medium">Paciente</th>
                  <th className="px-5 py-3.5 font-medium">Cédula</th>
                  <th className="px-5 py-3.5 font-medium">Edad</th>
                  <th className="px-5 py-3.5 font-medium">Teléfono</th>
                  <th className="px-5 py-3.5 font-medium">ARS</th>
                  <th className="px-5 py-3.5 font-medium text-right">Ficha</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => {
                  const p2 = p as unknown as Paciente;
                  const edad = calcularEdad(p.fecha_nacimiento);
                  const nfac = clinico ? factoresDeRiesgo(p2).length : 0;
                  const altoRiesgo = clinico && nfac >= 3;
                  const riesgo = altoRiesgo ? nivelRiesgo(nfac) : null;
                  const tieneAlergia = (p2.alergias ?? "").trim() !== "";
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--borde)] last:border-0 transition-colors hover:bg-[var(--superficie-suave)]"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/panel/pacientes/${p.id}`}
                            className="font-medium text-texto-principal hover:text-rosa-principal"
                          >
                            {p.apellidos}, {p.nombres}
                          </Link>
                          {tieneAlergia && (
                            <span
                              title="Alergia registrada"
                              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: "#E0567A1e", color: "#E0567A" }}
                            >
                              ♥ Alergia
                            </span>
                          )}
                          {riesgo && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: `${riesgo.color}1e`, color: riesgo.color }}
                            >
                              {riesgo.etiqueta}
                            </span>
                          )}
                          {!p.activo && (
                            <span className="text-xs text-texto-secundario">(archivado)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-texto-secundario">
                        {p.cedula ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-texto-secundario">
                        {edad !== null ? `${edad} años` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-texto-secundario">
                        {p.telefono ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-texto-secundario">
                        {p.ars ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/panel/pacientes/${p.id}`}
                          className="text-sm text-rosa-principal hover:text-rosa-hover"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
