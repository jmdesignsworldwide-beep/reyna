import type { Metadata } from "next";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
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

function EtiquetasPaciente({
  f,
}: {
  f: { tieneAlergia: boolean; riesgo: { color: string; etiqueta: string } | null; activo: boolean };
}) {
  return (
    <>
      {f.tieneAlergia && (
        <span
          title="Alergia registrada"
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: "#E0567A1e", color: "#E0567A" }}
        >
          ♥ Alergia
        </span>
      )}
      {f.riesgo && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: `${f.riesgo.color}1e`, color: f.riesgo.color }}
        >
          {f.riesgo.etiqueta}
        </span>
      )}
      {!f.activo && <span className="text-xs text-texto-secundario">(archivado)</span>}
    </>
  );
}

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
    // Búsqueda segura. Neutralizamos los metacaracteres del filtro PostgREST
    // (coma separa condiciones; paréntesis/asterisco/dos puntos/backslash y el
    // comodín % podrían alterar la expresión) antes de interpolar el término.
    // Los nombres/cédulas reales no contienen estos símbolos, así que es seguro.
    const t = q.replace(/[,()*:\\%]/g, " ").trim();
    if (t) {
      consulta = consulta.or(
        `nombres.ilike.%${t}%,apellidos.ilike.%${t}%,cedula.ilike.%${t}%`,
      );
    }
  }

  const { data: pacientes } = await consulta;
  const lista = pacientes ?? [];
  const puedeCrear = puedeUI(usuaria.rol, "pacientes", "crear");

  // Fila normalizada (se usa igual en la tabla de escritorio y las tarjetas móvil).
  const filas = lista.map((p) => {
    const p2 = p as unknown as Paciente;
    const nfac = clinico ? factoresDeRiesgo(p2).length : 0;
    return {
      id: p.id,
      nombre: `${p.apellidos}, ${p.nombres}`,
      cedula: p.cedula as string | null,
      edad: calcularEdad(p.fecha_nacimiento),
      telefono: p.telefono as string | null,
      ars: p.ars as string | null,
      activo: p.activo as boolean,
      tieneAlergia: (p2.alergias ?? "").trim() !== "",
      riesgo: clinico && nfac >= 3 ? nivelRiesgo(nfac) : null,
    };
  });

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
          <EstadoVacio
            titulo={q ? "Sin resultados" : "Aún no hay pacientes"}
            texto={
              q
                ? "No se encontraron pacientes con ese criterio. Prueba con otro nombre o cédula."
                : "Registra tu primer paciente para empezar a construir su historia clínica."
            }
          />
        </Card>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <Card className="hidden overflow-hidden !p-0 md:block">
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
                  {filas.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-[var(--borde)] last:border-0 transition-colors hover:bg-[var(--superficie-suave)]"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/panel/pacientes/${f.id}`}
                            className="font-medium text-texto-principal hover:text-rosa-principal"
                          >
                            {f.nombre}
                          </Link>
                          <EtiquetasPaciente f={f} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-texto-secundario">{f.cedula ?? "—"}</td>
                      <td className="px-5 py-3.5 text-texto-secundario">
                        {f.edad !== null ? `${f.edad} años` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-texto-secundario">{f.telefono ?? "—"}</td>
                      <td className="px-5 py-3.5 text-texto-secundario">{f.ars ?? "—"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/panel/pacientes/${f.id}`}
                          className="text-sm text-rosa-principal hover:text-rosa-hover"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Móvil: tarjetas apiladas */}
          <div className="space-y-3 md:hidden">
            {filas.map((f) => (
              <Link
                key={f.id}
                href={`/panel/pacientes/${f.id}`}
                className="tarjeta tarjeta-interactiva block !p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium text-texto-principal">{f.nombre}</p>
                  <span className="flex-none text-sm text-rosa-principal">Ver →</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <EtiquetasPaciente f={f} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-texto-secundario">Cédula</dt>
                    <dd className="truncate text-texto-principal">{f.cedula ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-texto-secundario">Edad</dt>
                    <dd className="text-texto-principal">{f.edad !== null ? `${f.edad} años` : "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-texto-secundario">Teléfono</dt>
                    <dd className="truncate text-texto-principal">{f.telefono ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-texto-secundario">ARS</dt>
                    <dd className="truncate text-texto-principal">{f.ars ?? "—"}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
