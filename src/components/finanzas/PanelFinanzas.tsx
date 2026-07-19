"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { GraficaEvolucion, type PuntoMes } from "@/components/finanzas/GraficaEvolucion";
import { formatearRD, type Crecimiento } from "@/lib/finanzas";
import { formatearFecha } from "@/lib/formato";

interface Grupo {
  clave: string;
  total: number;
  porcentaje: number;
}

interface Props {
  desde: string;
  hasta: string;
  kpi: {
    ingresos: number;
    egresos: number;
    balance: number;
    margen: number;
    ticket: number;
    cantidadPagos: number;
    cantidadGastos: number;
    pacientes: number;
  };
  crec: {
    ingresos: Crecimiento;
    egresos: Crecimiento;
    balance: Crecimiento;
    margen: Crecimiento;
    pacientes: Crecimiento;
  };
  resumenEjecutivo: string[];
  porTipo: Grupo[];
  porSede: Grupo[];
  porMetodo: Grupo[];
  porCategoria: Grupo[];
  serieMensual: PuntoMes[];
  haySerie: boolean;
  proyeccion: { ingresos: number; egresos: number; diaActual: number; diasDelMes: number } | null;
  analisis: {
    mejorDia: { fecha: string; total: number } | null;
    peorDia: { fecha: string; total: number } | null;
    mayorGasto: { monto: number; categoria: string; fecha: string } | null;
  };
  alertas: { tono: "bien" | "aviso" | "peligro" | "info"; texto: string }[];
}

const PALETA = ["#B14A73", "#C25A82", "#E87FA6", "#E8A13C", "#4CAF82", "#6C8CD5", "#8A6B78"];

const TONO: Record<string, { color: string; icono: string }> = {
  bien: { color: "#4CAF82", icono: "▲" },
  aviso: { color: "#E8A13C", icono: "!" },
  peligro: { color: "#E0567A", icono: "!" },
  info: { color: "#B14A73", icono: "♥" },
};

