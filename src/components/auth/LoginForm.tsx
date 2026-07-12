"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";

type Modo = "acceso" | "recuperar";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [modo, setModo] = useState<Modo>("acceso");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function acceder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    });

    if (error) {
      setError("Correo o contraseña incorrectos. Verifica e intenta de nuevo.");
      setCargando(false);
      return;
    }

    const destino = params.get("redirigir") ?? "/panel";
    router.push(destino);
    router.refresh();
  }

  async function recuperar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);

    const origen = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: `${origen}/auth/callback?next=${encodeURIComponent(
        "/panel/cuenta?recuperar=1",
      )}`,
    });

    // No revelamos si el correo existe (anti-enumeración de cuentas).
    setAviso(
      "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
    );
    setCargando(false);
    if (error) console.error(error);
  }

  return (
    <div className="w-full">
      {modo === "acceso" ? (
        <form onSubmit={acceder} className="space-y-4">
          <div>
            <label htmlFor="correo" className="mb-1.5 block text-sm text-texto-secundario">
              Correo electrónico
            </label>
            <input
              id="correo"
              type="email"
              autoComplete="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="campo"
              placeholder="doctora@consultorio.do"
            />
          </div>

          <div>
            <label htmlFor="clave" className="mb-1.5 block text-sm text-texto-secundario">
              Contraseña
            </label>
            <input
              id="clave"
              type="password"
              autoComplete="current-password"
              required
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              className="campo"
              placeholder="••••••••"
            />
          </div>

          {error && <Alerta tono="urgente">{error}</Alerta>}

          <Button type="submit" cargando={cargando} className="w-full">
            Entrar
          </Button>

          <button
            type="button"
            onClick={() => {
              setModo("recuperar");
              setError(null);
            }}
            className="block w-full text-center text-sm text-texto-secundario transition-colors hover:text-rosa-principal"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      ) : (
        <form onSubmit={recuperar} className="space-y-4">
          <p className="text-sm text-texto-secundario">
            Escribe tu correo y te enviaremos un enlace para restablecer la
            contraseña.
          </p>
          <div>
            <label htmlFor="correo-rec" className="mb-1.5 block text-sm text-texto-secundario">
              Correo electrónico
            </label>
            <input
              id="correo-rec"
              type="email"
              autoComplete="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="campo"
              placeholder="doctora@consultorio.do"
            />
          </div>

          {aviso && <Alerta tono="exito">{aviso}</Alerta>}
          {error && <Alerta tono="urgente">{error}</Alerta>}

          <Button type="submit" cargando={cargando} className="w-full">
            Enviar enlace
          </Button>

          <button
            type="button"
            onClick={() => {
              setModo("acceso");
              setAviso(null);
              setError(null);
            }}
            className="block w-full text-center text-sm text-texto-secundario transition-colors hover:text-rosa-principal"
          >
            ← Volver a iniciar sesión
          </button>
        </form>
      )}
    </div>
  );
}
