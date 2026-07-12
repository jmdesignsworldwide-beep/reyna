import type { Metadata } from "next";
import { requerirUsuaria } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Alerta } from "@/components/ui/Alerta";
import { HeartMark } from "@/components/ui/HeartMark";
import { ETIQUETAS_ROL } from "@/lib/permissions";
import {
  FormularioCambioClave,
  FormularioRecuperacion,
} from "@/components/panel/FormularioClave";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: { recuperar?: string };
}) {
  const usuaria = await requerirUsuaria();
  const enRecuperacion = searchParams.recuperar === "1";

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <div className="flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4" />
          <span>Mi cuenta</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">
          {usuaria.nombre_completo}
        </h1>
        <p className="mt-1 text-texto-secundario">
          {usuaria.email} · {ETIQUETAS_ROL[usuaria.rol]}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-semibold text-texto-principal">
            {enRecuperacion ? "Restablecer contraseña" : "Cambiar contraseña"}
          </h2>
          <p className="mb-5 mt-1 text-sm text-texto-secundario">
            {enRecuperacion
              ? "Define tu nueva contraseña para completar la recuperación."
              : "Actualiza tu contraseña con regularidad para mantener tu cuenta segura."}
          </p>
          {enRecuperacion ? (
            <>
              <div className="mb-4">
                <Alerta tono="info">
                  Estás completando la recuperación de tu contraseña.
                </Alerta>
              </div>
              <FormularioRecuperacion />
            </>
          ) : (
            <FormularioCambioClave />
          )}
        </Card>

        <Card>
          <h2 className="font-display text-xl font-semibold text-texto-principal">
            Datos de la cuenta
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-[var(--borde)] pb-2">
              <dt className="text-texto-secundario">Nombre</dt>
              <dd className="font-medium text-texto-principal">
                {usuaria.nombre_completo}
              </dd>
            </div>
            <div className="flex justify-between border-b border-[var(--borde)] pb-2">
              <dt className="text-texto-secundario">Correo</dt>
              <dd className="font-medium text-texto-principal">{usuaria.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-texto-secundario">Rol</dt>
              <dd className="font-medium text-rosa-principal">
                {ETIQUETAS_ROL[usuaria.rol]}
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-xs text-texto-secundario">
            Para cambiar tu rol, contacta a una administradora.
          </p>
        </Card>
      </div>
    </div>
  );
}
