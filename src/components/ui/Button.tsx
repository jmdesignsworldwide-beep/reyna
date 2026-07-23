"use client";

import { forwardRef } from "react";

type Variante = "primario" | "secundario" | "peligro" | "fantasma";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
}

const estilos: Record<Variante, string> = {
  primario:
    "text-white shadow-tarjeta hover:shadow-tarjeta-hover bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] hover:brightness-[1.06]",
  secundario:
    "border border-[var(--borde)] bg-[var(--superficie-suave)] text-texto-principal hover:border-rosa-hover",
  peligro:
    "text-white bg-estado-urgente hover:brightness-[1.05] shadow-tarjeta",
  fantasma: "text-texto-secundario hover:text-rosa-principal",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variante = "primario", cargando = false, className = "", children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-suave px-4 py-2.5 text-sm font-medium transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${estilos[variante]} ${className}`}
      {...rest}
    >
      {cargando && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      {children}
    </button>
  );
});
