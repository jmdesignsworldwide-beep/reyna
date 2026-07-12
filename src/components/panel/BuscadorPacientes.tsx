"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function BuscadorPacientes({ inicial }: { inicial: string }) {
  const router = useRouter();
  const [valor, setValor] = useState(inicial);
  const [pendiente, iniciarTransicion] = useTransition();

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const q = valor.trim();
    iniciarTransicion(() => {
      router.push(q ? `/panel/pacientes?q=${encodeURIComponent(q)}` : "/panel/pacientes");
    });
  }

  return (
    <form onSubmit={buscar} className="flex w-full max-w-md items-center gap-2">
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Buscar por nombre, apellido o cédula…"
        className="campo"
        aria-label="Buscar pacientes"
      />
      <button
        type="submit"
        disabled={pendiente}
        className="flex-none rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white transition-all hover:brightness-105 disabled:opacity-60"
      >
        {pendiente ? "…" : "Buscar"}
      </button>
    </form>
  );
}
