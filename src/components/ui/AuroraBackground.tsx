/**
 * Fondo aurora sutil (rosa → crema). Decorativo, no interactivo.
 * Se coloca detrás del contenido con posición fija.
 */
export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute -left-[10%] -top-[15%] h-[55vh] w-[55vh] rounded-full blur-3xl animate-aurora"
        style={{ background: "var(--aurora-1)" }}
      />
      <div
        className="absolute right-[-10%] top-[10%] h-[50vh] w-[50vh] rounded-full blur-3xl animate-aurora"
        style={{ background: "var(--aurora-2)", animationDelay: "-6s" }}
      />
      <div
        className="absolute bottom-[-20%] left-[20%] h-[60vh] w-[60vh] rounded-full blur-3xl animate-aurora"
        style={{ background: "var(--aurora-3)", animationDelay: "-11s" }}
      />
    </div>
  );
}
