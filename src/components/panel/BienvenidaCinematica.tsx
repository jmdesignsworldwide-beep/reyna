"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartMark } from "@/components/ui/HeartMark";

/**
 * Bienvenida cinemática tras el login. Se muestra UNA sola vez por sesión
 * (bandera en sessionStorage puesta al iniciar sesión). A prueba de fallos:
 * cualquier error → no se muestra y el sistema queda visible detrás. Un
 * temporizador garantiza que la cortina siempre se levante.
 */
export function BienvenidaCinematica({ nombre }: { nombre: string }) {
  const [visible, setVisible] = useState(false);
  const yaCorrio = useRef(false);

  useEffect(() => {
    if (yaCorrio.current) return;
    yaCorrio.current = true;
    let pendiente = false;
    try {
      pendiente = window.sessionStorage.getItem("reyna-bienvenida") === "1";
      if (pendiente) window.sessionStorage.removeItem("reyna-bienvenida");
    } catch {
      pendiente = false;
    }
    if (!pendiente) return;

    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="bienvenida"
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
          transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Fondo aurora rosa con profundidad */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(130% 130% at 50% 0%, var(--superficie-suave) 0%, var(--fondo) 60%)",
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 h-[120vh] w-[120vh] -translate-x-1/2 -translate-y-1/2 anim-giro"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(232,127,166,0.22), transparent, rgba(194,90,130,0.20), transparent, rgba(232,127,166,0.22))",
              filter: "blur(90px)",
            }}
          />
          <div
            className="absolute left-[10%] top-[15%] h-[55vh] w-[55vh] rounded-full blur-3xl anim-deriva-1"
            style={{ background: "radial-gradient(circle, rgba(232,127,166,0.4), transparent 70%)" }}
          />
          <div
            className="absolute bottom-[5%] right-[8%] h-[50vh] w-[50vh] rounded-full blur-3xl anim-deriva-2"
            style={{ background: "radial-gradient(circle, rgba(251,228,236,0.8), transparent 70%)" }}
          />

          {/* Contenido */}
          <div className="relative flex flex-col items-center px-6 text-center">
            {/* Motivo de marca con anillos y glow */}
            <motion.div
              className="relative mb-8 flex h-24 w-24 items-center justify-center"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.span
                className="absolute inset-0 rounded-full border"
                style={{ borderColor: "rgba(232,127,166,0.5)" }}
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 2.2, ease: "easeOut", repeat: Infinity }}
              />
              <motion.span
                className="absolute inset-0 rounded-full border"
                style={{ borderColor: "rgba(194,90,130,0.45)" }}
                initial={{ scale: 0.8, opacity: 0.7 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 2.2, ease: "easeOut", repeat: Infinity, delay: 0.6 }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-full blur-2xl"
                style={{ background: "radial-gradient(circle, rgba(232,127,166,0.7), transparent 70%)" }}
              />
              <HeartMark className="h-16 w-16" pulse />
            </motion.div>

            <motion.p
              className="mb-2 font-sans text-sm uppercase tracking-[0.35em] text-rosa-medio"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            >
              Bienvenida de nuevo
            </motion.p>

            <motion.h1
              className="texto-degradado font-display text-5xl font-semibold sm:text-6xl md:text-7xl"
              initial={{ opacity: 0, y: 16, filter: "blur(16px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              {nombre}
            </motion.h1>

            <motion.p
              className="mt-4 font-serif text-lg text-texto-secundario"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.8 }}
            >
              Tu consultorio te espera.
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
