"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { HeartMark } from "@/components/ui/HeartMark";
import { Icono } from "@/components/panel/iconos";
import { MetricaCard } from "@/components/dashboard/MetricaCard";
import { GraficaDonut, type Segmento } from "@/components/dashboard/GraficaDonut";
import { GraficaBarras, type Barra } from "@/components/dashboard/GraficaBarras";
import { ETIQUETA_TIPO, ETIQUETA_ESTADO, COLOR_ESTADO, formatearHora, fechaLarga } from "@/lib/agenda";
import { ETIQUETAS_ROL } from "@/lib/permissions";
import { formatearFecha } from "@/lib/formato";
import { Saludo } from "@/components/ui/Saludo";
import type { UserRole } from "@/types/database";

export interface CitaResumen {
  id: string;
  fecha: string;
  hora_inicio: string;
  estado: string;
  tipo: string;
  paciente: { id?: string; nombres: string; apellidos: string } | null;
  sede: { nombre: string; color: string | null } | null;
}

export interface InsightItem {
  icono: string;
  color: string;
  pre: string;
  fuerte: string;
  post: string;
}

export interface DashboardDatos {
  insights: InsightItem[];
  sinPacientes: boolean;
  metricas: { activos: number; nuevosMes: number; citasHoy: number; proximas: number };
  citasHoy: CitaResumen[];
  proximas: CitaResumen[];
  sedes: { nombre: string; color: string; total: number }[];
  recientesPacientes: { id: string; nombre: string; created_at: string }[];
  recientesCitas: CitaResumen[];
  clinico: {
    distribNivel: Segmento[];
    factores: Barra[];
    riesgoAlto: number;
    alergias: { total: number; lista: { id: string; nombre: string }[] };
    reevaluaciones: { total: number; lista: { id: string; nombre: string }[] };
  } | null;
}

