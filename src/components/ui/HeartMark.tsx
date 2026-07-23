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
      <path
        fill={`url(#${gid})`}
        d="M12 21s-7.5-4.9-10-9.6C.4 8.3 1.8 4.9 5 4.2c2-.4 3.9.6 5 2.2 1.1-1.6 3-2.6 5-2.2 3.2.7 4.6 4.1 3 7.2C19.5 16.1 12 21 12 21z"
      />
    </svg>
  );
}
