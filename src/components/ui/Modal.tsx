"use client";

import { useEffect } from "react";

export function Modal({
  titulo,
  abierto,
  onClose,
  children,
  ancho = "max-w-lg",
}: {
  titulo: string;
  abierto: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ancho?: string;
}) {
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto, onClose]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="animate-fade-in fixed inset-0 bg-[#3a2830]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`animate-scale-in relative my-4 w-full ${ancho} rounded-tarjeta border border-[var(--borde)] bg-[var(--superficie)] shadow-tarjeta-hover`}
      >
        <div className="flex items-center justify-between border-b border-[var(--borde)] px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-texto-principal">{titulo}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-texto-secundario transition-colors hover:bg-[var(--superficie-suave)] hover:text-rosa-principal"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
