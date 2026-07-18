import { requerirUsuaria } from "@/lib/auth";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Sidebar } from "@/components/panel/Sidebar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PieCredito } from "@/components/ui/PieCredito";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuaria = await requerirUsuaria();

  return (
    <div className="relative flex min-h-screen">
      <AuroraBackground />
      <Sidebar rol={usuaria.rol} nombre={usuaria.nombre_completo} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--borde)] bg-[var(--fondo)]/85 px-6 py-3.5 backdrop-blur-md">
          <p className="text-sm text-texto-secundario">
            {saludo()},{" "}
            <span className="font-medium text-texto-principal">
              {primerNombre(usuaria.nombre_completo)}
            </span>
          </p>
          <ThemeToggle />
        </header>

        <main className="flex-1 px-6 py-8">
          <div className="mx-auto w-full max-w-6xl">
            {children}
            <PieCredito />
          </div>
        </main>
      </div>
    </div>
  );
}

function primerNombre(nombre: string): string {
  return nombre.split(" ")[0] ?? nombre;
}

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}
