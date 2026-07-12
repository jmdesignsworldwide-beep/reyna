import Link from "next/link";
import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardEstadistica } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { ETIQUETAS_ROL, DESCRIPCION_ROL } from "@/lib/permissions";
import { formatearFechaHora } from "@/lib/formato";

export default async function PanelInicio() {
  const usuaria = await requerirUsuaria();
  const supabase = createClient();

  const esAdmin = usuaria.rol === "admin";

  // Datos reales (RLS filtra por rol automáticamente).
  let totalUsuarias = 0;
  let totalAdmins = 0;
  let ultimaActividad: { accion: string; created_at: string; actor_email: string | null }[] = [];

  if (esAdmin) {
    const [{ count: usuarias }, { count: admins }, { data: actividad }] =
      await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("rol", "admin")
          .eq("activo", true),
        supabase
          .from("audit_log")
          .select("accion, created_at, actor_email")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
    totalUsuarias = usuarias ?? 0;
    totalAdmins = admins ?? 0;
    ultimaActividad = actividad ?? [];
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <div className="flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4" />
          <span>Panel de gestión clínica</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold text-texto-principal">
          Hola, {usuaria.nombre_completo}
        </h1>
        <p className="mt-1 text-texto-secundario">
          Tu rol:{" "}
          <span className="font-medium text-rosa-principal">
            {ETIQUETAS_ROL[usuaria.rol]}
          </span>{" "}
          — {DESCRIPCION_ROL[usuaria.rol]}
        </p>
      </header>

      {esAdmin && (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CardEstadistica
            etiqueta="Usuarias del sistema"
            valor={totalUsuarias}
            detalle="Cuentas registradas"
          />
          <CardEstadistica
            etiqueta="Administradoras activas"
            valor={totalAdmins}
            detalle="Protección del último admin activa"
            color="var(--rosa-hover)"
          />
          <CardEstadistica
            etiqueta="Eventos auditados"
            valor={ultimaActividad.length > 0 ? "Activa" : "—"}
            detalle="Bitácora en funcionamiento"
            color="#4CAF82"
          />
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-display text-xl font-semibold text-texto-principal">
            Próximos pasos
          </h2>
          <p className="mt-1 text-sm text-texto-secundario">
            Esta es la base segura del sistema. Los módulos clínicos llegan en
            las siguientes tandas.
          </p>
          <ul className="mt-4 space-y-3">
            {PROXIMOS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-texto-principal">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-rosa-hover" />
                {p}
              </li>
            ))}
          </ul>
        </Card>

        {esAdmin ? (
          <Card>
            <h2 className="font-display text-xl font-semibold text-texto-principal">
              Actividad reciente
            </h2>
            {ultimaActividad.length === 0 ? (
              <p className="mt-3 text-sm text-texto-secundario">
                Aún no hay eventos registrados.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {ultimaActividad.map((a, i) => (
                  <li key={i} className="border-b border-[var(--borde)] pb-2.5 last:border-0">
                    <p className="text-sm font-medium text-texto-principal">
                      {a.accion}
                    </p>
                    <p className="text-xs text-texto-secundario">
                      {a.actor_email ?? "sistema"} ·{" "}
                      {formatearFechaHora(a.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/panel/auditoria"
              className="mt-4 inline-block text-sm text-rosa-principal hover:text-rosa-hover"
            >
              Ver bitácora completa →
            </Link>
          </Card>
        ) : (
          <Card>
            <h2 className="font-display text-xl font-semibold text-texto-principal">
              Tu cuenta
            </h2>
            <p className="mt-3 text-sm text-texto-secundario">
              Puedes actualizar tu contraseña y datos personales desde tu
              cuenta.
            </p>
            <Link
              href="/panel/cuenta"
              className="mt-4 inline-block text-sm text-rosa-principal hover:text-rosa-hover"
            >
              Ir a mi cuenta →
            </Link>
          </Card>
        )}
      </section>
    </div>
  );
}

const PROXIMOS = [
  "Módulo de pacientes con cédula, ARS y expediente clínico.",
  "Agenda de citas con recordatorios.",
  "Ecocardiogramas e informes.",
  "Finanzas y facturación (solo administración).",
];
