"use client";

import { useEffect, useState } from "react";

function saludoDe(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Saludo según la hora LOCAL de la usuaria, calculado en el cliente para que
 * sea consistente en todo el panel (evita el desfase servidor-UTC vs cliente).
 * Se usa el mismo componente en el header y en el título del dashboard, así
 * que siempre coinciden.
 */
export function Saludo() {
  const [texto, setTexto] = useState(() => saludoDe(new Date()));
  useEffect(() => {
    setTexto(saludoDe(new Date()));
  }, []);
  return <span suppressHydrationWarning>{texto}</span>;
}
