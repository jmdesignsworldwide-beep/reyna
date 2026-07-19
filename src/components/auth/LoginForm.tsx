"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Modo = "acceso" | "recuperar";

function IconoCorreo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}
function IconoCandado() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1.4" />
    </svg>
  );
}

function Campo({
  id,
  tipo,
  valor,
  onChange,
  etiqueta,
  autoComplete,
  icono,
  placeholder,
}: {
  id: string;
  tipo: string;
  valor: string;
  onChange: (v: string) => void;
  etiqueta: string;
  autoComplete: string;
  icono: React.ReactNode;
  placeholder: string;
}) {
  const [foco, setFoco] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-texto-secundario">
        {etiqueta}
      </label>
      <div
        className="flex items-center gap-2.5 rounded-[14px] border bg-[var(--superficie)]/70 px-3.5 py-3 transition-all duration-300"
        style={{
          borderColor: foco ? "var(--rosa-hover)" : "var(--borde)",
          boxShadow: foco
            ? "0 0 0 4px rgba(232,127,166,0.16), 0 6px 20px -10px rgba(177,74,115,0.4)"
            : "0 1px 0 rgba(255,255,255,0.4) inset",
        }}
      >
        <span
          className="flex-none transition-colors duration-300"
          style={{ color: foco ? "var(--rosa-principal)" : "var(--texto-secundario)" }}
        >
          {icono}
        </span>
        <input
          id={id}
          type={tipo}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          autoComplete={autoComplete}
          required
          placeholder={placeholder}
          className="w-full bg-transparent text-texto-principal outline-none placeholder:text-texto-secundario/60"
        />
      </div>
    </div>
  );
}

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

    // Marca para la bienvenida cinemática (una sola vez por sesión).
    try {
      window.sessionStorage.setItem("reyna-bienvenida", "1");
    } catch {
      /* si sessionStorage no está disponible, simplemente no hay animación */
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
      redirectTo: `${origen}/auth/callback?next=${encodeURIComponent("/panel/cuenta?recuperar=1")}`,
    });

    // No revelamos si el correo existe (anti-enumeración de cuentas).
    setAviso("Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.");
    setCargando(false);
    if (error) console.error(error);
  }

  return (
    <div className="w-full">
      {modo === "acceso" ? (
        <form onSubmit={acceder} className="space-y-4">
          <Campo
            id="correo"
            tipo="email"
            etiqueta="Correo electrónico"
            valor={correo}
            onChange={setCorreo}
            autoComplete="email"
            icono={<IconoCorreo />}
            placeholder="doctora@consultorio.do"
          />
          <Campo
            id="clave"
            tipo="password"
            etiqueta="Contraseña"
            valor={clave}
            onChange={setClave}
            autoComplete="current-password"
            icono={<IconoCandado />}
            placeholder="••••••••"
          />

          <AnimatePresence>
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center gap-2 rounded-[12px] border px-3.5 py-2.5 text-sm"
                style={{ borderColor: "rgba(224,86,122,0.4)", backgroundColor: "rgba(224,86,122,0.10)", color: "#c53d63" }}
                role="alert"
              >
                <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-estado-urgente text-[10px] font-bold text-white">
                  !
                </span>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            cargando={cargando}
            className="w-full !py-3 text-[15px] transition-transform active:scale-[0.985]"
          >
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
            Escribe tu correo y te enviaremos un enlace para restablecer la contraseña.
          </p>
          <Campo
            id="correo-rec"
            tipo="email"
            etiqueta="Correo electrónico"
            valor={correo}
            onChange={setCorreo}
            autoComplete="email"
            icono={<IconoCorreo />}
            placeholder="doctora@consultorio.do"
          />

          <AnimatePresence>
            {aviso && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-[12px] border px-3.5 py-2.5 text-sm"
                style={{ borderColor: "rgba(76,175,130,0.4)", backgroundColor: "rgba(76,175,130,0.10)", color: "#2f8a63" }}
                role="status"
              >
                {aviso}
              </motion.p>
            )}
          </AnimatePresence>

          <Button type="submit" cargando={cargando} className="w-full !py-3">
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
