"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";
import { actualizarMiPerfil } from "@/app/panel/cuenta/acciones";

export function PerfilForm({
  nombreInicial,
  telefonoInicial,
  correo,
  rolEtiqueta,
}: {
  nombreInicial: string;
  telefonoInicial: string;
  correo: string;
  rolEtiqueta: string;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState<{ t: "exito" | "urgente"; x: string } | null>(null);

  const cambiado = nombre !== nombreInicial || telefono !== telefonoInicial;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setCargando(true);
    const fd = new FormData();
    fd.set("nombre_completo", nombre);
    fd.set("telefono", telefono);
    const res = await actualizarMiPerfil(fd);
    setCargando(false);
    if (!res.ok) {
      setMsg({ t: "urgente", x: res.error ?? "No se pudo guardar." });
      return;
    }
    setMsg({ t: "exito", x: "Perfil actualizado." });
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">
            Nombre completo <span className="text-estado-urgente">*</span>
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="campo"
            maxLength={120}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">
            Teléfono de contacto
          </label>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="campo"
            maxLength={30}
            inputMode="tel"
            placeholder="809-000-0000"
          />
        </div>
      </div>

      {/* Solo lectura */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">Correo</label>
          <p className="rounded-suave border border-[var(--borde)] bg-[var(--superficie-suave)] px-3.5 py-2.5 text-sm text-texto-secundario">
            {correo}
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">Rol</label>
          <p className="rounded-suave border border-[var(--borde)] bg-[var(--superficie-suave)] px-3.5 py-2.5 text-sm font-medium text-rosa-principal">
            {rolEtiqueta}
          </p>
        </div>
      </div>
      <p className="text-xs text-texto-secundario">
        El correo y el rol no se editan aquí. Para cambiar el rol, contacta a una
        administradora.
      </p>

      {msg && <Alerta tono={msg.t}>{msg.x}</Alerta>}

      <Button type="submit" cargando={cargando} disabled={!cambiado}>
        Guardar cambios
      </Button>
    </form>
  );
}
