import { Suspense } from "react";
import type { Metadata } from "next";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { HeartMark } from "@/components/ui/HeartMark";
import { LoginForm } from "@/components/auth/LoginForm";
import { PieCredito } from "@/components/ui/PieCredito";

export const metadata: Metadata = {
  title: "Bienvenida",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AuroraBackground />

      <div className="grid w-full max-w-5xl gap-8 md:grid-cols-2">
        {/* Panel cinemático de bienvenida */}
        <section className="animate-fade-in hidden flex-col justify-center gap-6 rounded-tarjeta p-10 md:flex">
          <HeartMark className="h-14 w-14 animate-heart-pulse" />
          <div className="space-y-3">
            <p className="font-sans text-sm uppercase tracking-[0.3em] text-rosa-medio">
              Consultorio
            </p>
            <h1 className="font-display text-5xl font-semibold leading-tight text-texto-principal">
              Dra. Reyna
              <br />
              <span className="texto-degradado">Massiel</span>
            </h1>
            <p className="max-w-sm font-serif text-xl leading-relaxed text-texto-secundario">
              Cardiología · Medicina interna · Ecocardiografía
            </p>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-texto-secundario">
            Un espacio sereno y seguro para el cuidado de tus pacientes. Cada
            detalle, pensado con cariño y precisión.
          </p>
        </section>

        {/* Tarjeta de acceso */}
        <section className="tarjeta animate-scale-in flex flex-col justify-center p-8 sm:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <HeartMark className="h-9 w-9" />
            <div>
              <p className="font-display text-xl font-semibold text-texto-principal">
                Dra. Reyna Massiel
              </p>
              <p className="text-xs text-texto-secundario">
                Cardiología · Medicina interna
              </p>
            </div>
          </div>

          <h2 className="mb-1 font-display text-2xl font-semibold text-texto-principal">
            Bienvenida de vuelta
          </h2>
          <p className="mb-6 text-sm text-texto-secundario">
            Ingresa a tu panel de gestión clínica.
          </p>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <div className="mt-8">
            <PieCredito compacto />
          </div>
        </section>
      </div>
    </main>
  );
}
