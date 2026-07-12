"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";

const REGLAS = "Mínimo 10 caracteres, con mayúscula, minúscula y número.";

/** Cambio de contraseña normal: verifica la actual server-side. */
export function FormularioCambioClave() {
  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState<{ t: "exito" | "urgente"; x: string } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (claveNueva !== confirmar) {
      setMsg({ t: "urgente", x: "Las contraseñas nuevas no coinciden." });
      return;
    }
    setCargando(true);
    const res = await fetch("/api/cuenta/clave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave_actual: claveActual, clave_nueva: claveNueva }),
    });
    setCargando(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg({ t: "urgente", x: data.error ?? "No se pudo actualizar." });
      return;
    }
    setMsg({ t: "exito", x: "Contraseña actualizada correctamente." });
    setClaveActual("");
    setClaveNueva("");
    setConfirmar("");
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm text-texto-secundario">
          Contraseña actual
        </label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={claveActual}
          onChange={(e) => setClaveActual(e.target.value)}
          className="campo"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-texto-secundario">
          Contraseña nueva
        </label>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={claveNueva}
          onChange={(e) => setClaveNueva(e.target.value)}
          className="campo"
        />
        <p className="mt-1 text-xs text-texto-secundario">{REGLAS}</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-texto-secundario">
          Confirmar contraseña nueva
        </label>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          className="campo"
        />
      </div>
      {msg && <Alerta tono={msg.t}>{msg.x}</Alerta>}
      <Button type="submit" cargando={cargando}>
        Actualizar contraseña
      </Button>
    </form>
  );
}

/** Flujo de recuperación: la usuaria llega con sesión de recuperación. */
export function FormularioRecuperacion() {
  const router = useRouter();
  const supabase = createClient();
  const [claveNueva, setClaveNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState<{ t: "exito" | "urgente"; x: string } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (claveNueva !== confirmar) {
      setMsg({ t: "urgente", x: "Las contraseñas no coinciden." });
      return;
    }
    if (
      claveNueva.length < 10 ||
      !/[A-Z]/.test(claveNueva) ||
      !/[a-z]/.test(claveNueva) ||
      !/[0-9]/.test(claveNueva)
    ) {
      setMsg({ t: "urgente", x: REGLAS });
      return;
    }
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password: claveNueva });
    setCargando(false);
    if (error) {
      setMsg({ t: "urgente", x: "No se pudo actualizar. El enlace pudo expirar." });
      return;
    }
    setMsg({ t: "exito", x: "Contraseña restablecida. Redirigiendo…" });
    setTimeout(() => {
      router.push("/panel");
      router.refresh();
    }, 1200);
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm text-texto-secundario">
          Contraseña nueva
        </label>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={claveNueva}
          onChange={(e) => setClaveNueva(e.target.value)}
          className="campo"
        />
        <p className="mt-1 text-xs text-texto-secundario">{REGLAS}</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-texto-secundario">
          Confirmar contraseña
        </label>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          className="campo"
        />
      </div>
      {msg && <Alerta tono={msg.t}>{msg.x}</Alerta>}
      <Button type="submit" cargando={cargando}>
        Restablecer contraseña
      </Button>
    </form>
  );
}
