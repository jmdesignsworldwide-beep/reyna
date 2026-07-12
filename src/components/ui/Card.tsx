export function Card({
  children,
  className = "",
  interactiva = false,
}: {
  children: React.ReactNode;
  className?: string;
  interactiva?: boolean;
}) {
  return (
    <div
      className={`tarjeta ${interactiva ? "tarjeta-interactiva" : ""} p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardEstadistica({
  etiqueta,
  valor,
  detalle,
  color = "var(--rosa-principal)",
}: {
  etiqueta: string;
  valor: string | number;
  detalle?: string;
  color?: string;
}) {
  return (
    <div className="tarjeta tarjeta-interactiva animate-fade-up p-6">
      <p className="text-sm text-texto-secundario">{etiqueta}</p>
      <p
        className="mt-2 font-display text-4xl font-semibold"
        style={{ color }}
      >
        {valor}
      </p>
      {detalle && (
        <p className="mt-1 text-xs text-texto-secundario">{detalle}</p>
      )}
    </div>
  );
}
