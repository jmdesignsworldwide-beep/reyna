/** Iconos SVG minimalistas del panel (trazo, heredan currentColor). */
export function Icono({ nombre, className = "h-5 w-5" }: { nombre: string; className?: string }) {
  const props = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (nombre) {
    case "inicio":
      return (
        <svg {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      );
    case "usuarios":
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 5.2a3 3 0 0 1 0 5.6" />
          <path d="M17.5 20a5.2 5.2 0 0 0-2.3-4.3" />
        </svg>
      );
    case "pacientes":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M12 11.5v3M10.5 13h3" />
        </svg>
      );
    case "agenda":
      return (
        <svg {...props}>
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v3M16 3v3" />
          <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" />
        </svg>
      );
    case "auditoria":
      return (
        <svg {...props}>
          <path d="M8 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-3" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M8 11h8M8 15h5" />
        </svg>
      );
    case "cuenta":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case "salir":
      return (
        <svg {...props}>
          <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
          <path d="M10 12H3M6 8l-4 4 4 4" />
        </svg>
      );
    case "menu":
      return (
        <svg {...props}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    default:
      return null;
  }
}