export function DashboardCliente({
  nombre,
  rol,
  datos,
}: {
  nombre: string;
  rol: UserRole;
  datos: DashboardDatos;
}) {
  const primer = nombre.split(" ")[0] ?? nombre;
  const clin = datos.clinico;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="animate-fade-up">
        <div className="flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4 animate-heart-pulse" />
          <span>Panel de la consulta</span>
        </div>
        <h1 className="mt-2 font-display text-4xl font-semibold text-texto-principal">
          <Saludo />, <span className="texto-degradado">{primer}</span>
        </h1>
        <p className="mt-1 text-texto-secundario">
          {ETIQUETAS_ROL[rol]} ·{" "}
          <span className="capitalize">{fechaLarga(new Date())}</span>
        </p>
      </header>

      {/* Métricas */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/panel/pacientes">
          <MetricaCard etiqueta="Pacientes activos" valor={datos.metricas.activos} icono="pacientes" detalle="Ver expediente →" delay={0} />
        </Link>
        <MetricaCard
          etiqueta="Nuevos este mes"
          valor={datos.metricas.nuevosMes}
          icono="pacientes"
          color="#4CAF82"
          detalle="Registrados en el mes"
          delay={80}
        />
        <Link href="/panel/agenda?vista=dia">
          <MetricaCard etiqueta="Citas de hoy" valor={datos.metricas.citasHoy} icono="agenda" color="var(--rosa-hover)" detalle="Ver agenda →" delay={160} />
        </Link>
        <Link href="/panel/agenda?vista=proximas">
          <MetricaCard etiqueta="Próximas citas" valor={datos.metricas.proximas} icono="agenda" color="#E8A13C" detalle="Ver próximas →" delay={240} />
        </Link>
      </section>

      {/* Insights inteligentes (datos reales) */}
      <PanelInsights insights={datos.insights} sinPacientes={datos.sinPacientes} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Citas de hoy */}
          <Card className="animate-fade-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-texto-principal">Agenda de hoy</h2>
              <Link href="/panel/agenda?vista=dia" className="text-sm text-rosa-principal hover:text-rosa-hover">
                Abrir agenda →
              </Link>
            </div>
            {datos.citasHoy.length === 0 ? (
              <EstadoVacio texto="No hay citas para hoy." />
            ) : (
              <ul className="divide-y divide-[var(--borde)]">
                {datos.citasHoy.map((c) => (
                  <ListaCita key={c.id} c={c} />
                ))}
              </ul>
            )}
          </Card>

          {/* Factores de riesgo (clínico) */}
          {clin && (
            <Card className="animate-fade-up">
              <h2 className="mb-1 font-display text-xl font-semibold text-texto-principal">
                Pacientes por factor de riesgo
              </h2>
              <p className="mb-4 text-sm text-texto-secundario">
                Perfil cardiovascular de la consulta.
              </p>
              <GraficaBarras items={clin.factores} />
            </Card>
          )}

          {/* Actividad reciente */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="animate-fade-up">
              <h3 className="mb-3 font-display text-lg font-semibold text-texto-principal">
                Últimos pacientes
              </h3>
              {datos.recientesPacientes.length === 0 ? (
                <EstadoVacio texto="Aún no hay pacientes." />
              ) : (
                <ul className="space-y-2.5">
                  {datos.recientesPacientes.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/panel/pacientes/${p.id}`}
                        className="flex items-center justify-between gap-2 text-sm hover:text-rosa-principal"
                      >
                        <span className="truncate text-texto-principal">{p.nombre}</span>
                        <span className="flex-none text-xs text-texto-secundario">
                          {formatearFecha(p.created_at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="animate-fade-up">
              <h3 className="mb-3 font-display text-lg font-semibold text-texto-principal">
                Últimas citas
              </h3>
              {datos.recientesCitas.length === 0 ? (
                <EstadoVacio texto="Aún no hay citas." />
              ) : (
                <ul className="space-y-2.5">
                  {datos.recientesCitas.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-texto-principal">
                        {c.paciente ? `${c.paciente.apellidos}, ${c.paciente.nombres}` : "Paciente"}
                      </span>
                      <span
                        className="flex-none rounded-full px-2 py-0.5 text-[11px]"
                        style={{ backgroundColor: `${COLOR_ESTADO[c.estado as keyof typeof COLOR_ESTADO]}1e`, color: COLOR_ESTADO[c.estado as keyof typeof COLOR_ESTADO] }}
                      >
                        {ETIQUETA_ESTADO[c.estado as keyof typeof ETIQUETA_ESTADO]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Alertas clínicas */}
          {clin && (
            <Card className="animate-fade-up">
              <h2 className="mb-4 font-display text-xl font-semibold text-texto-principal">Alertas</h2>
              <div className="space-y-3">
                <AlertaTile
                  color="#E0567A"
                  icono="!"
                  etiqueta="Alergias críticas"
                  valor={clin.alergias.total}
                />
                {clin.alergias.lista.length > 0 && (
                  <ul className="space-y-1 pl-1">
                    {clin.alergias.lista.map((p) => (
                      <li key={p.id}>
                        <Link href={`/panel/pacientes/${p.id}`} className="text-xs text-texto-secundario hover:text-estado-urgente">
                          ♥ {p.nombre}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <AlertaTile
                  color="#E8A13C"
                  icono="▲"
                  etiqueta="Riesgo cardiovascular alto"
                  valor={clin.riesgoAlto}
                />
                <AlertaTile
                  color="#B14A73"
                  icono="↻"
                  etiqueta="Reevaluaciones pendientes"
                  valor={clin.reevaluaciones.total}
                />
                {clin.reevaluaciones.lista.length > 0 && (
                  <ul className="space-y-1 pl-1">
                    {clin.reevaluaciones.lista.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <Link href={`/panel/pacientes/${p.id}`} className="truncate text-xs text-texto-secundario hover:text-rosa-principal">
                          {p.nombre}
                        </Link>
                        <Link href={`/panel/agenda?nuevo=${p.id}`} className="flex-none text-[11px] text-rosa-principal hover:text-rosa-hover">
                          Agendar
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          )}

          {/* Donut nivel de riesgo (clínico) */}
          {clin && clin.distribNivel.some((s) => s.valor > 0) && (
            <Card className="animate-fade-up">
              <h2 className="mb-4 font-display text-xl font-semibold text-texto-principal">
                Nivel de riesgo
              </h2>
              <GraficaDonut segmentos={clin.distribNivel} etiquetaCentro="pacientes" />
            </Card>
          )}

          {/* Resumen por sede */}
          <Card className="animate-fade-up">
            <h2 className="mb-4 font-display text-xl font-semibold text-texto-principal">
              Próximas por sede
            </h2>
            {datos.sedes.length === 0 ? (
              <EstadoVacio texto="Sin sedes configuradas." />
            ) : (
              <ul className="space-y-3">
                {datos.sedes.map((s) => (
                  <li key={s.nombre} className="flex items-center gap-3">
                    <span className="h-9 w-1.5 flex-none rounded-full" style={{ backgroundColor: s.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-texto-principal">{s.nombre}</p>
                      <p className="text-xs text-texto-secundario">
                        {s.total} {s.total === 1 ? "cita próxima" : "citas próximas"}
                      </p>
                    </div>
                    <span className="font-display text-2xl font-semibold" style={{ color: s.color }}>
                      {s.total}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Próximas citas */}
          <Card className="animate-fade-up">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-texto-principal">Próximas citas</h2>
              <Link href="/panel/agenda?vista=proximas" className="text-sm text-rosa-principal hover:text-rosa-hover">
                Ver todas →
              </Link>
            </div>
            {datos.proximas.length === 0 ? (
              <EstadoVacio texto="No hay próximas citas." />
            ) : (
              <ul className="space-y-2.5">
                {datos.proximas.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 text-sm">
                    <span className="w-14 flex-none text-xs text-texto-secundario">
                      {formatearFecha(c.fecha).slice(0, 5)}
                    </span>
                    <span className="w-16 flex-none font-medium text-texto-principal">
                      {c.hora_inicio.slice(0, 5)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-texto-principal">
                      {c.paciente ? `${c.paciente.apellidos}, ${c.paciente.nombres}` : "Paciente"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------- Panel de insights inteligentes ----------
function PanelInsights({ insights, sinPacientes }: { insights: InsightItem[]; sinPacientes: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="tarjeta relative overflow-hidden !p-6"
    >
      {/* aura decorativa */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
        style={{ background: "var(--aurora-1)" }}
      />
      <div className="relative">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--tarjeta)]">
            <HeartMark className="h-4 w-4 animate-heart-pulse" />
          </span>
          <h2 className="font-display text-xl font-semibold text-texto-principal">
            Inteligencia de tu consulta
          </h2>
        </div>

        {insights.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <HeartMark className="h-8 w-8 opacity-60" />
            <p className="max-w-md text-sm text-texto-secundario">
              {sinPacientes
                ? "Registra tus primeros pacientes para ver los insights de tu consulta."
                : "Aún no hay suficiente información para resumir. A medida que registres pacientes y citas, aquí aparecerán los insights."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {insights.map((x, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.09 }}
                className="flex items-start gap-3 rounded-suave border border-[var(--borde)] bg-[var(--superficie)] p-3.5"
              >
                <span
                  className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full"
                  style={{ backgroundColor: `${x.color}18`, color: x.color }}
                >
                  <Icono nombre={x.icono} className="h-4 w-4" />
                </span>
                <p className="text-sm leading-relaxed text-texto-principal">
                  {x.pre}{" "}
                  <strong className="font-semibold" style={{ color: x.color }}>
                    {x.fuerte}
                  </strong>{" "}
                  {x.post}
                </p>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}

function ListaCita({ c }: { c: CitaResumen }) {
  const color = COLOR_ESTADO[c.estado as keyof typeof COLOR_ESTADO];
  return (
    <li className="flex items-center gap-4 py-3">
      <div className="w-16 flex-none">
        <p className="font-display text-base font-semibold text-texto-principal">
          {formatearHora(c.hora_inicio).replace(" ", "")}
        </p>
      </div>
      <div className="h-9 w-1 flex-none rounded-full" style={{ backgroundColor: c.sede?.color ?? "#B14A73" }} />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium text-texto-principal ${c.estado === "cancelada" ? "line-through opacity-60" : ""}`}>
          {c.paciente ? `${c.paciente.apellidos}, ${c.paciente.nombres}` : "Paciente"}
        </p>
        <p className="truncate text-xs text-texto-secundario">
          {ETIQUETA_TIPO[c.tipo as keyof typeof ETIQUETA_TIPO]} · {c.sede?.nombre}
        </p>
      </div>
      <span
        className="flex-none rounded-full px-2.5 py-1 text-xs font-medium"
        style={{ backgroundColor: `${color}1e`, color }}
      >
        {ETIQUETA_ESTADO[c.estado as keyof typeof ETIQUETA_ESTADO]}
      </span>
    </li>
  );
}

function AlertaTile({
  color,
  icono,
  etiqueta,
  valor,
}: {
  color: string;
  icono: string;
  etiqueta: string;
  valor: number;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-suave border p-3 transition-transform hover:-translate-y-0.5"
      style={{ borderColor: `${color}44`, backgroundColor: `${color}10` }}
    >
      <span
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {icono}
      </span>
      <span className="flex-1 text-sm text-texto-principal">{etiqueta}</span>
      <span className="font-display text-2xl font-semibold" style={{ color }}>
        {valor}
      </span>
    </div>
  );
}

function EstadoVacio({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <HeartMark className="h-7 w-7 opacity-60" />
      <p className="text-sm text-texto-secundario">{texto}</p>
    </div>
  );
}
