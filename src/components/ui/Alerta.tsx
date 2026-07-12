type Tono = "exito" | "urgente" | "advertencia" | "info";

const config: Record<Tono, { color: string; icono: string }> = {
  exito: { color: "var(--rosa-principal)", icono: "✓" },
  urgente: { color: "#E0567A", icono: "⚠" },
  advertencia: { color: "#E8A13C", icono: "!" },
  info: { color: "#8A6B78", icono: "ℹ" },
};

export function Alerta({
  tono = "info",
  children,
}: {
  tono?: Tono;
  children: React.ReactNode;
}) {
  const { color, icono } = config[tono];
  return (
    <div
      role="alert"
      className="animate-fade-in flex items-start gap-3 rounded-suave border p-3.5 text-sm"
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}12`,
        color: "var(--texto-principal)",
      }}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {icono}
      </span>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
