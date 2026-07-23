import type { Metadata } from "next";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import Link from "next/link";
import { requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import {
  resumen,
  agrupar,
  formatearRD,
  ETIQUETA_TIPO_PAGO,
  ETIQUETA_METODO,
} from "@/lib/finanzas";
import { formatearFecha } from "@/lib/formato";
import type { Pago, Cita } from "@/types/database";

export const metadata: Metadata = { title: "Cierre de día" };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function clave(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sumarDias(iso: string, n: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(a!, (m ?? 1) - 1, d ?? 1);
  f.setDate(f.getDate() + n);
  return clave(f);
}

export default async function CierrePage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  await requerirRol("admin");
  const sp = await searchParams;
  const hoy = clave(new Date());
  const fecha = FECHA.test(sp.fecha ?? "") ? sp.fecha! : hoy;

  const supabase = await createClient();
  const [{ data: pagosRaw }, { data: citasRaw }] = await Promise.all([
    supabase
      .from("pagos")
      .select("monto, tipo, metodo_pago")
      .eq("fecha", fecha),
    supabase.from("citas").select("estado").eq("fecha", fecha),
  ]);

  const pagos = (pagosRaw as Pick<Pago, "monto" | "tipo" | "metodo_pago">[] | null) ?? [];
  const citas = (citasRaw as Pick<Cita, "estado">[] | null) ?? [];

  const r = resumen(pagos, []);
  const porTipo = agrupar(pagos, (p) => ETIQUETA_TIPO_PAGO[p.tipo], (p) => p.monto);
  const porMetodo = agrupar(pagos, (p) => ETIQUETA_METODO[p.metodo_pago], (p) => p.monto);

  const cuenta = (e: string) => citas.filter((c) => c.estado === e).length;
  const atendidas = cuenta("atendida");
  const canceladas = cuenta("cancelada");
  const noShow = cuenta("no_show");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/panel/finanzas" className="text-sm text-texto-secundario hover:text-rosa-principal">
            ← Panel financiero
          </Link>
          <div className="mt-2 flex items-center gap-2 text-sm text-rosa-medio">
            <HeartMark className="h-4 w-4" />
            <span>Cierre de día</span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold capitalize text-texto-principal">
            {formatearFecha(fecha)}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/panel/finanzas/cierre?fecha=${sumarDias(fecha, -1)}`}
            className="flex h-8 w-8 items-center justify-center rounded-suave border border-[var(--borde)] text-texto-secundario hover:text-rosa-principal"
            aria-label="Día anterior"
          >
            ‹
          </Link>
          <Link
            href="/panel/finanzas/cierre"
            className="rounded-suave border border-[var(--borde)] px-3 py-1.5 text-sm text-texto-secundario hover:text-rosa-principal"
          >
            Hoy
          </Link>
          <Link
            href={`/panel/finanzas/cierre?fecha=${sumarDias(fecha, 1)}`}
            className="flex h-8 w-8 items-center justify-center rounded-suave border border-[var(--borde)] text-texto-secundario hover:text-rosa-principal"
            aria-label="Día siguiente"
          >
            ›
          </Link>
        </div>
      </header>

      {/* Hero: total del día */}
      <Card className="overflow-hidden !p-0">
        <div className="bg-[linear-gradient(120deg,var(--rosa-claro),var(--crema))] px-6 py-8 text-center sm:py-10">
          <p className="text-sm uppercase tracking-[0.2em] text-rosa-medio">Ingresos del día</p>
          <p className="mt-2 font-display text-4xl font-semibold text-rosa-principal sm:text-5xl">
            {formatearRD(r.ingresos)}
          </p>
          <p className="mt-1 text-sm text-texto-secundario">
            {r.cantidadPagos} {r.cantidadPagos === 1 ? "pago recibido" : "pagos recibidos"}
          </p>
        </div>
      </Card>

      {/* Citas del día */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { et: "Atendidas", val: atendidas, color: "#4CAF82" },
          { et: "Total citas", val: citas.length, color: "#B14A73" },
          { et: "Canceladas", val: canceladas, color: "#E0567A" },
          { et: "No asistió", val: noShow, color: "#E8A13C" },
        ].map((c) => (
          <Card key={c.et} className="!p-4 text-center">
            <p className="font-display text-3xl font-semibold" style={{ color: c.color }}>
              {c.val}
            </p>
            <p className="mt-0.5 text-xs uppercase tracking-wide text-texto-secundario">{c.et}</p>
          </Card>
        ))}
      </div>

      {/* Desglose */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold text-texto-principal">
            Ingresos por concepto
          </h2>
          {porTipo.length === 0 ? (
            <EstadoVacio compacto texto="Sin pagos registrados hoy. Los cobros del día aparecerán aquí." />
          ) : (
            <ul className="space-y-2">
              {porTipo.map((t) => (
                <li key={t.clave} className="flex items-center justify-between text-sm">
                  <span className="text-texto-principal">{t.clave}</span>
                  <span className="font-medium text-texto-principal">{formatearRD(t.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold text-texto-principal">
            Ingresos por método
          </h2>
          {porMetodo.length === 0 ? (
            <EstadoVacio compacto texto="Sin pagos registrados hoy. Los cobros del día aparecerán aquí." />
          ) : (
            <ul className="space-y-2">
              {porMetodo.map((m) => (
                <li key={m.clave} className="flex items-center justify-between text-sm">
                  <span className="text-texto-principal">{m.clave}</span>
                  <span className="font-medium text-texto-principal">{formatearRD(m.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-center text-sm text-texto-secundario">
        Cierre del {formatearFecha(fecha)} · Que tengas un merecido descanso. ♥
      </p>
    </div>
  );
}
