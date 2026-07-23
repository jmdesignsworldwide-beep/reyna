import type { ReactNode } from "react";
import { HeartMark } from "@/components/ui/HeartMark";

/**
 * Estado vacío premium, cálido y consistente en todo el sistema.
 * Un solo corazón limpio en su círculo + copy amable + acción opcional.
 */
export function EstadoVacio({
  titulo,
  texto,
  accion,
  compacto = false,
}: {
  titulo?: string;
  texto: string;
  accion?: ReactNode;
  compacto?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-3 text-center ${compacto ? "py-8" : "py-12"}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tarjeta)]">
        <HeartMark className="h-7 w-7" pulse />
      </span>
      {titulo && (
        <p className="font-display text-lg font-semibold text-texto-principal">{titulo}</p>
      )}
      <p className="max-w-sm text-sm text-texto-secundario">{texto}</p>
      {accion}
    </div>
  );
}
