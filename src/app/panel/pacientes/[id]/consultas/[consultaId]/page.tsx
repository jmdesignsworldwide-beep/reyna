import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { AccionesConsulta } from "@/components/consultas/AccionesConsulta";
import { ETIQUETA_TIPO_CONSULTA, clasificacionTA } from "@/lib/consultas";
import { ETIQUETA_TIPO_ESTUDIO } from "@/lib/cardio";
import { clasificacionIMC } from "@/lib/cardio";
import { formatearFecha, formatearFechaHora } from "@/lib/formato";
import type { Consulta, Estudio } from "@/types/database";

export const metadata: Metadata = { title: "Consulta" };

function Signo({
  etiqueta,
  valor,
  unidad,
  color,
}: {
  etiqueta: string;
  valor: string | number | null;
  unidad?: string;
  color?: string;
}) {
  const vacio = valor === null || valor === "" || valor === undefined;
  return (
    <div className="rounded-suave border border-[var(--borde)] p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-texto-secundario">
        {etiqueta}
      </p>
      <p
        className="mt-1 font-display text-xl font-semibold"
        style={{ color: vacio ? "var(--texto-secundario)" : color ?? "var(--texto-principal)" }}
      >
        {vacio ? "—" : valor}
        {!vacio && unidad && (
          <span className="ml-0.5 text-xs font-normal text-texto-secundario">{unidad}</span>
        )}
      </p>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 text-xs uppercase tracking-wide text-texto-secundario">
        {titulo}
      </h2>
      {children}
    </div>
  );
}

