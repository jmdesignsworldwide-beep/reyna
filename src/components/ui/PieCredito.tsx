import { HeartMark } from "@/components/ui/HeartMark";

const INSTAGRAM = "https://instagram.com/jm.nexus.designs";

/**
 * Crédito de marca JM Nexus Designs. Todo el texto es un único enlace al
 * Instagram (abre en pestaña nueva). `compacto` para el login; completo para
 * el panel. Estilo discreto acorde al sistema.
 */
export function PieCredito({ compacto = false }: { compacto?: boolean }) {
  if (compacto) {
    return (
      <p className="text-center text-xs text-texto-secundario">
        <a
          href={INSTAGRAM}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-rosa-principal"
        >
          <HeartMark className="h-3.5 w-3.5" />
          Diseñado por{" "}
          <span className="font-medium text-rosa-principal">JM Nexus Designs</span>
        </a>
      </p>
    );
  }

  return (
    <footer className="mt-10 border-t border-[var(--borde)] pt-6 text-center">
      <a
        href={INSTAGRAM}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-texto-secundario transition-colors hover:text-rosa-principal"
      >
        <HeartMark className="h-4 w-4" />
        Diseñado por{" "}
        <span className="font-medium text-rosa-principal">JM Nexus Designs</span>
      </a>
    </footer>
  );
}
