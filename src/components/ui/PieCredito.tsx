import { HeartMark } from "@/components/ui/HeartMark";

const CORREO = "jm.nexus.designs@gmail.com";
const WHATSAPP = "https://wa.me/18494421919";
const INSTAGRAM = "https://instagram.com/jm.nexus.designs";

function IconoCorreo() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
function IconoWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.33 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.16 0 4.19.84 5.72 2.37a8.06 8.06 0 0 1 2.37 5.73c0 4.46-3.63 8.09-8.1 8.09a8.1 8.1 0 0 1-4.12-1.13l-.3-.18-3.12.82.83-3.04-.19-.31a8.05 8.05 0 0 1-1.24-4.3c0-4.46 3.63-8.09 8.1-8.09Zm4.66 10.16c-.25-.13-1.5-.74-1.73-.83-.23-.08-.4-.13-.57.13-.17.25-.66.82-.8.99-.15.17-.3.19-.55.06-.25-.13-1.07-.4-2.04-1.26-.75-.67-1.26-1.5-1.41-1.76-.15-.25-.02-.39.11-.51.11-.11.25-.3.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.44-.06-.13-.57-1.38-.78-1.88-.2-.49-.41-.42-.57-.43-.15-.01-.32-.01-.49-.01a.94.94 0 0 0-.68.32c-.23.25-.9.88-.9 2.15 0 1.27.92 2.49 1.05 2.66.13.17 1.81 2.77 4.39 3.89.61.26 1.09.42 1.47.54.62.2 1.18.17 1.62.1.5-.07 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.11-.23-.17-.48-.3Z" />
    </svg>
  );
}
function IconoInstagram() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

const enlaceClase =
  "inline-flex items-center gap-1.5 text-texto-secundario transition-colors hover:text-rosa-principal";

/**
 * Crédito de marca JM Nexus Designs. Enlaces reales (correo, WhatsApp, IG).
 * `compacto` para la pantalla de login; completo para el panel.
 */
export function PieCredito({ compacto = false }: { compacto?: boolean }) {
  if (compacto) {
    return (
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-texto-secundario">
        <HeartMark className="h-3.5 w-3.5" />
        Diseñado por
        <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="font-medium text-rosa-principal hover:text-rosa-hover">
          JM Nexus Designs
        </a>
      </p>
    );
  }

  return (
    <footer className="mt-10 border-t border-[var(--borde)] pt-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="flex items-center gap-1.5 text-sm text-texto-secundario">
          <HeartMark className="h-4 w-4" />
          Diseñado por{" "}
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-rosa-principal hover:text-rosa-hover"
          >
            JM Nexus Designs
          </a>
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          <a href={`mailto:${CORREO}`} className={enlaceClase}>
            <IconoCorreo />
            {CORREO}
          </a>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className={enlaceClase}>
            <IconoWhatsApp />
            849-442-1919
          </a>
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className={enlaceClase}>
            <IconoInstagram />
            @jm.nexus.designs
          </a>
        </nav>
      </div>
    </footer>
  );
}