export default async function ConsultaDetallePage({
  params,
}: {
  params: Promise<{ id: string; consultaId: string }>;
}) {
  const { id, consultaId } = await params;
  const usuaria = await requerirUsuaria();

  const supabase = await createClient();

  const { data: cData } = await supabase
    .from("consultas")
    .select("*")
    .eq("id", consultaId)
    .eq("paciente_id", id)
    .single();

  // RLS oculta la consulta a roles sin permiso clínico → 404 limpio.
  if (!cData) notFound();
  const c = cData as Consulta;

  const { data: pData } = await supabase
    .from("pacientes")
    .select("nombres, apellidos, cedula, alergias")
    .eq("id", id)
    .single();

  // Estudios del paciente (contexto clínico, solo lectura).
  const { data: estudiosRaw } = await supabase
    .from("estudios_cardiologicos")
    .select("id, tipo, fecha_estudio, conclusion")
    .eq("paciente_id", id)
    .order("fecha_estudio", { ascending: false })
    .limit(6);
  const estudios = (estudiosRaw as Pick<Estudio, "id" | "tipo" | "fecha_estudio" | "conclusion">[] | null) ?? [];

  const ta = clasificacionTA(c.ta_sistolica, c.ta_diastolica);
  const claseImc = clasificacionIMC(c.imc);
  const tieneAlergia = (pData?.alergias ?? "").trim() !== "";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="animate-fade-up flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/panel/pacientes/${id}`}
            className="text-sm text-texto-secundario hover:text-rosa-principal"
          >
            ← {pData ? `${pData.nombres} ${pData.apellidos}` : "Ficha del paciente"}
          </Link>
          <div className="mt-2 flex items-center gap-2 text-sm text-rosa-medio">
            <HeartMark className="h-4 w-4" />
            <span>Consulta</span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold text-texto-principal">
            {formatearFecha(c.fecha)}
          </h1>
          <span className="mt-1 inline-block rounded-full bg-rosa-pastel/60 px-3 py-0.5 text-sm font-medium text-rosa-principal">
            {ETIQUETA_TIPO_CONSULTA[c.tipo]}
          </span>
        </div>
        <AccionesConsulta
          pacienteId={id}
          consultaId={c.id}
          puedeEditar={puedeUI(usuaria.rol, "consultas", "editar")}
          puedeBorrar={puedeUI(usuaria.rol, "consultas", "borrar")}
        />
      </header>

      {tieneAlergia && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-tarjeta border p-4"
          style={{ borderColor: "#E0567A", backgroundColor: "#E0567A18" }}
        >
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-estado-urgente text-xs font-bold text-white">
            !
          </span>
          <p className="text-sm text-texto-principal">
            <strong className="text-estado-urgente">Alergias:</strong> {pData?.alergias}
          </p>
        </div>
      )}

      {c.motivo && (
        <Card>
          <Bloque titulo="Motivo de consulta">
            <p className="whitespace-pre-line text-texto-principal">{c.motivo}</p>
          </Bloque>
        </Card>
      )}

      {/* Signos vitales */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-texto-principal">
            Signos vitales
          </h2>
          <div className="flex flex-wrap gap-2">
            {ta && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                style={{ backgroundColor: `${ta.color}1e`, color: ta.color }}
              >
                {ta.etiqueta}
              </span>
            )}
            {c.imc !== null && claseImc && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                style={{ backgroundColor: `${claseImc.color}1e`, color: claseImc.color }}
              >
                IMC {c.imc} · {claseImc.etiqueta}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          <Signo
            etiqueta="Presión arterial"
            valor={c.ta_sistolica !== null && c.ta_diastolica !== null ? `${c.ta_sistolica}/${c.ta_diastolica}` : null}
            unidad="mmHg"
            color={ta?.color}
          />
          <Signo etiqueta="Frec. cardíaca" valor={c.frecuencia_cardiaca} unidad="lpm" />
          <Signo etiqueta="Frec. respiratoria" valor={c.frecuencia_respiratoria} unidad="rpm" />
          <Signo etiqueta="SpO₂" valor={c.spo2} unidad="%" />
          <Signo etiqueta="Temperatura" valor={c.temperatura} unidad="°C" />
          <Signo etiqueta="Peso" valor={c.peso} unidad="kg" />
          <Signo etiqueta="Talla" valor={c.talla} unidad="cm" />
          <Signo etiqueta="IMC" valor={c.imc} color={claseImc?.color} />
        </div>
      </Card>

      {c.exploracion_fisica && (
        <Card>
          <Bloque titulo="Exploración física">
            <p className="whitespace-pre-line text-texto-principal">{c.exploracion_fisica}</p>
          </Bloque>
        </Card>
      )}

      {c.diagnosticos.length > 0 && (
        <Card>
          <Bloque titulo="Impresión diagnóstica">
            <ul className="space-y-1.5">
              {c.diagnosticos.map((d, i) => (
                <li key={i} className="flex items-baseline gap-2 text-texto-principal">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-rosa-principal" />
                  <span>
                    {d.diagnostico}
                    {d.cie10 && (
                      <span className="ml-2 text-xs text-texto-secundario">({d.cie10})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Bloque>
        </Card>
      )}

      {c.plan_conducta && (
        <Card>
          <Bloque titulo="Plan y conducta">
            <p className="whitespace-pre-line text-texto-principal">{c.plan_conducta}</p>
          </Bloque>
        </Card>
      )}

      {c.prescripcion.length > 0 && (
        <Card>
          <Bloque titulo="Prescripción">
            <ul className="divide-y divide-[var(--borde)]">
              {c.prescripcion.map((m, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
                  <span className="font-medium text-texto-principal">{m.medicamento}</span>
                  {m.dosis && <span className="text-texto-secundario">{m.dosis}</span>}
                  {m.frecuencia && <span className="text-texto-secundario">· {m.frecuencia}</span>}
                  {m.duracion && <span className="text-texto-secundario">· {m.duracion}</span>}
                </li>
              ))}
            </ul>
          </Bloque>
        </Card>
      )}

      {(c.proxima_reevaluacion || c.notas_evolucion) && (
        <Card>
          <div className="space-y-4">
            {c.proxima_reevaluacion && (
              <Bloque titulo="Próxima cita / reevaluación">
                <p className="text-texto-principal">{c.proxima_reevaluacion}</p>
              </Bloque>
            )}
            {c.notas_evolucion && (
              <Bloque titulo="Notas de evolución">
                <p className="whitespace-pre-line text-texto-principal">{c.notas_evolucion}</p>
              </Bloque>
            )}
          </div>
        </Card>
      )}

      {estudios.length > 0 && (
        <Card>
          <Bloque titulo="Estudios cardiológicos del paciente">
            <ul className="space-y-2">
              {estudios.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-suave border border-[var(--borde)] px-3 py-2 text-sm"
                >
                  <span className="font-medium text-texto-principal">
                    {ETIQUETA_TIPO_ESTUDIO[e.tipo]}
                    <span className="ml-2 text-xs text-texto-secundario">
                      {formatearFecha(e.fecha_estudio)}
                    </span>
                  </span>
                  {e.conclusion && (
                    <span className="line-clamp-1 max-w-[60%] text-texto-secundario">
                      {e.conclusion}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <Link
              href={`/panel/pacientes/${id}`}
              className="mt-3 inline-block text-sm text-rosa-principal hover:text-rosa-hover"
            >
              Ver estudios y archivos en la ficha →
            </Link>
          </Bloque>
        </Card>
      )}

      <p className="text-xs text-texto-secundario">
        Registrada el {formatearFechaHora(c.created_at)}
        {c.updated_at !== c.created_at && ` · Actualizada ${formatearFechaHora(c.updated_at)}`}
      </p>
    </div>
  );
}
