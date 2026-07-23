"use client";

import { useId } from "react";

/** Motivo de marca: corazón (♥) con degradado rosa. */
export function HeartMark({
  className = "",
  pulse = false,
}: {
  className?: string;
  pulse?: boolean;
}) {
  // Id único por instancia: evita el choque de `id` duplicado entre los
  // muchos corazones de una misma página (que hacía que el degradado se
  // pintara sucio/fantasma en las instancias animadas).
  const gid = `heart-${useId().replace(/[:]/g, "")}`;
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} ${pulse ? "animate-heart-pulse" : ""}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E87FA6" />
          <stop offset="100%" stopColor="#B14A73" />
        </linearGradient>
      </defs>
      {/* Path simétrico y centrado en el viewBox 0–24 (bbox x 3.2–20.8, y 3.6–20.6). */}
      <path
        fill={`url(#${gid})`}
        d="M12 20.6C11 19.6 3.2 13.5 3.2 8.4 3.2 5.7 5.3 3.6 8 3.6c1.6 0 3.1.8 4 2.1.9-1.3 2.4-2.1 4-2.1 2.7 0 4.8 2.1 4.8 4.8 0 5.1-7.8 11.2-8.8 12.2z"
      />
    </svg>
  );
}
