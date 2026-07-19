import type { Metadata } from "next";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Alerta } from "@/components/ui/Alerta";
import { HeartMark } from "@/components/ui/HeartMark";
import { ETIQUETAS_ROL, puedeUI } from "@/lib/permissions";
import {
  FormularioCambioClave,
  FormularioRecuperacion,
} from "@/components/panel/FormularioClave";
import { AvatarInicial } from "@/components/cuenta/AvatarInicial";
import { PerfilForm } from "@/components/cuenta/PerfilForm";
import { PreferenciasCuenta } from "@/components/cuenta/PreferenciasCuenta";
import { formatearFechaHora } from "@/lib/formato";
import type { Sede } from "@/types/database";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ recuperar?: string }>;
}) {
  const { recuperar } = await searchParams;
  const usuaria = await requerirUsuaria();
  const enRecuperacion = recuperar === "1";
  const supabase = await createClient();

  const [{ data: perfil }, { data: userData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", usuaria.id).single(),
    supabase.auth.getUser(),
  ]);

  const telefono = (perfil as { telefono?: string | null } | null)?.telefono ?? "";
  const sedePreferida =
    (perfil as { sede_preferida?: string | null } | null)?.sede_preferida ?? null;
  const ultimoAcceso = userData?.user?.last_sign_in_at ?? null;
  const cuentaDesde = userData?.user?.created_at ?? null;

  const mostrarSede = puedeUI(usuaria.rol, "agenda", "crear");
  const { data: sedesData } = mostrarSede
    ? await supabase.from("sedes").select("*").eq("activo", true).order("nombre")
    : { data: null };
  const sedes = (sedesData as Sede[] | null) ?? [];

  // Mi actividad (datos reales, por rol; created_by = yo).
  const hoy = new Date();
  const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  const cuenta = (
    tabla: "pacientes" | "consultas" | "citas",
    filtros?: { desdeFecha?: string },
  ) => {
    let q = supabase
      .from(tabla)
      .select("id", { count: "exact", head: true })
      .eq("created_by", usuaria.id);
    if (filtros?.desdeFecha) q = q.gte("fecha", filtros.desdeFecha);
    return q;
  };

  const [pacientesMios, consultasMes, consultasTot, citasMias, citasMes] =
    await Promise.all([
      usuaria.rol === "admin" ? cuenta("pacientes") : Promise.resolve({ count: 0 }),
      usuaria.rol !== "recepcion" ? cuenta("consultas", { desdeFecha: inicioMes }) : Promise.resolve({ count: 0 }),
      usuaria.rol === "asistente" ? cuenta("consultas") : Promise.resolve({ count: 0 }),
      usuaria.rol === "recepcion" ? cuenta("citas") : Promise.resolve({ count: 0 }),
      usuaria.rol === "recepcion" ? cuenta("citas", { desdeFecha: inicioMes }) : Promise.resolve({ count: 0 }),
    ]);

  const actividad: { etiqueta: string; valor: number }[] =
    usuaria.rol === "admin"
      ? [
          { etiqueta: "Pacientes registrados", valor: pacientesMios.count ?? 0 },
          { etiqueta: "Consultas este mes", valor: consultasMes.count ?? 0 },
        ]
      : usuaria.rol === "recepcion"
        ? [
            { etiqueta: "Citas agendadas", valor: citasMias.count ?? 0 },
            { etiqueta: "Citas de este mes", valor: citasMes.count ?? 0 },
          ]
        : [
            { etiqueta: "Consultas registradas", valor: consultasTot.count ?? 0 },
            { etiqueta: "Consultas este mes", valor: consultasMes.count ?? 0 },
          ];

  return (
    <div className="space-y-6">
      {/* Encabezado con avatar */}
      <header className="animate-fade-up flex items-center gap-4">
        <AvatarInicial nombre={usuaria.nombre_completo} />
        <div>
          <div className="flex items-center gap-2 text-sm text-rosa-medio">
            <HeartMark className="h-4 w-4" />
            <span>Mi cuenta</span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold text-texto-principal">
            {usuaria.nombre_completo}
          </h1>
          <p className="text-texto-secundario">
            {usuaria.email} · {ETIQUETAS_ROL[usuaria.rol]}
          </p>
        </div>
      </header>

      {enRecuperacion && (
        <Card>
          <h2 className="font-display text-xl font-semibold text-texto-principal">
            Restablecer contraseña
          </h2>
          <p className="mb-4 mt-1 text-sm text-texto-secundario">
            Define tu nueva contraseña para completar la recuperación.
          </p>
          <div className="mb-4">
            <Alerta tono="info">Estás completando la recuperación de tu contraseña.</Alerta>
          </div>
          <FormularioRecuperacion />
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mi perfil */}
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-display text-xl font-semibold text-texto-principal">
            Mi perfil
          </h2>
          <PerfilForm
            nombreInicial={usuaria.nombre_completo}
            telefonoInicial={telefono}
            correo={usuaria.email}
            rolEtiqueta={ETIQUETAS_ROL[usuaria.rol]}
          />
        </Card>

        {/* Seguridad */}
        <Card>
          <h2 className="font-display text-xl font-semibold text-texto-principal">
            Seguridad
          </h2>
          <p className="mb-5 mt-1 text-sm text-texto-secundario">
            Actualiza tu contraseña con regularidad para mantener tu cuenta segura.
          </p>
          {!enRecuperacion && <FormularioCambioClave />}
          <dl className="mt-6 space-y-2 border-t border-[var(--borde)] pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-texto-secundario">Último acceso</dt>
              <dd className="text-texto-principal">
                {ultimoAcceso ? formatearFechaHora(ultimoAcceso) : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-texto-secundario">Cuenta creada</dt>
              <dd className="text-texto-principal">
                {cuentaDesde ? formatearFechaHora(cuentaDesde) : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Preferencias */}
        <Card>
          <h2 className="mb-4 font-display text-xl font-semibold text-texto-principal">
            Preferencias
          </h2>
          <PreferenciasCuenta
            sedes={sedes}
            sedePreferidaInicial={sedePreferida}
            mostrarSede={mostrarSede}
          />
        </Card>

        {/* Mi actividad */}
        <Card className="lg:col-span-2">
          <h2 className="mb-1 font-display text-xl font-semibold text-texto-principal">
            Mi actividad
          </h2>
          <p className="mb-4 text-sm text-texto-secundario">
            Un resumen de tu trabajo en el sistema.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {actividad.map((a) => (
              <div key={a.etiqueta} className="rounded-suave border border-[var(--borde)] p-4">
                <p className="font-display text-3xl font-semibold text-rosa-principal">
                  {a.valor}
                </p>
                <p className="mt-0.5 text-sm text-texto-secundario">{a.etiqueta}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
