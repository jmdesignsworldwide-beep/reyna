"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { formatearRD } from "@/lib/finanzas";
import { formatearFecha } from "@/lib/formato";

interface Grupo {
  clave: string;
  total: number;
  porcentaje: number;
}
interface Resumen {
  ingresos: number;
  egresos: number;
  balance: number;
  cantidadPagos: number;
  cantidadGastos: number;
}

interface Props {
  desde: string;
  hasta: string;
  actual: Resumen;
  previo: { ingresos: number; egresos: number; balance: number };
  porCategoria: Grupo[];
  porTipo: Grupo[];
  porMetodo: Grupo[];
}

const PALETA = ["#B14A73", "#C25A82", "#E87FA6", "#E8A13C", "#4CAF82", "#8A6B78"];

function claveFecha(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function cambio(actual: number, previo: number): { txt: string; color: string } | null {
  if (previo === 0) return null;
  const pct = Math.round(((actual - previo) / Math.abs(previo)) * 1000) / 10;
  if (pct === 0) return { txt: "sin cambio", color: "var(--texto-secundario)" };
  const subio = pct > 0;
  return {
    txt: `${subio ? "▲" : "▼"} ${Math.abs(pct)}% vs período anterior`,
    color: subio ? "#4CAF82" : "#E0567A",
  };
}

export function PanelFinanzas({
  desde,
  hasta,
  actual,
  previo,
  porCategoria,
  porTipo,
  porMetodo,
}: Props) {
  const router = useRouter();
  const [d1, setD1] = useState(desde);
  const [d2, setD2] = useState(hasta);

  function ir(nuevoDesde: string, nuevoHasta: string) {
    router.push(`/panel/finanzas?desde=${nuevoDesde}&hasta=${nuevoHasta}`);
  }
  function preset(tipo: "hoy" | "semana" | "mes" | "mes_anterior") {
    const hoy = new Date();
    if (tipo === "hoy") return ir(claveFecha(hoy), claveFecha(hoy));
    if (tipo === "semana") {
      const ini = new Date(hoy);
      const dia = ini.getDay();
      ini.setDate(ini.getDate() - (dia === 0 ? 6 : dia - 1));
      return ir(claveFecha(ini), claveFecha(hoy));
    }
    if (tipo === "mes") {
      const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return ir(claveFecha(ini), claveFecha(hoy));
    }
    const ini = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    return ir(claveFecha(ini), claveFecha(fin));
  }

  const cIngresos = cambio(actual.ingresos, previo.ingresos);
  const cEgresos = cambio(actual.egresos, previo.egresos);
  const maxIE = Math.max(actual.ingresos, actual.egresos, 1);
  const mayorGasto = porCategoria[0] ?? null;

  const tarjetas = [
    { et: "Ingresos", val: actual.ingresos, color: "#4CAF82", sub: `${actual.cantidadPagos} pagos`, cmb: cIngresos },
    { et: "Egresos", val: actual.egresos, color: "#E0567A", sub: `${actual.cantidadGastos} gastos`, cmb: cEgresos },
    {
      et: "Balance",
      val: actual.balance,
      color: actual.balance >= 0 ? "#B14A73" : "#E0567A",
      sub: actual.balance >= 0 ? "a favor" : "en rojo",
      cmb: null,
    },
    {
      et: "Mayor gasto",
      val: mayorGasto?.total ?? 0,
      color: "#E8A13C",
      sub: mayorGasto?.clave ?? "—",
      cmb: null,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-rosa-medio">
            <HeartMark className="h-4 w-4" />
            <span>Finanzas</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">
            Panel financiero
          </h1>
          <p className="mt-1 text-texto-secundario">
            {formatearFecha(desde)} — {formatearFecha(hasta)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/panel/finanzas/gastos"
            className="rounded-suave border border-[var(--borde)] px-4 py-2.5 text-sm font-medium text-rosa-principal transition-colors hover:border-rosa-hover"
          >
            Gastos
          </Link>
          <Link
            href="/panel/finanzas/cierre"
            className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
          >
            Cierre de día
          </Link>
        </div>
      </header>

      {/* Filtro de período */}
      <div className="tarjeta flex flex-wrap items-center gap-3 !p-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { k: "hoy", t: "Hoy" },
            { k: "semana", t: "Semana" },
            { k: "mes", t: "Este mes" },
            { k: "mes_anterior", t: "Mes anterior" },
          ].map((p) => (
            <button
              key={p.k}
              onClick={() => preset(p.k as "hoy" | "semana" | "mes" | "mes_anterior")}
              className="rounded-suave border border-[var(--borde)] px-3 py-1.5 text-sm text-texto-secundario transition-colors hover:border-rosa-hover hover:text-rosa-principal"
            >
              {p.t}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input type="date" value={d1} onChange={(e) => setD1(e.target.value)} className="campo !w-auto !py-1.5 !text-sm" aria-label="Desde" />
          <span className="text-texto-secundario">—</span>
          <input type="date" value={d2} onChange={(e) => setD2(e.target.value)} className="campo !w-auto !py-1.5 !text-sm" aria-label="Hasta" />
          <button
            onClick={() => d1 && d2 && ir(d1, d2)}
            className="rounded-suave bg-rosa-pastel px-3 py-1.5 text-sm font-medium text-rosa-principal transition-colors hover:brightness-95"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* Tarjetas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((t, i) => (
          <motion.div
            key={t.et}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="!p-5">
              <p className="text-xs uppercase tracking-wide text-texto-secundario">{t.et}</p>
              <p className="mt-1 font-display text-2xl font-semibold" style={{ color: t.color }}>
                {formatearRD(t.val)}
              </p>
              <p className="mt-0.5 truncate text-xs text-texto-secundario">{t.sub}</p>
              {t.cmb && (
                <p className="mt-1.5 text-xs font-medium" style={{ color: t.cmb.color }}>
                  {t.cmb.txt}
                </p>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Ingresos vs egresos + exportar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-texto-principal">
              Ingresos vs egresos
            </h2>
            <div className="flex gap-2 text-xs">
              <a
                href={`/api/finanzas/export?formato=csv&desde=${desde}&hasta=${hasta}`}
                className="rounded-suave border border-[var(--borde)] px-2.5 py-1 text-texto-secundario transition-colors hover:border-rosa-hover hover:text-rosa-principal"
              >
                Excel (CSV)
              </a>
              <a
                href={`/api/finanzas/export?formato=pdf&desde=${desde}&hasta=${hasta}`}
                className="rounded-suave border border-[var(--borde)] px-2.5 py-1 text-texto-secundario transition-colors hover:border-rosa-hover hover:text-rosa-principal"
              >
                PDF
              </a>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { et: "Ingresos", val: actual.ingresos, color: "#4CAF82" },
              { et: "Egresos", val: actual.egresos, color: "#E0567A" },
            ].map((b, i) => (
              <div key={b.et}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-texto-principal">{b.et}</span>
                  <span className="font-medium text-texto-principal">{formatearRD(b.val)}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--superficie-suave)]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${b.color}, ${b.color}bb)` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(b.val / maxIE) * 100}%` }}
                    transition={{ duration: 0.9, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
            <div className="border-t border-[var(--borde)] pt-3 text-sm">
              <span className="text-texto-secundario">Balance del período: </span>
              <span className="font-semibold" style={{ color: actual.balance >= 0 ? "#4CAF82" : "#E0567A" }}>
                {formatearRD(actual.balance)}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
            Gastos por categoría
          </h2>
          <DistribucionBarras grupos={porCategoria} />
        </Card>
      </div>

      {/* Ingresos por tipo y método */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
            Ingresos por concepto
          </h2>
          <DistribucionBarras grupos={porTipo} />
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">
            Ingresos por método de pago
          </h2>
          <DistribucionBarras grupos={porMetodo} />
        </Card>
      </div>
    </div>
  );
}

function DistribucionBarras({ grupos }: { grupos: Grupo[] }) {
  if (grupos.length === 0) {
    return <p className="py-6 text-center text-sm text-texto-secundario">Sin datos en el período.</p>;
  }
  const max = Math.max(...grupos.map((g) => g.total), 1);
  return (
    <ul className="space-y-3">
      {grupos.map((g, i) => {
        const color = PALETA[i % PALETA.length];
        return (
          <li key={g.clave}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-texto-principal">{g.clave}</span>
              <span className="font-medium text-texto-principal">
                {formatearRD(g.total)}{" "}
                <span className="text-xs text-texto-secundario">· {g.porcentaje}%</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--superficie-suave)]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
                initial={{ width: 0 }}
                animate={{ width: `${(g.total / max) * 100}%` }}
                transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
