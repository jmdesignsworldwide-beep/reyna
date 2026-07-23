import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { BotonArchivar } from "@/components/panel/BotonArchivar";
import {
  EstudiosHistorial,
  type EstudioConUrl,
} from "@/components/panel/EstudiosHistorial";
import { LineaTiempo } from "@/components/consultas/LineaTiempo";
import { ListaEvaluaciones } from "@/components/evaluaciones/ListaEvaluaciones";
import { ListaReportes, type ReporteVista } from "@/components/reportes/ListaReportes";
import { PagosPaciente, type PagoVista } from "@/components/finanzas/PagosPaciente";
import { HistorialPaciente, type PanelHistorial } from "@/components/paciente/HistorialPaciente";
import { TimelineUnificada } from "@/components/paciente/TimelineUnificada";
import { construirHistorial } from "@/lib/historial";
import { calcularEdad, formatearFecha, formatearFechaHora } from "@/lib/formato";
import {
  ETIQUETA_SEXO,
  ETIQUETA_ESTADO_CIVIL,
  ETIQUETA_DIABETES,
  ETIQUETA_TABAQUISMO,
  clasificacionIMC,
  factoresDeRiesgo,
  nivelRiesgo,
} from "@/lib/cardio";
import type { Paciente, Estudio, Consulta, Evaluacion, Reporte } from "@/types/database";

type EvaluacionResumen = Pick<
  Evaluacion,
  "id" | "fecha" | "estado" | "riesgo_cv" | "motivo"
>;

export const metadata: Metadata = { title: "Ficha de paciente" };

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-texto-secundario">{etiqueta}</dt>
      <dd className="mt-0.5 text-texto-principal">{valor?.toString().trim() || "—"}</dd>
    </div>
  );
}

