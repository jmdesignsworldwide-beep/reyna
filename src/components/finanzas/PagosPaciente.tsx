"use client";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { BotonEliminar } from "@/components/global/BotonEliminar";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";
import { Modal } from "@/components/ui/Modal";
import { HeartMark } from "@/components/ui/HeartMark";
import { crearPago, eliminarPago } from "@/app/panel/finanzas/acciones";
import {
  formatearRD,
  numeroRecibo,
  TIPOS_PAGO,
  METODOS_PAGO,
  ETIQUETA_METODO,
  ETIQUETA_TIPO_PAGO,
} from "@/lib/finanzas";
import { formatearFecha } from "@/lib/formato";

export interface PagoVista {
  id: string;
  recibo_numero: number;
  fecha: string;
  monto: number;
  tipo: "consulta" | "ecocardiograma" | "electrocardiograma" | "chequeo" | "otro";
  concepto: string | null;
  metodo_pago: "efectivo" | "transferencia" | "tarjeta";
  recibo_url: string | null;
}

export function PagosPaciente({
  pacienteId,
  pacienteNombre,
  pagos,
  puedeCrear,
  puedeBorrar,
}: {
  pacienteId: string;
  pacienteNombre: string;
  pagos: PagoVista[];
  puedeCrear: boolean;
  puedeBorrar: boolean;
}) {
  const router = useRouter();
  const [abrir, setAbrir] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hoy = new Date().toISOString().slice(0, 10);

  async function registrar(formData: FormData) {
    setError(null);
    setCargando(true);
    formData.set("paciente_id", pacienteId);
    const res = await crearPago(formData);
    setCargando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo registrar el pago.");
      return;
    }
    setAbrir(false);
    router.refresh();
  }

  function whatsapp(p: PagoVista) {
    const msg = `Recibo ${numeroRecibo(p.recibo_numero)} — ${pacienteNombre}\nConcepto: ${p.concepto?.trim() || ETIQUETA_TIPO_PAGO[p.tipo]}\nMonto: ${formatearRD(p.monto)}\nFecha: ${formatearFecha(p.fecha)}\nGracias por su confianza — Dra. Reyna Massiel`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-rosa-medio">
            <HeartMark className="h-4 w-4" />
            <span>Pagos</span>
          </div>
          <h2 className="mt-1 font-display text-lg font-semibold text-texto-principal">
            Pagos y recibos
          </h2>
          <p className="text-sm text-texto-secundario">
            {pagos.length} {pagos.length === 1 ? "pago registrado" : "pagos registrados"}
          </p>
        </div>
        {puedeCrear && <Button onClick={() => setAbrir(true)}>＋ Registrar pago</Button>}
      </div>

      {pagos.length === 0 ? (
        <EstadoVacio compacto texto="Aún no hay pagos registrados para este paciente. Registra el primero y genera su recibo." />
      ) : (
        <ul className="space-y-2.5">
          {pagos.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-suave border border-[var(--borde)] p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-texto-principal">
                  {formatearRD(p.monto)}{" "}
                  <span className="text-xs font-normal text-texto-secundario">
                    · {numeroRecibo(p.recibo_numero)}
                  </span>
                </p>
                <p className="text-sm text-texto-secundario">
                  {formatearFecha(p.fecha)} · {p.concepto?.trim() || ETIQUETA_TIPO_PAGO[p.tipo]} ·{" "}
                  {ETIQUETA_METODO[p.metodo_pago]}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {p.recibo_url && (
                  <a
                    href={p.recibo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-suave border border-[var(--borde)] px-3 py-1.5 text-xs text-rosa-principal transition-colors hover:border-rosa-hover"
                  >
                    Recibo ↗
                  </a>
                )}
                <button
                  onClick={() => whatsapp(p)}
                  className="rounded-suave border border-[var(--borde)] px-3 py-1.5 text-xs text-texto-secundario transition-colors hover:border-rosa-hover hover:text-rosa-principal"
                >
                  WhatsApp
                </button>
                {puedeBorrar && (
                  <BotonEliminar onEliminar={() => eliminarPago(p.id, pacienteId)} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal titulo="Registrar pago" abierto={abrir} onClose={() => setAbrir(false)}>
        <form action={registrar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-texto-secundario">
                Fecha <span className="text-estado-urgente">*</span>
              </label>
              <input type="date" name="fecha" defaultValue={hoy} required className="campo" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-texto-secundario">
                Monto (RD$) <span className="text-estado-urgente">*</span>
              </label>
              <input name="monto" inputMode="decimal" required className="campo" placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-texto-secundario">Concepto</label>
              <select name="tipo" className="campo" defaultValue="consulta">
                {TIPOS_PAGO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.texto}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-texto-secundario">Método de pago</label>
              <select name="metodo_pago" className="campo" defaultValue="efectivo">
                {METODOS_PAGO.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.texto}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-texto-secundario">
              Detalle del concepto (opcional)
            </label>
            <input name="concepto" className="campo" maxLength={200} placeholder="Ej.: Consulta de seguimiento" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-texto-secundario">NCF (opcional)</label>
              <input name="ncf" className="campo" maxLength={30} placeholder="Solo si aplica" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-texto-secundario">Notas</label>
              <input name="notas" className="campo" maxLength={500} />
            </div>
          </div>
          <p className="text-xs text-texto-secundario">
            El NCF es opcional y manual. El recibo no tiene valor fiscal salvo que se registre un NCF válido.
          </p>
          {error && <Alerta tono="urgente">{error}</Alerta>}
          <div className="flex gap-2">
            <Button type="submit" cargando={cargando}>
              Registrar y generar recibo
            </Button>
            <Button type="button" variante="fantasma" onClick={() => setAbrir(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
