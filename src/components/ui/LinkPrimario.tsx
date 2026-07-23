import Link from "next/link";
import type { ReactNode } from "react";

/** Enlace con estilo de botón primario (degradado rosa), consistente en todo el sistema. */
export function LinkPrimario({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-5 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all active:scale-[0.98] hover:shadow-tarjeta-hover hover:brightness-105 ${className}`}
    >
      {children}
    </Link>
  );
}
