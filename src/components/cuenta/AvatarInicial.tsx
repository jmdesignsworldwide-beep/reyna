/** Avatar con las iniciales de la usuaria (círculo con degradado rosa). */
export function AvatarInicial({
  nombre,
  className = "h-16 w-16 text-xl",
}: {
  nombre: string;
  className?: string;
}) {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full font-display font-semibold text-white shadow-tarjeta ${className}`}
      style={{
        background: "linear-gradient(135deg, var(--rosa-principal), var(--rosa-hover))",
      }}
    >
      {iniciales || "♥"}
    </span>
  );
}
