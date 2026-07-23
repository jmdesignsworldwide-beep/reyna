"use client";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { BotonEliminar } from "@/components/global/BotonEliminar";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";
import { Modal } from "@/components/ui/Modal";
import {
  crearGasto,
  eliminarGasto,
  crearCategoria,
  archivarCategoria,
} from "@/app/panel/finanzas/acciones";
import { formatearRD, METODOS_PAGO, ETIQUETA_METODO } from "@/lib/finanzas";
import { formatearFecha } from "@/lib/formato";
import type { CategoriaGasto } from "@/types/database";

export interface GastoVista {
  id: string;
  fecha: string;
  monto: number;
  categoria: string | null;
  metodo_pago: "efectivo" | "transferencia" | "tarjeta";
  nota: string | null;
  comprobante_url: string | null;
}

export function GestorGastos({
  gastos,
  categorias,
}: {
  gastos: GastoVista[];
  categorias: CategoriaGasto[];
}) {
  const router = useRouter();
  const [abrir, setAbrir] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gestionCat, setGestionCat] = useState(false);
  const [nuevaCat, setNuevaCat] = useState("");

  const hoy = new Date().toISOString().slice(0, 10);
  const activas = categorias.filter((c) => c.activo);

  async function registrar(formData: FormData) {
    setError(null);
    setCargando(true);
    const res = await crearGasto(formData);
    setCargando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo registrar el gasto.");
      return;
    }
    setAbrir(false);
    router.refresh();
  }

  async function agregarCat() {
    if (nuevaCat.trim().length < 2) return;
    const res = await crearCategoria(nuevaCat.trim());
    if (!res.ok) {
      setError(res.error ?? "No se pudo crear la categoría.");
      return;
    }
    setNuevaCat("");
    router.refresh();
  }

  async function alternarCat(id: string, activo: boolean) {
    const res = await archivarCategoria(id, activo);
    if (!res.ok) setError(res.error ?? "No se pudo actualizar la categoría.");
    else router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button onClick={() => setAbrir(true)}>＋ Agregar gasto</Button>
          <Button variante="secundario" onClick={() => setGestionCat((v) => !v)}>
            Categorías
          </Button>
        </div>
      </div>

      {gestionCat && (
        <Card className="mb-4">
          <h3 className="mb-3 font-display text-base font-semibold text-texto-principal">
            Categorías de gasto
          </h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {categorias.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                style={{
                  borderColor: c.activo ? "var(--rosa-hover)" : "var(--borde)",
                  color: c.activo ? "var(--texto-principal)" : "var(--texto-secundario)",
                  opacity: c.activo ? 1 : 0.6,
                }}
              >
                {c.nombre}
                <button
                  onClick={() => alternarCat(c.id, !c.activo)}
                  className="text-xs text-texto-secundario hover:text-rosa-principal"
                  title={c.activo ? "Archivar" : "Reactivar"}
                >
                  {c.activo ? "✕" : "↺"}
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={nuevaCat}
              onChange={(e) => setNuevaCat(e.target.value)}
              placeholder="Nueva categoría"
              className="campo !py-1.5 !text-sm"
              maxLength={60}
            />
            <Button variante="secundario" onClick={agregarCat}>
              Agregar
            </Button>
          </div>
          {error && (
            <div className="mt-3">
              <Alerta tono="urgente">{error}</Alerta>
            </div>
          )}
        </Card>
      )}

      {gastos.length === 0 ? (
        <Card>
          <EstadoVacio compacto texto="Aún no hay gastos registrados en el consultorio. Anota el primero para llevar el control." />
        </Card>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <Card className="hidden overflow-hidden !p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--borde)] text-xs uppercase tracking-wide text-texto-secundario">
                    <th className="px-5 py-3.5 font-medium">Fecha</th>
                    <th className="px-5 py-3.5 font-medium">Categoría</th>
                    <th className="px-5 py-3.5 font-medium">Método</th>
                    <th className="px-5 py-3.5 font-medium text-right">Monto</th>
                    <th className="px-5 py-3.5 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((g) => (
                    <tr key={g.id} className="border-b border-[var(--borde)] last:border-0 hover:bg-[var(--superficie-suave)]">
                      <td className="px-5 py-3 text-texto-secundario">{formatearFecha(g.fecha)}</td>
                      <td className="px-5 py-3">
                        <span className="text-texto-principal">{g.categoria ?? "Sin categoría"}</span>
                        {g.nota && <span className="block text-xs text-texto-secundario">{g.nota}</span>}
                      </td>
                      <td className="px-5 py-3 text-texto-secundario">{ETIQUETA_METODO[g.metodo_pago]}</td>
                      <td className="px-5 py-3 text-right font-medium text-texto-principal">
                        {formatearRD(g.monto)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {g.comprobante_url && (
                            <a
                              href={g.comprobante_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-rosa-principal hover:text-rosa-hover"
                            >
                              Comprobante ↗
                            </a>
                          )}
                          <BotonEliminar onEliminar={() => eliminarGasto(g.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Móvil: tarjetas apiladas */}
          <div className="space-y-3 md:hidden">
            {gastos.map((g) => (
              <Card key={g.id} className="!p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-texto-principal">{g.categoria ?? "Sin categoría"}</p>
                    {g.nota && <p className="text-xs text-texto-secundario">{g.nota}</p>}
                  </div>
                  <p className="flex-none font-display text-lg font-semibold text-texto-principal">
                    {formatearRD(g.monto)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-texto-secundario">
                  <span>{formatearFecha(g.fecha)} · {ETIQUETA_METODO[g.metodo_pago]}</span>
                </div>
                <div className="mt-3 flex items-center justify-end gap-3">
                  {g.comprobante_url && (
                    <a
                      href={g.comprobante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-rosa-principal hover:text-rosa-hover"
                    >
                      Comprobante ↗
                    </a>
                  )}
                  <BotonEliminar onEliminar={() => eliminarGasto(g.id)} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal titulo="Registrar gasto" abierto={abrir} onClose={() => setAbrir(false)}>
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
              <label className="mb-1.5 block text-sm text-texto-secundario">Categoría</label>
              <select name="categoria_id" className="campo" defaultValue="">
                <option value="">Sin categoría</option>
                {activas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
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
            <label className="mb-1.5 block text-sm text-texto-secundario">Nota</label>
            <input name="nota" className="campo" maxLength={500} placeholder="Descripción del gasto" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-texto-secundario">
              Comprobante (PDF o imagen, opcional)
            </label>
            <input
              type="file"
              name="comprobante"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="campo file:mr-3 file:rounded-md file:border-0 file:bg-rosa-pastel file:px-3 file:py-1 file:text-rosa-principal"
            />
          </div>
          {error && <Alerta tono="urgente">{error}</Alerta>}
          <div className="flex gap-2">
            <Button type="submit" cargando={cargando}>
              Guardar gasto
            </Button>
            <Button type="button" variante="fantasma" onClick={() => setAbrir(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
