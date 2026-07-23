import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { LinkPrimario } from "@/components/ui/LinkPrimario";
import { ETIQUETA_ESTADO_EVALUACION, riesgoCV } from "@/lib/evaluaciones";
import { formatearFecha } from "@/lib/formato";
import type { Evaluacion } from "@/types/database";

export function ListaEvaluaciones({
  pacienteId,
  evaluaciones,
  puedeCrear,
}: {
  pacienteId: string;
  evaluaciones: Pick<Evaluacion, "id" | "fecha" | "estado" | "riesgo_cv" | "motivo">[];
  puedeCrear: boolean;
}) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-rosa-medio">
            <HeartMark className="h-4 w-4" />
            <span>Documentos</span>
          </div>
          <h2 className="mt-1 font-display text-lg font-semibold text-texto-principal">
            Evaluaciones cardiológicas formales
          </h2>
          <p className="text-sm text-texto-secundario">
            {evaluaciones.length}{" "}
            {evaluaciones.length === 1 ? "evaluación" : "evaluaciones"}
          </p>
        </div>
        {puedeCrear && (
          <Link
            href={`/panel/pacientes/${pacienteId}/evaluaciones/nueva`}
            className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
          >
            ＋ Nueva evaluación
          </Link>
        )}
      </div>

      {evaluaciones.length === 0 ? (
        <EstadoVacio
          compacto
          titulo="Sin evaluaciones"
          texto="Este paciente aún no tiene evaluaciones cardiológicas formales. Crea la primera y fírmala para generar su documento sellado."
          accion={
            puedeCrear ? (
              <LinkPrimario href={`/panel/pacientes/${pacienteId}/evaluaciones/nueva`}>
                ＋ Nueva evaluación
              </LinkPrimario>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {evaluaciones.map((ev) => {
            const r = riesgoCV(ev.riesgo_cv);
            const firmada = ev.estado === "firmada";
            return (
              <li key={ev.id}>
                <Link
                  href={`/panel/pacientes/${pacienteId}/evaluaciones/${ev.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-suave border border-[var(--borde)] p-4 transition-all hover:-translate-y-0.5 hover:border-rosa-hover hover:shadow-tarjeta"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-texto-principal">
                      {formatearFecha(ev.fecha)}
                    </p>
                    {ev.motivo && (
                      <p className="line-clamp-1 text-sm text-texto-secundario">{ev.motivo}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {r && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: `${r.color}1e`, color: r.color }}
                      >
                        Riesgo {r.texto.toLowerCase()}
                      </span>
                    )}
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: firmada ? "rgba(76,175,130,0.14)" : "var(--superficie-suave)",
                        color: firmada ? "#4CAF82" : "var(--texto-secundario)",
                      }}
                    >
                      {firmada && (
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                      {ETIQUETA_ESTADO_EVALUACION[ev.estado]}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
