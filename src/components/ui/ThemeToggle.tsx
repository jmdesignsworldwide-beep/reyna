"use client";

import { useTema } from "@/components/theme/ThemeProvider";

export function ThemeToggle({ compacto = false }: { compacto?: boolean }) {
  const { tema, alternar } = useTema();
  const oscuro = tema === "oscuro";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={oscuro ? "Activar modo claro" : "Activar modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
      className="group flex items-center gap-2 rounded-suave border border-[var(--borde)] bg-[var(--superficie-suave)] px-3 py-2 text-sm text-texto-secundario transition-colors hover:text-rosa-principal"
    >
      <span className="text-base transition-transform group-hover:rotate-12">
        {oscuro ? "☀️" : "🌙"}
      </span>
      {!compacto && <span>{oscuro ? "Claro" : "Oscuro"}</span>}
    </button>
  );
}
