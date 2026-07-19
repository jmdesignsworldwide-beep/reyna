import { Suspense } from "react";
import type { Metadata } from "next";
import { AuroraLogin } from "@/components/ui/AuroraLogin";
import { HeartMark } from "@/components/ui/HeartMark";
import { LoginForm } from "@/components/auth/LoginForm";
import { PieCredito } from "@/components/ui/PieCredito";

export const metadata: Metadata = {
  title: "Bienvenida",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AuroraLogin />

      <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-2">
        {/* Panel cinemático de bienvenida (escritorio) */}
        <section className="animate-fade-up hidden flex-col justify-center gap-7 p-6 md:flex">
          <div className="relative w-fit">
            <span
              aria-hidden="true"
              className="absolute inset-0 -z-10 rounded-full blur-2xl anim-respiro"
              style={{ background: "radial-gradient(circle, rgba(232,127,166,0.6), transparent 70%)" }}
            />
            <HeartMark className="h-16 w-16" pulse />
          </div>
          <div className="space-y-3">
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-rosa-medio">
              Consultorio
            </p>
            <h1 className="font-display text-6xl font-semibold leading-[1.05] text-texto-principal">
              Dra. Reyna
              <br />
              <span className="texto-degradado">Massiel</span>
            </h1>
            <p className="max-w-sm font-serif text-xl leading-relaxed text-texto-secundario">
              Cardiología · Medicina interna · Ecocardiografía
            </p>
          </div>
          <p className="flex max-w-sm items-center gap-1.5 text-sm leading-relaxed text-texto-secundario">
            Un espacio sereno y seguro para el cuidado de tus pacientes.
          </p>
        </section>

        {/* Tarjeta de acceso — glassmorphism */}
        <section
          className="animate-scale-in relative flex flex-col justify-center rounded-[26px] border p-8 backdrop-blur-2xl sm:p-10"
          style={{
            backgroundColor: "color-mix(in srgb, var(--superficie) 72%, transparent)",
            borderColor: "color-mix(in srgb, var(--rosa-hover) 22%, transparent)",
            boxShadow:
              "0 30px 80px -30px rgba(177,74,115,0.55), 0 1px 0 rgba(255,255,255,0.5) inset",
          }}
        >
          {/* Marca compacta (móvil) */}
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="relative">
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-full blur-xl"
                style={{ background: "radial-gradient(circle, rgba(232,127,166,0.6), transparent 70%)" }}
              />
              <HeartMark className="h-10 w-10" pulse />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-texto-principal">
                Dra. Reyna Massiel
              </p>
              <p className="text-xs text-texto-secundario">
                Cardiología · Medicina interna
              </p>
            </div>
          </div>

          <h2 className="mb-1 font-display text-3xl font-semibold text-texto-principal">
            Bienvenida de vuelta
          </h2>
          <p className="mb-7 text-sm text-texto-secundario">
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
