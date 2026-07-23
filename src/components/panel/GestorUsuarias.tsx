"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";
import { ETIQUETAS_ROL, ROLES } from "@/lib/permissions";
import { formatearFecha } from "@/lib/formato";
import type { UsuariaLista } from "@/app/panel/usuarios/page";
import type { UserRole } from "@/types/database";

export function GestorUsuarias({
  inicial,
  actualId,
  totalAdmins,
}: {
  inicial: UsuariaLista[];
  actualId: string;
  totalAdmins: number;
}) {
  const router = useRouter();
  const [abrirCrear, setAbrirCrear] = useState(false);
  const [ocupadaId, setOcupadaId] = useState<string | null>(null);
  const [confirmarId, setConfirmarId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tono: "exito" | "urgente"; texto: string } | null>(null);

  function notificar(tono: "exito" | "urgente", texto: string) {
    setMensaje({ tono, texto });
    setTimeout(() => setMensaje(null), 5000);
  }

  const esUltimoAdmin = (u: UsuariaLista) =>
    u.rol === "admin" && u.activo && totalAdmins <= 1;

  async function cambiarRol(u: UsuariaLista, rol: UserRole) {
    if (rol === u.rol) return;
    setOcupadaId(u.id);
    const res = await fetch(`/api/admin/usuarias/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rol }),
    });
    setOcupadaId(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notificar("urgente", data.error ?? "No se pudo cambiar el rol.");
      return;
    }
    notificar("exito", `Rol actualizado a ${ETIQUETAS_ROL[rol]}.`);
    router.refresh();
  }

  async function alternarActivo(u: UsuariaLista) {
    setOcupadaId(u.id);
    const res = await fetch(`/api/admin/usuarias/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !u.activo }),
    });
    setOcupadaId(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notificar("urgente", data.error ?? "No se pudo cambiar el estado.");
      return;
    }
    notificar("exito", u.activo ? "Cuenta desactivada." : "Cuenta activada.");
    router.refresh();
  }

  async function eliminar(u: UsuariaLista) {
    setConfirmarId(null);
    setOcupadaId(u.id);
    const res = await fetch(`/api/admin/usuarias/${u.id}`, { method: "DELETE" });
    setOcupadaId(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notificar("urgente", data.error ?? "No se pudo eliminar.");
      return;
    }
    notificar("exito", "Cuenta eliminada.");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {mensaje && <Alerta tono={mensaje.tono}>{mensaje.texto}</Alerta>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-texto-secundario">
          {inicial.length} {inicial.length === 1 ? "cuenta" : "cuentas"}
        </p>
        <Button onClick={() => setAbrirCrear((v) => !v)} variante={abrirCrear ? "secundario" : "primario"}>
          {abrirCrear ? "Cerrar" : "＋ Nueva usuaria"}
        </Button>
      </div>

      {abrirCrear && (
        <FormularioCrear
          onCreada={() => {
            setAbrirCrear(false);
            notificar("exito", "Cuenta creada correctamente.");
            router.refresh();
          }}
          onError={(t) => notificar("urgente", t)}
        />
      )}

      <Card className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--borde)] text-xs uppercase tracking-wide text-texto-secundario">
                <th className="px-5 py-3.5 font-medium">Nombre</th>
                <th className="px-5 py-3.5 font-medium">Correo</th>
                <th className="px-5 py-3.5 font-medium">Rol</th>
                <th className="px-5 py-3.5 font-medium">Estado</th>
                <th className="px-5 py-3.5 font-medium">Alta</th>
                <th className="px-5 py-3.5 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inicial.map((u) => {
                const ocupada = ocupadaId === u.id;
                const protegida = esUltimoAdmin(u);
                return (
                  <tr
                    key={u.id}
                    className="border-b border-[var(--borde)] last:border-0 transition-colors hover:bg-[var(--superficie-suave)]"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-texto-principal">
                        {u.nombre_completo}
                        {u.id === actualId && (
                          <span className="ml-2 text-xs text-rosa-medio">(tú)</span>
                        )}
                      </p>
                      {u.cedula && (
                        <p className="text-xs text-texto-secundario">
                          Cédula: {u.cedula}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-texto-secundario">{u.correo}</td>
                    <td className="px-5 py-3.5">
                      <select
                        value={u.rol}
                        disabled={ocupada || protegida}
                        onChange={(e) => cambiarRol(u, e.target.value as UserRole)}
                        className="campo !py-1.5 !text-sm disabled:opacity-60"
                        title={protegida ? "No se puede cambiar al último administrador activo" : undefined}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ETIQUETAS_ROL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: u.activo ? "#4CAF8218" : "#8A6B7818",
                          color: u.activo ? "#4CAF82" : "#8A6B78",
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: u.activo ? "#4CAF82" : "#8A6B78" }}
                        />
                        {u.activo ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-texto-secundario">
                      {formatearFecha(u.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => alternarActivo(u)}
                          disabled={ocupada || protegida}
                          className="rounded-suave border border-[var(--borde)] px-2.5 py-1.5 text-xs text-texto-secundario transition-colors hover:text-rosa-principal disabled:cursor-not-allowed disabled:opacity-50"
                          title={protegida ? "Protegido: último administrador" : undefined}
                        >
                          {u.activo ? "Desactivar" : "Activar"}
                        </button>
                        {confirmarId === u.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => eliminar(u)}
                              disabled={ocupada}
                              className="rounded-suave px-2.5 py-1.5 text-xs font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-60"
                              style={{ background: "#E0567A" }}
                            >
                              {ocupada ? "…" : "Confirmar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmarId(null)}
                              className="rounded-suave border border-[var(--borde)] px-2.5 py-1.5 text-xs text-texto-secundario"
                            >
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmarId(u.id)}
                            disabled={ocupada || protegida || u.id === actualId}
                            className="rounded-suave border border-[var(--borde)] px-2.5 py-1.5 text-xs text-texto-secundario transition-colors active:scale-[0.98] hover:border-estado-urgente hover:text-estado-urgente disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              u.id === actualId
                                ? "No puedes eliminar tu propia cuenta"
                                : protegida
                                  ? "Protegido: último administrador"
                                  : undefined
                            }
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FormularioCrear({
  onCreada,
  onError,
}: {
  onCreada: () => void;
  onError: (texto: string) => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    nombre_completo: "",
    correo: "",
    cedula: "",
    telefono: "",
    rol: "asistente" as UserRole,
    clave: "",
  });

  function actualizar<K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    const res = await fetch("/api/admin/usuarias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setCargando(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      onError(data.error ?? "No se pudo crear la cuenta.");
      return;
    }
    onCreada();
  }

  return (
    <Card className="animate-scale-in">
      <h2 className="font-display text-lg font-semibold text-texto-principal">
        Nueva usuaria
      </h2>
      <form onSubmit={enviar} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-texto-secundario">
            Nombre completo
          </label>
          <input
            required
            value={form.nombre_completo}
            onChange={(e) => actualizar("nombre_completo", e.target.value)}
            className="campo"
            placeholder="María Fernández"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">
            Correo electrónico
          </label>
          <input
            required
            type="email"
            value={form.correo}
            onChange={(e) => actualizar("correo", e.target.value)}
            className="campo"
            placeholder="maria@consultorio.do"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">Cédula</label>
          <input
            value={form.cedula}
            onChange={(e) => actualizar("cedula", e.target.value)}
            className="campo"
            placeholder="001-0000000-0"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">Teléfono</label>
          <input
            value={form.telefono}
            onChange={(e) => actualizar("telefono", e.target.value)}
            className="campo"
            placeholder="809-000-0000"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">Rol</label>
          <select
            value={form.rol}
            onChange={(e) => actualizar("rol", e.target.value as UserRole)}
            className="campo"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ETIQUETAS_ROL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-texto-secundario">
            Contraseña temporal
          </label>
          <input
            required
            type="text"
            value={form.clave}
            onChange={(e) => actualizar("clave", e.target.value)}
            className="campo"
            placeholder="Mínimo 10 caracteres, con mayúscula, minúscula y número"
          />
          <p className="mt-1 text-xs text-texto-secundario">
            La usuaria podrá cambiarla desde su cuenta al ingresar.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" cargando={cargando}>
            Crear cuenta
          </Button>
        </div>
      </form>
    </Card>
  );
}
