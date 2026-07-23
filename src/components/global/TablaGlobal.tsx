"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { enRango, normaliza } from "@/lib/filtros";

export interface FilaGlobal {
  id: string;
  pacienteId: string;
  pacienteNombre: string;
  cedula: string | null;
  fecha: string; // YYYY-MM-DD
  filtroValor?: string; // valor sobre el que aplica el filtro de tipo/estado
  [clave: string]: unknown;
}

export interface ColumnaGlobal {
  etiqueta: string;
  render: (f: FilaGlobal) => ReactNode;
  /** Columna principal (se muestra grande en móvil). */
  principal?: boolean;
  className?: string;
}

export function TablaGlobal({
  eyebrow,
  titulo,
  filas,
  columnas,
  sustantivo,
  filtroTipo,
  hrefDe,
  accionesDe,
  vacioTexto,
  vacioTitulo,
  vacioAccion,
}: {
  eyebrow: string;
  titulo: string;
  filas: FilaGlobal[];
  columnas: ColumnaGlobal[];
  sustantivo: [string, string]; // [singular, plural]
  filtroTipo?: { etiqueta: string; opciones: { valor: string; texto: string }[] };
  hrefDe?: (f: FilaGlobal) => string | null;
  accionesDe?: (f: FilaGlobal) => ReactNode;
  vacioTexto: string;
  vacioTitulo?: string;
  vacioAccion?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tipo, setTipo] = useState("");

  const filtradas = useMemo(() => {
    const nq = normaliza(q.trim());
    return filas.filter((f) => {
      if (!enRango(f.fecha, desde, hasta)) return false;
      if (tipo && f.filtroValor !== tipo) return false;
      if (nq) {
        const heno = normaliza(`${f.pacienteNombre} ${f.cedula ?? ""}`);
        if (!heno.includes(nq)) return false;
      }
      return true;
    });
  }, [filas, q, desde, hasta, tipo]);

  const conFiltro = Boolean(q || desde || hasta || tipo);
  const n = filtradas.length;

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <div className="flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4" />
          <span>{eyebrow}</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">{titulo}</h1>
        <p className="mt-1 text-texto-secundario">
          {n} {n === 1 ? sustantivo[0] : sustantivo[1]}
          {conFiltro ? " en el filtro" : " en total"}
        </p>
      </header>

      {/* Filtros */}
      <div className="tarjeta flex flex-wrap items-center gap-3 !p-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por paciente o cédula…"
          className="campo !w-auto min-w-[220px] flex-1 !py-2 !text-sm"
          aria-label="Buscar"
        />
        {filtroTipo && (
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="campo !w-auto !py-2 !text-sm"
            aria-label={filtroTipo.etiqueta}
          >
            <option value="">{filtroTipo.etiqueta}: todos</option>
            {filtroTipo.opciones.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="campo !w-auto !py-2 !text-sm"
            aria-label="Desde"
          />
          <span className="text-texto-secundario">—</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="campo !w-auto !py-2 !text-sm"
            aria-label="Hasta"
          />
          {conFiltro && (
            <button
              onClick={() => {
                setQ("");
                setDesde("");
                setHasta("");
                setTipo("");
              }}
              className="rounded-suave border border-[var(--borde)] px-3 py-2 text-sm text-texto-secundario transition-colors hover:border-rosa-hover hover:text-rosa-principal"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {n === 0 ? (
        <Card className="!p-0">
          <EstadoVacio
            titulo={conFiltro ? "Sin resultados" : vacioTitulo ?? "Aún no hay registros"}
            texto={
              conFiltro
                ? "Ningún registro coincide con esos filtros. Ajusta la búsqueda o el período."
                : vacioTexto
            }
            accion={conFiltro ? undefined : vacioAccion}
          />
        </Card>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <Card className="hidden !p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--borde)] text-left">
                    {columnas.map((c) => (
                      <th
                        key={c.etiqueta}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-texto-secundario"
                      >
                        {c.etiqueta}
                      </th>
                    ))}
                    {accionesDe && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((f) => {
                    const href = hrefDe?.(f) ?? null;
                    return (
                      <tr
                        key={f.id}
                        className="border-b border-[var(--borde)] last:border-0 transition-colors hover:bg-[var(--superficie-suave)]"
                      >
                        {columnas.map((c, i) => (
                          <td key={c.etiqueta} className={`px-4 py-3 align-middle ${c.className ?? ""}`}>
                            {href && i === 0 ? (
                              <Link href={href} className="block">
                                {c.render(f)}
                              </Link>
                            ) : (
                              c.render(f)
                            )}
                          </td>
                        ))}
                        {accionesDe && (
                          <td className="px-4 py-3 text-right align-middle">{accionesDe(f)}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Móvil: tarjetas */}
          <div className="space-y-3 md:hidden">
            {filtradas.map((f) => {
              const href = hrefDe?.(f) ?? null;
              const cuerpo = (
                <div className="space-y-1.5">
                  {columnas.map((c) => (
                    <div key={c.etiqueta} className={c.principal ? "" : "flex items-center justify-between gap-3"}>
                      {!c.principal && (
                        <span className="text-xs uppercase tracking-wide text-texto-secundario">{c.etiqueta}</span>
                      )}
                      <span className={c.principal ? "font-medium text-texto-principal" : "text-right"}>
                        {c.render(f)}
                      </span>
                    </div>
                  ))}
                </div>
              );
              return (
                <Card key={f.id} className="!p-4">
                  {href ? <Link href={href}>{cuerpo}</Link> : cuerpo}
                  {accionesDe && <div className="mt-3 flex justify-end">{accionesDe(f)}</div>}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