function claveFecha(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PanelFinanzas({
  desde,
  hasta,
  kpi,
  crec,
  resumenEjecutivo,
  porTipo,
  porSede,
  porMetodo,
  porCategoria,
  serieMensual,
  haySerie,
  proyeccion,
  analisis,
  alertas,
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

  const vacioTotal = kpi.cantidadPagos === 0 && kpi.cantidadGastos === 0;
  const proyBalance = proyeccion ? Math.round((proyeccion.ingresos - proyeccion.egresos) * 100) / 100 : 0;

  const kpis: {
    et: string;
    val: string;
    color: string;
    sub: string;
    cmb: Crecimiento | null;
    invertido?: boolean;
  }[] = [
    { et: "Ingresos", val: formatearRD(kpi.ingresos), color: "#4CAF82", sub: `${kpi.cantidadPagos} ${kpi.cantidadPagos === 1 ? "pago" : "pagos"}`, cmb: crec.ingresos },
    { et: "Egresos", val: formatearRD(kpi.egresos), color: "#E0567A", sub: `${kpi.cantidadGastos} ${kpi.cantidadGastos === 1 ? "gasto" : "gastos"}`, cmb: crec.egresos, invertido: true },
    { et: "Balance", val: formatearRD(kpi.balance), color: kpi.balance >= 0 ? "#B14A73" : "#E0567A", sub: kpi.balance >= 0 ? "a favor" : "en rojo", cmb: crec.balance },
    { et: "Margen", val: `${kpi.margen}%`, color: "#C25A82", sub: "de ganancia", cmb: crec.margen },
    { et: "Ticket promedio", val: formatearRD(kpi.ticket), color: "#E8A13C", sub: "por paciente", cmb: null },
    { et: "Pacientes", val: String(kpi.pacientes), color: "#6C8CD5", sub: "atendidos", cmb: crec.pacientes },
  ];

  return (
    <div className="space-y-6">
      {/* ---- Encabezado ---- */}
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
          <a
            href={`/api/finanzas/export?formato=csv&desde=${desde}&hasta=${hasta}`}
            className="rounded-suave border border-[var(--borde)] px-3.5 py-2.5 text-sm font-medium text-texto-secundario transition-colors hover:border-rosa-hover hover:text-rosa-principal"
          >
            Excel
          </a>
          <a
            href={`/api/finanzas/export?formato=pdf&desde=${desde}&hasta=${hasta}`}
            className="rounded-suave border border-[var(--borde)] px-3.5 py-2.5 text-sm font-medium text-texto-secundario transition-colors hover:border-rosa-hover hover:text-rosa-principal"
          >
            PDF
          </a>
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

      {/* ---- Filtro de período ---- */}
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

      {vacioTotal ? (
        <EstadoVacioHero />
      ) : (
        <>
          {/* ---- BLOQUE 1 · Resumen ejecutivo + KPIs ---- */}
          {resumenEjecutivo.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card className="relative overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
                  style={{ background: "var(--aurora-1)" }}
                />
                <div className="relative">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--tarjeta)]">
                      <HeartMark className="h-4 w-4 animate-heart-pulse" />
                    </span>
                    <h2 className="font-display text-xl font-semibold text-texto-principal">Cómo va tu negocio</h2>
                  </div>
                  <ul className="space-y-1.5">
                    {resumenEjecutivo.map((f, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-relaxed text-texto-principal">
                        <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-rosa-hover" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </motion.div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((t, i) => (
              <motion.div key={t.et} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="!p-5">
                  <p className="text-xs uppercase tracking-wide text-texto-secundario">{t.et}</p>
                  <p className="mt-1 font-display text-2xl font-semibold" style={{ color: t.color }}>
                    {t.val}
                  </p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-texto-secundario">{t.sub}</p>
                    {t.cmb && <Cambio c={t.cmb} invertido={t.invertido} />}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ---- BLOQUE 2 · Evolución + proyección ---- */}
          <Card className="animate-fade-up">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-texto-principal">
                Evolución de los últimos 12 meses
              </h2>
              <span className="text-xs text-texto-secundario">Ingresos · Egresos · Margen</span>
            </div>
            {haySerie ? (
              <GraficaEvolucion datos={serieMensual} />
            ) : (
              <EstadoVacio texto="Aquí verás la tendencia de tu negocio a medida que registres pagos y gastos." />
            )}
            {proyeccion && (
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-suave border border-[var(--borde)] bg-[var(--superficie-suave)] p-3.5 text-sm">
                <span className="font-medium text-rosa-principal">Proyección del mes ·</span>
                <span className="text-texto-principal">
                  al ritmo actual cerrarías con <strong>{formatearRD(proyeccion.ingresos)}</strong> en ingresos y{" "}
                  <strong>{formatearRD(proyeccion.egresos)}</strong> en gastos
                  {" "}(balance <strong style={{ color: proyBalance >= 0 ? "#4CAF82" : "#E0567A" }}>{formatearRD(proyBalance)}</strong>).
                </span>
                <span className="w-full text-xs text-texto-secundario">
                  Estimado según los primeros {proyeccion.diaActual} de {proyeccion.diasDelMes} días del mes.
                </span>
              </div>
            )}
          </Card>

          {/* ---- BLOQUE 3 · Desgloses ---- */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Ingresos por servicio</h2>
              <Distribucion grupos={porTipo} vacio="Aún no hay ingresos por servicio." />
            </Card>
            <Card>
              <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Ingresos por sede</h2>
              <Distribucion grupos={porSede} vacio="Aún no hay ingresos por sede." />
            </Card>
            <Card>
              <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Ingresos por método de pago</h2>
              <Distribucion grupos={porMetodo} vacio="Aún no hay pagos registrados." />
            </Card>
            <Card>
              <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Gastos por categoría</h2>
              <Distribucion grupos={porCategoria} vacio="Aún no hay gastos registrados." />
            </Card>
          </div>

          {/* ---- BLOQUE 4 · Análisis + alertas ---- */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-1">
              <Mini
                titulo="Mejor día"
                valor={analisis.mejorDia ? formatearRD(analisis.mejorDia.total) : "—"}
                detalle={analisis.mejorDia ? formatearFecha(analisis.mejorDia.fecha) : "Sin datos aún"}
                color="#4CAF82"
              />
              <Mini
                titulo="Día más flojo"
                valor={analisis.peorDia ? formatearRD(analisis.peorDia.total) : "—"}
                detalle={analisis.peorDia ? formatearFecha(analisis.peorDia.fecha) : "Se necesita más de un día"}
                color="#E8A13C"
              />
              <Mini
                titulo="Mayor gasto"
                valor={analisis.mayorGasto ? formatearRD(analisis.mayorGasto.monto) : "—"}
                detalle={analisis.mayorGasto ? `${analisis.mayorGasto.categoria} · ${formatearFecha(analisis.mayorGasto.fecha)}` : "Sin gastos aún"}
                color="#E0567A"
              />
            </div>

            <Card className="lg:col-span-1">
              <h2 className="mb-4 font-display text-lg font-semibold text-texto-principal">Alertas inteligentes</h2>
              {alertas.length === 0 ? (
                <EstadoVacio texto="Todo en orden. Las alertas aparecerán cuando haya algo que destacar." />
              ) : (
                <ul className="space-y-3">
                  {alertas.map((a, i) => {
                    const t = TONO[a.tono]!;
                    return (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-suave border p-3"
                        style={{ borderColor: `${t.color}44`, backgroundColor: `${t.color}12` }}
                      >
                        <span
                          className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: t.color }}
                        >
                          {t.icono}
                        </span>
                        <span className="text-sm leading-relaxed text-texto-principal">{a.texto}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Cambio({ c, invertido }: { c: Crecimiento; invertido?: boolean }) {
  if (c.estado === "na") return null;
  if (c.estado === "nuevo")
    return <span className="flex-none text-xs font-medium text-rosa-principal">nuevo</span>;
  if (c.estado === "igual")
    return <span className="flex-none text-xs text-texto-secundario">sin cambio</span>;
  const subio = c.estado === "sube";
  // Para egresos, subir es "malo" → invertimos el color.
  const bueno = invertido ? !subio : subio;
  const color = bueno ? "#4CAF82" : "#E0567A";
  return (
    <span className="flex-none text-xs font-semibold" style={{ color }}>
      {subio ? "▲" : "▼"} {c.pct}%
    </span>
  );
}

function Distribucion({ grupos, vacio }: { grupos: Grupo[]; vacio: string }) {
  if (grupos.length === 0) return <EstadoVacio texto={vacio} />;
  const max = Math.max(...grupos.map((g) => g.total), 1);
  return (
    <ul className="space-y-3">
      {grupos.map((g, i) => {
        const color = PALETA[i % PALETA.length];
        return (
          <li key={g.clave}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="truncate text-texto-principal">{g.clave}</span>
              <span className="flex-none font-medium text-texto-principal">
                {formatearRD(g.total)} <span className="text-xs text-texto-secundario">· {g.porcentaje}%</span>
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

function Mini({ titulo, valor, detalle, color }: { titulo: string; valor: string; detalle: string; color: string }) {
  return (
    <Card className="!p-5">
      <p className="text-xs uppercase tracking-wide text-texto-secundario">{titulo}</p>
      <p className="mt-1 font-display text-xl font-semibold" style={{ color }}>
        {valor}
      </p>
      <p className="mt-0.5 truncate text-xs text-texto-secundario">{detalle}</p>
    </Card>
  );
}

function EstadoVacio({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <HeartMark className="h-7 w-7 opacity-50" />
      <p className="max-w-xs text-sm text-texto-secundario">{texto}</p>
    </div>
  );
}

function EstadoVacioHero() {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="relative overflow-hidden !p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: "var(--aurora-1)" }}
        />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--tarjeta)]">
            <HeartMark className="h-8 w-8 animate-heart-pulse" />
          </span>
          <h2 className="font-display text-2xl font-semibold text-texto-principal">
            Aún no hay movimientos en este período
          </h2>
          <p className="max-w-md text-texto-secundario">
            Registra el primer pago desde la ficha de un paciente o anota un gasto del consultorio.
            En cuanto tengas datos, aquí verás tu resumen ejecutivo, tendencias y análisis del negocio.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Link
              href="/panel/pacientes"
              className="rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
            >
              Registrar un pago
            </Link>
            <Link
              href="/panel/finanzas/gastos"
              className="rounded-suave border border-[var(--borde)] px-4 py-2.5 text-sm font-medium text-rosa-principal transition-colors hover:border-rosa-hover"
            >
              Anotar un gasto
            </Link>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