export default async function FichaPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuaria = await requerirUsuaria();
  const supabase = await createClient();

  const { data } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const p = data as Paciente;

  // Autoridad real: RLS. Aquí gateamos también la carga para NO generar URLs
  // firmadas de archivos clínicos a roles sin permiso (defensa en profundidad).
  const clinico = puedeUI(usuaria.rol, "estudios", "ver");
  const verConsultas = puedeUI(usuaria.rol, "consultas", "ver");

  // Estudios + URLs firmadas (bucket privado). Solo para roles clínicos.
  let estudios: EstudioConUrl[] = [];
  if (clinico) {
    const { data: estudiosRaw } = await supabase
      .from("estudios_cardiologicos")
      .select("*")
      .eq("paciente_id", p.id)
      .order("fecha_estudio", { ascending: false });

    estudios = await Promise.all(
      ((estudiosRaw as Estudio[] | null) ?? []).map(async (e) => {
        let archivo_url: string | null = null;
        if (e.archivo_path) {
          const { data: firmada } = await supabase.storage
            .from("estudios")
            .createSignedUrl(e.archivo_path, 600);
          archivo_url = firmada?.signedUrl ?? null;
        }
        return { ...e, archivo_url };
      }),
    );
  }

  // Historia clínica: consultas del paciente (recurso propio 'consultas').
  let consultas: Consulta[] = [];
  if (verConsultas) {
    const { data: consultasRaw } = await supabase
      .from("consultas")
      .select("*")
      .eq("paciente_id", p.id)
      .order("fecha", { ascending: false });
    consultas = (consultasRaw as Consulta[] | null) ?? [];
  }

  // Evaluaciones formales del paciente (recurso propio 'evaluaciones').
  const verEvaluaciones = puedeUI(usuaria.rol, "evaluaciones", "ver");
  let evaluaciones: EvaluacionResumen[] = [];
  if (verEvaluaciones) {
    const { data: evalRaw } = await supabase
      .from("evaluaciones")
      .select("id, fecha, estado, riesgo_cv, motivo")
      .eq("paciente_id", p.id)
      .order("fecha", { ascending: false });
    evaluaciones = (evalRaw as EvaluacionResumen[] | null) ?? [];
  }

  // Reportes médicos del paciente (recurso propio 'reportes').
  const verReportes = puedeUI(usuaria.rol, "reportes", "ver");
  let reportes: ReporteVista[] = [];
  if (verReportes) {
    const { data: repRaw } = await supabase
      .from("reportes")
      .select("id, tipo, titulo, fecha, created_at, pdf_path, resumen_texto, created_by")
      .eq("paciente_id", p.id)
      .order("created_at", { ascending: false });
    const filas =
      (repRaw as Pick<
        Reporte,
        "id" | "tipo" | "titulo" | "fecha" | "created_at" | "pdf_path" | "resumen_texto" | "created_by"
      >[] | null) ?? [];
    // Nombres de quién generó (best-effort; si RLS lo restringe, se omite).
    const ids = [...new Set(filas.map((f) => f.created_by).filter(Boolean))] as string[];
    const nombres = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nombre_completo")
        .in("id", ids);
      for (const pr of (profs as { id: string; nombre_completo: string }[] | null) ?? []) {
        nombres.set(pr.id, pr.nombre_completo);
      }
    }
    reportes = await Promise.all(
      filas.map(async (f) => {
        let pdf_url: string | null = null;
        if (f.pdf_path) {
          const { data: firmada } = await supabase.storage
            .from("reportes")
            .createSignedUrl(f.pdf_path, 600);
          pdf_url = firmada?.signedUrl ?? null;
        }
        return {
          id: f.id,
          tipo: f.tipo,
          titulo: f.titulo,
          fecha: f.fecha,
          created_at: f.created_at,
          pdf_url,
          resumen_texto: f.resumen_texto,
          generadoPor: f.created_by ? nombres.get(f.created_by) ?? null : null,
        };
      }),
    );
  }

  // Pagos del paciente (recurso 'pagos'; recepción y admin).
  const verPagos = puedeUI(usuaria.rol, "pagos", "ver");
  let pagos: PagoVista[] = [];
  if (verPagos) {
    const { data: pagosRaw } = await supabase
      .from("pagos")
      .select("id, recibo_numero, fecha, monto, tipo, concepto, metodo_pago, pdf_path")
      .eq("paciente_id", p.id)
      .order("fecha", { ascending: false });
    pagos = await Promise.all(
      ((pagosRaw as (PagoVista & { pdf_path: string | null })[] | null) ?? []).map(
        async (pg) => {
          let recibo_url: string | null = null;
          if (pg.pdf_path) {
            const { data: firmada } = await supabase.storage
              .from("recibos")
              .createSignedUrl(pg.pdf_path, 600);
            recibo_url = firmada?.signedUrl ?? null;
          }
          return {
            id: pg.id,
            recibo_numero: pg.recibo_numero,
            fecha: pg.fecha,
            monto: pg.monto,
            tipo: pg.tipo,
            concepto: pg.concepto,
            metodo_pago: pg.metodo_pago,
            recibo_url,
          };
        },
      ),
    );
  }

  // Citas próximas (para el recordatorio de reevaluación).
  const hoy = new Date().toISOString().slice(0, 10);
  const { count: citasFuturas } = await supabase
    .from("citas")
    .select("id", { count: "exact", head: true })
    .eq("paciente_id", p.id)
    .gte("fecha", hoy)
    .neq("estado", "cancelada");

  const edad = calcularEdad(p.fecha_nacimiento);
  const puedeEditar = puedeUI(usuaria.rol, "pacientes", "editar");
  const puedeAgendar = puedeUI(usuaria.rol, "agenda", "crear");
  const factores = factoresDeRiesgo(p);
  const riesgo = nivelRiesgo(factores.length);
  const claseImc = clasificacionIMC(p.imc);
  const tieneAlergias = (p.alergias ?? "").trim() !== "";
  const reevaluacionPendiente = clinico && p.activo && factores.length >= 3 && (citasFuturas ?? 0) === 0;

  // Línea de tiempo clínica unificada (consultas + estudios + evaluaciones + reportes).
  const eventos = construirHistorial({
    pacienteId: p.id,
    consultas,
    estudios,
    evaluaciones,
    reportes,
  });
  const mostrarResumen = verConsultas || clinico || verEvaluaciones || verReportes;

  const panelesHistorial: PanelHistorial[] = [
    ...(mostrarResumen
      ? [
          {
            clave: "resumen",
            etiqueta: "Resumen",
            contenido: (
              <Card>
                <TimelineUnificada eventos={eventos} />
              </Card>
            ),
          },
        ]
      : []),
    ...(verConsultas
      ? [
          {
            clave: "consultas",
            etiqueta: "Consultas",
            contenido: (
              <LineaTiempo
                pacienteId={p.id}
                consultas={consultas}
                puedeCrear={puedeUI(usuaria.rol, "consultas", "crear")}
              />
            ),
          },
        ]
      : []),
    ...(clinico
      ? [
          {
            clave: "estudios",
            etiqueta: "Estudios",
            contenido: (
              <EstudiosHistorial
                pacienteId={p.id}
                estudios={estudios}
                puedeCrear={puedeUI(usuaria.rol, "estudios", "crear")}
                puedeBorrar={puedeUI(usuaria.rol, "estudios", "borrar")}
              />
            ),
          },
        ]
      : []),
    ...(verEvaluaciones
      ? [
          {
            clave: "evaluaciones",
            etiqueta: "Evaluaciones",
            contenido: (
              <ListaEvaluaciones
                pacienteId={p.id}
                evaluaciones={evaluaciones}
                puedeCrear={puedeUI(usuaria.rol, "evaluaciones", "crear")}
              />
            ),
          },
        ]
      : []),
    ...(verReportes
      ? [
          {
            clave: "reportes",
            etiqueta: "Reportes",
            contenido: (
              <ListaReportes
                pacienteId={p.id}
                telefono={p.telefono}
                reportes={reportes}
                puedeCrear={puedeUI(usuaria.rol, "reportes", "crear")}
                puedeBorrar={puedeUI(usuaria.rol, "reportes", "borrar")}
              />
            ),
          },
        ]
      : []),
    ...(verPagos
      ? [
          {
            clave: "pagos",
            etiqueta: "Pagos",
            contenido: (
              <PagosPaciente
                pacienteId={p.id}
                pacienteNombre={`${p.nombres} ${p.apellidos}`}
                pagos={pagos}
                puedeCrear={puedeUI(usuaria.rol, "pagos", "crear")}
                puedeBorrar={puedeUI(usuaria.rol, "pagos", "borrar")}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <header className="animate-fade-up flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/panel/pacientes" className="text-sm text-texto-secundario hover:text-rosa-principal">
            ← Pacientes
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">
            {p.nombres} {p.apellidos}
          </h1>
          <p className="mt-1 text-texto-secundario">
            {edad !== null ? `${edad} años` : "Edad no registrada"}
            {p.sexo ? ` · ${ETIQUETA_SEXO[p.sexo]}` : ""}
            {p.cedula ? ` · Cédula ${p.cedula}` : ""}
          </p>
        </div>
        {(puedeEditar || puedeAgendar) && (
          <div className="flex flex-wrap items-center gap-2">
            {puedeAgendar && p.activo && (
              <Link
                href={`/panel/agenda?nuevo=${p.id}`}
                className="rounded-suave border border-[var(--borde)] px-4 py-2.5 text-sm font-medium text-rosa-principal transition-colors hover:border-rosa-hover"
              >
                ＋ Agendar cita
              </Link>
            )}
            {puedeEditar && (
              <Link
                href={`/panel/pacientes/${p.id}/editar`}
                className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
              >
                Editar
              </Link>
            )}
            {puedeEditar && <BotonArchivar id={p.id} activo={p.activo} />}
          </div>
        )}
      </header>

      {/* ALERTA CRÍTICA: alergias (rojo) */}
      {tieneAlergias && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-tarjeta border p-4"
          style={{ borderColor: "#E0567A", backgroundColor: "#E0567A18" }}
        >
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-estado-urgente text-sm font-bold text-white">
            !
          </span>
          <div>
            <p className="font-semibold text-estado-urgente">Alergias</p>
            <p className="mt-0.5 whitespace-pre-line text-texto-principal">{p.alergias}</p>
          </div>
        </div>
      )}

      {/* Recordatorio de reevaluación (alto riesgo sin cita próxima) */}
      {reevaluacionPendiente && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-tarjeta border p-4"
          style={{ borderColor: "#E8A13C66", backgroundColor: "#E8A13C14" }}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-estado-advertencia text-sm font-bold text-white">
              ↻
            </span>
            <div>
              <p className="font-semibold text-estado-advertencia">Reevaluación pendiente</p>
              <p className="mt-0.5 text-sm text-texto-principal">
                Paciente de riesgo cardiovascular alto sin cita próxima agendada.
              </p>
            </div>
          </div>
          {puedeAgendar && (
            <Link
              href={`/panel/agenda?nuevo=${p.id}`}
              className="rounded-suave border border-estado-advertencia px-4 py-2 text-sm font-medium text-estado-advertencia transition-colors hover:bg-[#E8A13C22]"
            >
              Agendar reevaluación
            </Link>
          )}
        </div>
      )}

      {/* Perfil de riesgo cardiovascular (ámbar) */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-texto-principal">
            Perfil de riesgo cardiovascular
          </h2>
          <span
            className="rounded-full px-3 py-1 text-sm font-medium"
            style={{ backgroundColor: `${riesgo.color}1e`, color: riesgo.color }}
          >
            {riesgo.etiqueta} · {factores.length}{" "}
            {factores.length === 1 ? "factor" : "factores"}
          </span>
        </div>
        {factores.length === 0 ? (
          <p className="mt-3 text-sm text-texto-secundario">
            No hay factores de riesgo registrados.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {factores.map((f) => (
              <span
                key={f.clave}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
                style={{ borderColor: "#E8A13C66", backgroundColor: "#E8A13C14", color: "var(--texto-principal)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-estado-advertencia" />
                {f.etiqueta}
                {f.detalle && <span className="text-texto-secundario">· {f.detalle}</span>}
              </span>
            ))}
          </div>
        )}
      </Card>

      {!p.activo && (
        <div
          role="alert"
          className="rounded-suave border px-4 py-3 text-sm"
          style={{ borderColor: "#E8A13C66", backgroundColor: "#E8A13C14" }}
        >
          Este paciente está archivado. Puedes reactivarlo con el botón “Reactivar”.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Datos personales</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="Nombres" valor={p.nombres} />
            <Dato etiqueta="Apellidos" valor={p.apellidos} />
            <Dato etiqueta="Cédula" valor={p.cedula} />
            <Dato etiqueta="Fecha de nacimiento" valor={p.fecha_nacimiento ? formatearFecha(p.fecha_nacimiento) : null} />
            <Dato etiqueta="Sexo" valor={p.sexo ? ETIQUETA_SEXO[p.sexo] : null} />
            <Dato etiqueta="Estado civil" valor={p.estado_civil ? ETIQUETA_ESTADO_CIVIL[p.estado_civil] : null} />
            <Dato etiqueta="Ocupación" valor={p.ocupacion} />
            <Dato etiqueta="Grupo sanguíneo" valor={p.tipo_sangre} />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Contacto</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="Teléfono" valor={p.telefono} />
            <Dato etiqueta="Teléfono secundario" valor={p.telefono_secundario} />
            <Dato etiqueta="Correo" valor={p.correo} />
            <Dato etiqueta="Ciudad / sector" valor={p.ciudad_sector} />
            <div className="col-span-2">
              <Dato etiqueta="Dirección" valor={p.direccion} />
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Seguro médico</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="ARS" valor={p.ars} />
            <Dato etiqueta="Número de afiliado" valor={p.numero_afiliado} />
            <Dato etiqueta="Tipo de plan" valor={p.tipo_plan} />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Contacto de emergencia</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="Nombre" valor={p.contacto_emergencia_nombre} />
            <Dato etiqueta="Parentesco" valor={p.contacto_emergencia_parentesco} />
            <Dato etiqueta="Teléfono" valor={p.contacto_emergencia_telefono} />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Antropometría</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="Peso" valor={p.peso !== null ? `${p.peso} kg` : null} />
            <Dato etiqueta="Talla" valor={p.talla !== null ? `${p.talla} cm` : null} />
            <div>
              <dt className="text-xs uppercase tracking-wide text-texto-secundario">IMC</dt>
              <dd className="mt-0.5 text-texto-principal">
                {p.imc !== null ? (
                  <>
                    {p.imc}{" "}
                    {claseImc && (
                      <span className="text-sm font-medium" style={{ color: claseImc.color }}>
                        · {claseImc.etiqueta}
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <Dato etiqueta="Circunferencia abdominal" valor={p.circunferencia_abdominal !== null ? `${p.circunferencia_abdominal} cm` : null} />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Factores de riesgo</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="Hipertensión" valor={p.rf_hipertension ? `Sí${p.rf_hipertension_desde ? ` (desde ${p.rf_hipertension_desde})` : ""}` : "No"} />
            <Dato etiqueta="Diabetes" valor={p.rf_diabetes !== "no" ? `${ETIQUETA_DIABETES[p.rf_diabetes]}${p.rf_diabetes_desde ? ` (desde ${p.rf_diabetes_desde})` : ""}` : "No"} />
            <Dato etiqueta="Dislipidemia" valor={p.rf_dislipidemia ? "Sí" : "No"} />
            <Dato etiqueta="Tabaquismo" valor={`${ETIQUETA_TABAQUISMO[p.rf_tabaquismo]}${p.rf_tabaquismo_paquetes_ano ? ` (${p.rf_tabaquismo_paquetes_ano} paq/año)` : ""}`} />
            <Dato etiqueta="Sedentarismo" valor={p.rf_sedentarismo ? "Sí" : "No"} />
            <Dato etiqueta="Enfermedad renal crónica" valor={p.rf_enfermedad_renal ? "Sí" : "No"} />
            <div className="col-span-2">
              <Dato etiqueta="Antec. familiares de ECV" valor={p.rf_antecedentes_familiares ? `Sí${p.rf_antecedentes_familiares_parentesco ? ` (${p.rf_antecedentes_familiares_parentesco})` : ""}` : "No"} />
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Antecedentes personales</h2>
          <dl className="space-y-4">
            <Dato etiqueta="Patológicos" valor={p.antecedentes_patologicos} />
            <Dato etiqueta="Quirúrgicos" valor={p.antecedentes_quirurgicos} />
            <Dato etiqueta="Cardiovasculares" valor={p.antecedentes_cardiovasculares} />
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Medicación actual</h2>
          {p.medicacion.length === 0 ? (
            <p className="text-sm text-texto-secundario">Sin medicación registrada.</p>
          ) : (
            <ul className="divide-y divide-[var(--borde)]">
              {p.medicacion.map((m, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
                  <span className="font-medium text-texto-principal">{m.medicamento}</span>
                  {m.dosis && <span className="text-texto-secundario">{m.dosis}</span>}
                  {m.frecuencia && <span className="text-texto-secundario">· {m.frecuencia}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {panelesHistorial.length > 0 && <HistorialPaciente paneles={panelesHistorial} />}

      {(p.referido_por || p.notas) && (
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Otros</h2>
          <dl className="space-y-4">
            <Dato etiqueta="Referido por" valor={p.referido_por} />
            <Dato etiqueta="Notas generales" valor={p.notas} />
          </dl>
        </Card>
      )}

      <p className="text-xs text-texto-secundario">
        Registrado el {formatearFechaHora(p.created_at)} · Última actualización {formatearFechaHora(p.updated_at)}
      </p>
    </div>
  );
}
