import type { ReactNode } from "react";
import { HeartMark } from "@/components/ui/HeartMark";

/**
 * Estado vacío premium, cálido e intencional. El sistema arranca sin datos, así
 * que estos se ven mucho: deben sentirse compuestos, no a medio cargar.
 *
 * - `compacto`: para el cuerpo de una sección que ya vive dentro de una tarjeta
 *   con encabezado (altura moderada, sin océano de espacio).
 * - por defecto: héroe de página completa (alto, con textura y llamada a la
 *   acción) para las vistas que quedan totalmente vacías.
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
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden text-center ${
        compacto ? "min-h-[240px] px-4 py-10" : "min-h-[56vh] px-6 py-16"
      }`}
    >
      {/* Textura sutil: degradado radial cálido para que no sea una caja plana. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 22%, var(--superficie-suave), transparent 72%)",
          opacity: 0.7,
        }}
      />

      {/* Medallón con degradado + glow rosa (una sola pieza, sin anillos dobles). */}
      <span
        className="relative flex items-center justify-center rounded-full"
        style={{
          height: compacto ? 68 : 92,
          width: compacto ? 68 : 92,
          background: "linear-gradient(150deg, var(--tarjeta), var(--superficie-suave))",
          boxShadow:
            "0 16px 36px -14px rgba(177,74,115,0.45), inset 0 1px 0 rgba(255,255,255,0.28)",
        }}
      >
        {/* Nudge óptico: el corazón se ve centrado un pelín más abajo del centro. */}
        <HeartMark
          className={compacto ? "h-8 w-8 translate-y-[3%]" : "h-11 w-11 translate-y-[3%]"}
          pulse
        />
      </span>

      {titulo && (
        <h3
          className={`relative mt-5 font-display font-semibold text-texto-principal ${
            compacto ? "text-xl" : "text-2xl"
          }`}
        >
          {titulo}
        </h3>
      )}
      <p className="relative mt-2 max-w-md text-pretty leading-relaxed text-texto-secundario">
        {texto}
      </p>
      {accion && <div className="relative mt-6 flex flex-wrap justify-center gap-2.5">{accion}</div>}
    </div>
  );
}
