import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { riesgoCV, EXPLORACION_CAMPOS } from "@/lib/evaluaciones";
import { clasificacionIMC } from "@/lib/cardio";
import { formatearFecha } from "@/lib/formato";
import type { Evaluacion } from "@/types/database";

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs uppercase tracking-[0.15em] text-rosa-medio">{titulo}</h3>
      {children}
    </section>
  );
}

function Parrafo({ children }: { children: React.ReactNode }) {
  return <p className="whitespace-pre-line leading-relaxed text-texto-principal">{children}</p>;
}

export function EvaluacionDoc({
  evaluacion,
  pacienteNombre,
  pacienteCedula,
  edad,
  sexo,
}: {
  evaluacion: Evaluacion;
  pacienteNombre: string;
  pacienteCedula: string | null;
  edad: number | null;
  sexo: string | null;
}) {
  const e = evaluacion;
  const r = riesgoCV(e.riesgo_cv);
  const claseImc = clasificacionIMC(e.imc);

  const vitales: string[] = [];
  if (e.ta_sistolica !== null && e.ta_diastolica !== null)
    vitales.push(`TA ${e.ta_sistolica}/${e.ta_diastolica} mmHg`);
  if (e.frecuencia_cardiaca !== null) vitales.push(`FC ${e.frecuencia_cardiaca} lpm`);
  if (e.peso !== null) vitales.push(`Peso ${e.peso} kg`);
  if (e.talla !== null) vitales.push(`Talla ${e.talla} cm`);
  if (e.imc !== null) vitales.push(`IMC ${e.imc}${claseImc ? ` (${claseImc.etiqueta})` : ""}`);

  const exploracion = EXPLORACION_CAMPOS.filter(
    (c) => (e[c.clave] as string | null)?.toString().trim(),
  );

  const identidad = [
    pacienteCedula ? `Cédula ${pacienteCedula}` : null,
    edad !== null ? `${edad} años` : null,
    sexo,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Card className="overflow-hidden !p-0">
      {/* Encabezado editorial */}
      <div className="border-b border-[var(--borde)] bg-[linear-gradient(120deg,var(--rosa-claro),var(--crema))] px-6 py-6 sm:px-10 sm:py-8">
        <div className="flex items-center gap-2 text-rosa-principal">
          <HeartMark className="h-5 w-5" />
          <span className="font-display text-lg font-semibold">Dra. Reyna Massiel</span>
        </div>
        <p className="mt-0.5 text-sm text-texto-secundario">
          Cardiología · Medicina interna · Ecocardiografía
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-texto-principal sm:text-3xl">
          Evaluación cardiológica formal
        </h1>
        <p className="mt-1 text-sm text-texto-secundario">{formatearFecha(e.fecha)}</p>
      </div>

      <div className="space-y-6 px-6 py-6 sm:px-10 sm:py-8">
        {/* Identidad */}
        <div className="border-b border-[var(--borde)] pb-5">
          <p className="font-display text-xl font-semibold text-texto-principal">
            {pacienteNombre}
          </p>
          {identidad && <p className="mt-0.5 text-sm text-texto-secundario">{identidad}</p>}
        </div>

        {e.motivo && (
          <Bloque titulo="Motivo de la evaluación / referimiento">
            <Parrafo>{e.motivo}</Parrafo>
          </Bloque>
        )}

        {(e.factores_riesgo || e.antecedentes || e.antecedentes_familiares) && (
          <Bloque titulo="Antecedentes relevantes">
            {e.factores_riesgo && (
              <p className="text-texto-principal">
                <span className="text-texto-secundario">Factores de riesgo: </span>
                {e.factores_riesgo}
              </p>
            )}
            {e.antecedentes && (
              <p className="whitespace-pre-line text-texto-principal">
                <span className="text-texto-secundario">Personales: </span>
                {e.antecedentes}
              </p>
            )}
            {e.antecedentes_familiares && (
              <p className="text-texto-principal">
                <span className="text-texto-secundario">Familiares: </span>
                {e.antecedentes_familiares}
              </p>
            )}
          </Bloque>
        )}

        {vitales.length > 0 && (
          <Bloque titulo="Signos vitales y antropometría">
            <div className="flex flex-wrap gap-2">
              {vitales.map((v) => (
                <span
                  key={v}
                  className="rounded-full bg-[var(--superficie-suave)] px-3 py-1 text-sm text-texto-principal"
                >
                  {v}
                </span>
              ))}
            </div>
          </Bloque>
        )}

        {exploracion.length > 0 && (
          <Bloque titulo="Exploración cardiovascular">
            <dl className="grid gap-3 sm:grid-cols-2">
              {exploracion.map((c) => (
                <div key={c.clave}>
                  <dt className="text-xs text-texto-secundario">{c.etiqueta}</dt>
                  <dd className="whitespace-pre-line text-texto-principal">
                    {e[c.clave] as string}
                  </dd>
                </div>
              ))}
            </dl>
          </Bloque>
        )}

        {e.estudios_revisados.length > 0 && (
          <Bloque titulo="Estudios revisados">
            <ul className="space-y-1">
              {e.estudios_revisados.map((s, i) => (
                <li key={i} className="flex items-baseline gap-2 text-texto-principal">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-rosa-principal" />
                  {s.tipo}
                  {s.fecha && (
                    <span className="text-sm text-texto-secundario">
                      · {formatearFecha(s.fecha)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Bloque>
        )}

        {e.impresion_diagnostica && (
          <Bloque titulo="Impresión diagnóstica">
            <Parrafo>{e.impresion_diagnostica}</Parrafo>
          </Bloque>
        )}

        {e.recomendaciones && (
          <Bloque titulo="Recomendaciones y plan">
            <Parrafo>{e.recomendaciones}</Parrafo>
          </Bloque>
        )}

        {r && (
          <Bloque titulo="Estratificación de riesgo cardiovascular">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-semibold"
              style={{ backgroundColor: `${r.color}1e`, color: r.color }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
              Riesgo {r.texto.toLowerCase()}
            </span>
          </Bloque>
        )}

        {e.consentimiento_texto && (
          <Bloque titulo="Consentimiento informado">
            <p className="whitespace-pre-line text-sm italic leading-relaxed text-texto-secundario">
              {e.consentimiento_texto}
            </p>
          </Bloque>
        )}
      </div>
    </Card>
  );
}
