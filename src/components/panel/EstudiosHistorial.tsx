"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";
import { crearEstudio, eliminarEstudio } from "@/app/panel/pacientes/acciones";
import { ETIQUETA_TIPO_ESTUDIO } from "@/lib/cardio";
import { formatearFecha } from "@/lib/formato";
import type { Estudio, TipoEstudio } from "@/types/database";

export interface EstudioConUrl extends Estudio {
  archivo_url: string | null;
}

const TIPOS: { valor: TipoEstudio; texto: string }[] = [
  { valor: "ecocardiograma", texto: "Ecocardiograma" },
  { valor: "electrocardiograma", texto: "Electrocardiograma" },
  { valor: "prueba_esfuerzo", texto: "Prueba de esfuerzo" },
  { valor: "holter_ritmo", texto: "Holter de ritmo" },
  { valor: "holter_presion", texto: "Holter de presión (MAPA)" },
  { valor: "otro", texto: "Otro" },
];

export function EstudiosHistorial({
  pacienteId,
  estudios,
  puedeCrear,
  puedeBorrar,
}: {
  pacienteId: string;
  estudios: EstudioConUrl[];
  puedeCrear: boolean;
  puedeBorrar: boolean;
}) {
  const router = useRouter();
  const [abrir, setAbrir] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);

  async function registrar(formData: FormData) {
    setError(null);
    setCargando(true);
    const res = await crearEstudio(pacienteId, formData);
    setCargando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo registrar el estudio.");
      return;
    }
    setAbrir(false);
    router.refresh();
  }

  async function borrar(id: string) {
    if (!window.confirm("¿Eliminar este estudio y su archivo? No se puede deshacer.")) return;
    setOcupadoId(id);
    const res = await eliminarEstudio(id, pacienteId);
    setOcupadoId(null);
    if (!res.ok) {
      window.alert(res.error ?? "No se pudo eliminar.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-texto-principal">
          Historial de estudios cardiológicos
        </h2>
        {puedeCrear && (
          <Button variante={abrir ? "secundario" : "primario"} onClick={() => setAbrir((v) => !v)}>
            {abrir ? "Cerrar" : "＋ Registrar estudio"}
          </Button>
        )}
      </div>

      {abrir && puedeCrear && (
        <form action={registrar} className="mb-6 animate-scale-in space-y-4 rounded-suave border border-[var(--borde)] bg-[var(--superficie-suave)] p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tipo" className="mb-1.5 block text-sm text-texto-secundario">
                Tipo de estudio <span className="text-estado-urgente">*</span>
              </label>
              <select id="tipo" name="tipo" required className="campo">
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.texto}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fecha_estudio" className="mb-1.5 block text-sm text-texto-secundario">
                Fecha del estudio <span className="text-estado-urgente">*</span>
              </label>
              <input id="fecha_estudio" name="fecha_estudio" type="date" required className="campo" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="hallazgos" className="mb-1.5 block text-sm text-texto-secundario">
                Hallazgos
              </label>
              <textarea id="hallazgos" name="hallazgos" rows={3} className="campo resize-y" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="conclusion" className="mb-1.5 block text-sm text-texto-secundario">
                Conclusión
              </label>
              <textarea id="conclusion" name="conclusion" rows={2} className="campo resize-y" />
            </div>
            <div>
              <label htmlFor="realizado_por" className="mb-1.5 block text-sm text-texto-secundario">
                Realizado por
              </label>
              <input id="realizado_por" name="realizado_por" className="campo" maxLength={120} placeholder="Dra. Reyna Massiel" />
            </div>
            <div>
              <label htmlFor="archivo" className="mb-1.5 block text-sm text-texto-secundario">
                Archivo (PDF o imagen, máx. 15 MB)
              </label>
              <input
                id="archivo"
                name="archivo"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="campo file:mr-3 file:rounded-md file:border-0 file:bg-rosa-pastel file:px-3 file:py-1 file:text-rosa-principal"
              />
            </div>
          </div>
          {error && <Alerta tono="urgente">{error}</Alerta>}
          <Button type="submit" cargando={cargando}>
            Guardar estudio
          </Button>
        </form>
      )}

      {estudios.length === 0 ? (
        <p className="text-sm text-texto-secundario">
          Aún no hay estudios registrados para este paciente.
        </p>
      ) : (
        <ol className="space-y-3">
          {estudios.map((e) => (
            <li
              key={e.id}
              className="rounded-suave border border-[var(--borde)] p-4 transition-colors hover:border-rosa-hover"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-texto-principal">
                    {ETIQUETA_TIPO_ESTUDIO[e.tipo]}
                  </p>
                  <p className="text-xs text-texto-secundario">
                    {formatearFecha(e.fecha_estudio)}
                    {e.realizado_por ? ` · ${e.realizado_por}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {e.archivo_url && (
                    <a
                      href={e.archivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-suave border border-[var(--borde)] px-3 py-1.5 text-xs text-rosa-principal transition-colors hover:border-rosa-hover"
                    >
                      Ver archivo ↗
                    </a>
                  )}
                  {puedeBorrar && (
                    <button
                      type="button"
                      onClick={() => borrar(e.id)}
                      disabled={ocupadoId === e.id}
                      className="rounded-suave border border-[var(--borde)] px-3 py-1.5 text-xs text-texto-secundario transition-colors hover:border-estado-urgente hover:text-estado-urgente disabled:opacity-60"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
              {e.hallazgos && (
                <p className="mt-2 whitespace-pre-line text-sm text-texto-principal">
                  <span className="text-texto-secundario">Hallazgos: </span>
                  {e.hallazgos}
                </p>
              )}
              {e.conclusion && (
                <p className="mt-1 whitespace-pre-line text-sm text-texto-principal">
                  <span className="text-texto-secundario">Conclusión: </span>
                  {e.conclusion}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
