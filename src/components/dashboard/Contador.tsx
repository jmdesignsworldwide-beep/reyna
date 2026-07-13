"use client";

import { useEffect, useRef, useState } from "react";

/** Contador que anima de 0 al valor con easing, al montar. */
export function Contador({
  valor,
  duracion = 1100,
  decimales = 0,
  sufijo = "",
}: {
  valor: number;
  duracion?: number;
  decimales?: number;
  sufijo?: string;
}) {
  const [n, setN] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(valor);
      return;
    }
    let inicio: number | null = null;
    const paso = (t: number) => {
      if (inicio === null) inicio = t;
      const p = Math.min((t - inicio) / duracion, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(valor * eased);
      if (p < 1) raf.current = requestAnimationFrame(paso);
    };
    raf.current = requestAnimationFrame(paso);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [valor, duracion]);

  const texto = n.toLocaleString("es-DO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
  return (
    <>
      {texto}
      {sufijo}
    </>
  );
}
