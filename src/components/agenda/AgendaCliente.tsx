"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { HeartMark } from "@/components/ui/HeartMark";
import { FormularioCita } from "@/components/agenda/FormularioCita";
import { cambiarEstadoCita, eliminarCita } from "@/app/panel/agenda/acciones";
import {
  ETIQUETA_TIPO,
  ETIQUETA_ESTADO,
  COLOR_ESTADO,
  ESTADOS_CITA,
  DIAS_CORTOS,
  MESES,
  formatearHora,
  fechaDesdeClave,
  claveFecha,
  diasDeSemana,
  diasDeMes,
  fechaLarga,
  esHoy,
  mismoDia,
} from "@/lib/agenda";
import type { Sede, SedeHorario, EstadoCita } from "@/types/database";
import type { CitaConRel, PacienteOpcion, Vista } from "@/app/panel/agenda/page";

interface Props {
  vista: Vista;
  anclaClave: string;
  citas: CitaConRel[];
  sedes: Sede[];
  horarios: SedeHorario[];
  pacientes: PacienteOpcion[];
  permisos: { crear: boolean; editar: boolean; borrar: boolean };
  puedeCrearConsulta?: boolean;
  sedePreferida?: string | null;
  nuevoPacienteId?: string;
}

const VISTAS: { v: Vista; t: string }[] = [
  { v: "dia", t: "Día" },
  { v: "semana", t: "Semana" },
  { v: "mes", t: "Mes" },
  { v: "proximas", t: "Próximas" },
];

export function AgendaCliente(props: Props) {
  const { vista, anclaClave, citas, sedes, horarios, pacientes, permisos, puedeCrearConsulta, sedePreferida, nuevoPacienteId } = props;
  const router = useRouter();
  const ancla = fechaDesdeClave(anclaClave);

  const [filtroSede, setFiltroSede] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [q, setQ] = useState("");

  // Si se llega desde la ficha (?nuevo=<id>), abrir el modal de nueva cita.
  const [modal, setModal] = useState<null | "crear" | "editar" | "detalle">(
    nuevoPacienteId && permisos.crear ? "crear" : null,
  );
  const [citaSel, setCitaSel] = useState<CitaConRel | null>(null);
  const [prefill, setPrefill] = useState<
    { fecha?: string; sede_id?: string; paciente_id?: string } | undefined
  >(nuevoPacienteId ? { paciente_id: nuevoPacienteId } : undefined);

  const citasFiltradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return citas.filter((c) => {
      if (filtroSede && c.sede_id !== filtroSede) return false;
      if (filtroEstado && c.estado !== filtroEstado) return false;
      if (t) {
        const nombre = c.paciente ? `${c.paciente.nombres} ${c.paciente.apellidos}`.toLowerCase() : "";
        const ced = c.paciente?.cedula?.toLowerCase() ?? "";
        if (!nombre.includes(t) && !ced.includes(t)) return false;
      }
      return true;
    });
  }, [citas, filtroSede, filtroEstado, q]);

  function irA(v: Vista, fechaClave: string) {
    router.push(`/panel/agenda?vista=${v}&fecha=${fechaClave}`);
  }
  function navegar(dir: -1 | 0 | 1) {
    if (dir === 0) return irA(vista, claveFecha(new Date()));
    const d = new Date(ancla);
    if (vista === "dia") d.setDate(d.getDate() + dir);
    else if (vista === "semana") d.setDate(d.getDate() + dir * 7);
    else if (vista === "mes") d.setMonth(d.getMonth() + dir);
    irA(vista, claveFecha(d));
  }

  function abrirCrear(pre?: { fecha?: string; sede_id?: string }) {
    setPrefill(pre);
    setCitaSel(null);
    setModal("crear");
  }
  function abrirDetalle(c: CitaConRel) {
    setCitaSel(c);
    setModal("detalle");
  }

  const titulo = useMemo(() => {
    if (vista === "dia") return fechaLarga(ancla);
    if (vista === "mes") return `${MESES[ancla.getMonth()]} ${ancla.getFullYear()}`;
    if (vista === "proximas") return "Próximas citas";
    const dias = diasDeSemana(ancla);
    const a = dias[0]!;
    const b = dias[6]!;
    return `${a.getDate()} ${MESES[a.getMonth()]?.slice(0, 3)} – ${b.getDate()} ${MESES[b.getMonth()]?.slice(0, 3)}`;
  }, [vista, ancla]);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <header className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-rosa-medio">
            <HeartMark className="h-4 w-4" />
            <span>Agenda de citas</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold capitalize text-texto-principal">
            {titulo}
          </h1>
        </div>
        {permisos.crear && (
          <Button onClick={() => abrirCrear()}>＋ Nueva cita</Button>
        )}
      </header>

      {/* Barra de control */}
      <div className="tarjeta flex flex-wrap items-center gap-3 !p-3">
        {/* Cambio de vista */}
        <div className="flex rounded-suave border border-[var(--borde)] p-0.5">
          {VISTAS.map((x) => (
            <button
              key={x.v}
              onClick={() => irA(x.v, anclaClave)}
              className={`rounded-[10px] px-3 py-1.5 text-sm font-medium transition-colors ${
                vista === x.v
                  ? "bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] text-white"
                  : "text-texto-secundario hover:text-rosa-principal"
              }`}
            >
              {x.t}
            </button>
          ))}
        </div>

        {/* Navegación de fecha (no en próximas) */}
        {vista !== "proximas" && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => navegar(-1)}
              aria-label="Anterior"
              className="flex h-8 w-8 items-center justify-center rounded-suave border border-[var(--borde)] text-texto-secundario hover:text-rosa-principal"
            >
              ‹
            </button>
            <button
              onClick={() => navegar(0)}
              className="rounded-suave border border-[var(--borde)] px-3 py-1.5 text-sm text-texto-secundario hover:text-rosa-principal"
            >
              Hoy
            </button>
            <button
              onClick={() => navegar(1)}
              aria-label="Siguiente"
              className="flex h-8 w-8 items-center justify-center rounded-suave border border-[var(--borde)] text-texto-secundario hover:text-rosa-principal"
            >
              ›
            </button>
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar paciente…"
            className="campo !w-44 !py-1.5 !text-sm"
            aria-label="Buscar paciente"
          />
          <select
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
            className="campo !w-auto !py-1.5 !text-sm"
            aria-label="Filtrar por sede"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="campo !w-auto !py-1.5 !text-sm"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {ESTADOS_CITA.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO[e]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vista activa */}
      {vista === "dia" && (
        <VistaDia citas={citasFiltradas} ancla={ancla} onSelect={abrirDetalle} onNueva={permisos.crear ? abrirCrear : undefined} />
      )}
      {vista === "semana" && (
        <VistaSemana citas={citasFiltradas} ancla={ancla} onSelect={abrirDetalle} onDia={(c) => irA("dia", c)} />
      )}
      {vista === "mes" && (
        <VistaMes citas={citasFiltradas} ancla={ancla} onSelect={abrirDetalle} onDia={(c) => irA("dia", c)} />
      )}
      {vista === "proximas" && <VistaProximas citas={citasFiltradas} onSelect={abrirDetalle} />}

      {/* Modal crear / editar */}
      <Modal
        titulo={modal === "editar" ? "Editar cita" : "Nueva cita"}
        abierto={modal === "crear" || modal === "editar"}
        onClose={() => setModal(null)}
        ancho="max-w-2xl"
      >
        <FormularioCita
          modo={modal === "editar" ? "editar" : "crear"}
          cita={modal === "editar" ? citaSel ?? undefined : undefined}
          sedes={sedes}
          horarios={horarios}
          pacientes={pacientes}
          prefill={prefill}
          sedePreferida={sedePreferida}
          onDone={() => setModal(null)}
          onCancel={() => setModal(null)}
        />
      </Modal>

      {/* Modal detalle */}
      <Modal titulo="Detalle de la cita" abierto={modal === "detalle"} onClose={() => setModal(null)}>
        {citaSel && (
          <Detalle
            cita={citaSel}
            permisos={permisos}
            puedeCrearConsulta={puedeCrearConsulta ?? false}
            onEditar={() => setModal("editar")}
            onCerrar={() => setModal(null)}
          />
        )}
      </Modal>
    </div>
  );
}

// ---------- Chip de cita ----------
function CitaChip({ cita, onClick }: { cita: CitaConRel; onClick: () => void }) {
  const color = cita.sede?.color ?? "var(--rosa-principal)";
  const cancelada = cita.estado === "cancelada";
  return (
    <button
      onClick={onClick}
      className={`group w-full rounded-[10px] border border-[var(--borde)] bg-[var(--superficie)] px-2.5 py-1.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-tarjeta ${
        cancelada ? "opacity-55" : ""
      }`}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-semibold text-texto-principal">
          {cita.hora_inicio.slice(0, 5)}
        </span>
        <span
          className="h-1.5 w-1.5 flex-none rounded-full"
          style={{ backgroundColor: COLOR_ESTADO[cita.estado] }}
          title={ETIQUETA_ESTADO[cita.estado]}
        />
      </div>
      <p className={`truncate text-xs text-texto-principal ${cancelada ? "line-through" : ""}`}>
        {cita.paciente ? `${cita.paciente.apellidos}, ${cita.paciente.nombres}` : "Paciente"}
      </p>
      <p className="truncate text-[11px] text-texto-secundario">{ETIQUETA_TIPO[cita.tipo]}</p>
    </button>
  );
}

function EstadoPildora({ estado }: { estado: EstadoCita }) {
  const c = COLOR_ESTADO[estado];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${c}1e`, color: c }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

function VacioDia({ onNueva }: { onNueva?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <HeartMark className="h-8 w-8 opacity-70" />
      <p className="text-sm text-texto-secundario">No hay citas para este día.</p>
      {onNueva && (
        <button onClick={onNueva} className="text-sm text-rosa-principal hover:text-rosa-hover">
          Agendar una cita →
        </button>
      )}
    </div>
  );
}

// ---------- Vista Día ----------
function VistaDia({
  citas,
  ancla,
  onSelect,
  onNueva,
}: {
  citas: CitaConRel[];
  ancla: Date;
  onSelect: (c: CitaConRel) => void;
  onNueva?: (pre?: { fecha?: string }) => void;
}) {
  const delDia = citas
    .filter((c) => mismoDia(fechaDesdeClave(c.fecha), ancla))
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  return (
    <div className="tarjeta !p-0">
      {delDia.length === 0 ? (
        <VacioDia onNueva={onNueva ? () => onNueva({ fecha: claveFecha(ancla) }) : undefined} />
      ) : (
        <ul className="divide-y divide-[var(--borde)]">
          {delDia.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onSelect(c)}
                className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-[var(--superficie-suave)]"
              >
                <div className="w-24 flex-none">
                  <p className="font-display text-lg font-semibold text-texto-principal">
                    {formatearHora(c.hora_inicio)}
                  </p>
                  <p className="text-xs text-texto-secundario">
                    {c.hora_inicio.slice(0, 5)}–{c.hora_fin.slice(0, 5)}
                  </p>
                </div>
                <div
                  className="h-10 w-1 flex-none rounded-full"
                  style={{ backgroundColor: c.sede?.color ?? "var(--rosa-principal)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium text-texto-principal ${c.estado === "cancelada" ? "line-through opacity-60" : ""}`}>
                    {c.paciente ? `${c.paciente.apellidos}, ${c.paciente.nombres}` : "Paciente"}
                  </p>
                  <p className="truncate text-sm text-texto-secundario">
                    {ETIQUETA_TIPO[c.tipo]} · {c.sede?.nombre}
                  </p>
                </div>
                <EstadoPildora estado={c.estado} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Vista Semana ----------
function VistaSemana({
  citas,
  ancla,
  onSelect,
  onDia,
}: {
  citas: CitaConRel[];
  ancla: Date;
  onSelect: (c: CitaConRel) => void;
  onDia: (clave: string) => void;
}) {
  const dias = diasDeSemana(ancla);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {dias.map((d) => {
        const delDia = citas
          .filter((c) => mismoDia(fechaDesdeClave(c.fecha), d))
          .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
        return (
          <div key={claveFecha(d)} className="tarjeta min-h-[8rem] !p-2.5">
            <button
              onClick={() => onDia(claveFecha(d))}
              className={`mb-2 flex w-full items-center justify-between rounded-suave px-1.5 py-1 text-left ${
                esHoy(d) ? "bg-[var(--tarjeta)]" : ""
              }`}
            >
              <span className="text-xs font-medium text-texto-secundario">{DIAS_CORTOS[d.getDay()]}</span>
              <span
                className={`text-sm font-semibold ${esHoy(d) ? "text-rosa-principal" : "text-texto-principal"}`}
              >
                {d.getDate()}
              </span>
            </button>
            <div className="space-y-1.5">
              {delDia.map((c) => (
                <CitaChip key={c.id} cita={c} onClick={() => onSelect(c)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Vista Mes ----------
function VistaMes({
  citas,
  ancla,
  onSelect,
  onDia,
}: {
  citas: CitaConRel[];
  ancla: Date;
  onSelect: (c: CitaConRel) => void;
  onDia: (clave: string) => void;
}) {
  const semanas = diasDeMes(ancla);
  return (
    <div className="tarjeta overflow-hidden !p-0">
      {/* En móvil el mes se desplaza horizontalmente en vez de apretarse. */}
      <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-7 border-b border-[var(--borde)] bg-[var(--superficie-suave)] md:min-w-0">
        {DIAS_CORTOS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-texto-secundario">
            {d}
          </div>
        ))}
      </div>
      <div className="grid min-w-[720px] grid-cols-7 md:min-w-0">
        {semanas.flat().map((d) => {
          const delMes = d.getMonth() === ancla.getMonth();
          const delDia = citas
            .filter((c) => mismoDia(fechaDesdeClave(c.fecha), d))
            .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
          return (
            <div
              key={claveFecha(d)}
              className={`min-h-[6.5rem] border-b border-r border-[var(--borde)] p-1.5 ${
                delMes ? "" : "bg-[var(--superficie-suave)]/40"
              }`}
            >
              <button
                onClick={() => onDia(claveFecha(d))}
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors hover:bg-[var(--tarjeta)] ${
                  esHoy(d)
                    ? "bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] text-white"
                    : delMes
                      ? "text-texto-principal"
                      : "text-texto-secundario"
                }`}
              >
                {d.getDate()}
              </button>
              <div className="space-y-1">
                {delDia.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className={`block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] transition-colors hover:brightness-95 ${
                      c.estado === "cancelada" ? "line-through opacity-55" : ""
                    }`}
                    style={{
                      backgroundColor: `${c.sede?.color ?? "#B14A73"}18`,
                      color: "var(--texto-principal)",
                    }}
                  >
                    {c.hora_inicio.slice(0, 5)} {c.paciente?.apellidos ?? "Paciente"}
                  </button>
                ))}
                {delDia.length > 3 && (
                  <button
                    onClick={() => onDia(claveFecha(d))}
                    className="px-1.5 text-[11px] text-rosa-principal hover:text-rosa-hover"
                  >
                    +{delDia.length - 3} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

// ---------- Vista Próximas ----------
function VistaProximas({ citas, onSelect }: { citas: CitaConRel[]; onSelect: (c: CitaConRel) => void }) {
  const grupos = useMemo(() => {
    const m = new Map<string, CitaConRel[]>();
    for (const c of citas) {
      const arr = m.get(c.fecha) ?? [];
      arr.push(c);
      m.set(c.fecha, arr);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [citas]);

  if (grupos.length === 0) {
    return (
      <div className="tarjeta">
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <HeartMark className="h-8 w-8 opacity-70" />
          <p className="text-sm text-texto-secundario">No hay próximas citas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {grupos.map(([clave, lista]) => (
        <div key={clave}>
          <p className="mb-2 text-sm font-medium capitalize text-rosa-medio">
            {fechaLarga(fechaDesdeClave(clave))}
          </p>
          <div className="tarjeta !p-0">
            <ul className="divide-y divide-[var(--borde)]">
              {lista.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onSelect(c)}
                    className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-[var(--superficie-suave)]"
                  >
                    <span className="w-20 flex-none font-medium text-texto-principal">
                      {formatearHora(c.hora_inicio)}
                    </span>
                    <div className="h-8 w-1 flex-none rounded-full" style={{ backgroundColor: c.sede?.color ?? "#B14A73" }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-texto-principal">
                        {c.paciente ? `${c.paciente.apellidos}, ${c.paciente.nombres}` : "Paciente"}
                      </p>
                      <p className="truncate text-sm text-texto-secundario">
                        {ETIQUETA_TIPO[c.tipo]} · {c.sede?.nombre}
                      </p>
                    </div>
                    <EstadoPildora estado={c.estado} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Detalle ----------
function Detalle({
  cita,
  permisos,
  puedeCrearConsulta,
  onEditar,
  onCerrar,
}: {
  cita: CitaConRel;
  permisos: { editar: boolean; borrar: boolean };
  puedeCrearConsulta: boolean;
  onEditar: () => void;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(estado: EstadoCita) {
    setOcupado(true);
    setError(null);
    const res = await cambiarEstadoCita(cita.id, estado);
    setOcupado(false);
    if (!res.ok) return setError(res.error ?? "Error");
    router.refresh();
    onCerrar();
  }
  async function borrar() {
    if (!window.confirm("¿Eliminar esta cita? No se puede deshacer.")) return;
    setOcupado(true);
    const res = await eliminarCita(cita.id);
    setOcupado(false);
    if (!res.ok) return setError(res.error ?? "Error");
    router.refresh();
    onCerrar();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-semibold text-texto-principal">
            {cita.paciente ? `${cita.paciente.nombres} ${cita.paciente.apellidos}` : "Paciente"}
          </p>
          {cita.paciente?.telefono && (
            <p className="text-sm text-texto-secundario">{cita.paciente.telefono}</p>
          )}
        </div>
        <EstadoPildora estado={cita.estado} />
      </div>

      {(cita.paciente?.alergias ?? "").trim() !== "" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-suave border p-3"
          style={{ borderColor: "#E0567A", backgroundColor: "#E0567A14" }}
        >
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-estado-urgente text-xs font-bold text-white">
            !
          </span>
          <p className="text-sm text-texto-principal">
            <strong className="text-estado-urgente">Alergia:</strong> {cita.paciente?.alergias}
          </p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 rounded-suave bg-[var(--superficie-suave)] p-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-texto-secundario">Fecha</dt>
          <dd className="mt-0.5 capitalize text-texto-principal">{fechaLarga(fechaDesdeClave(cita.fecha))}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-texto-secundario">Horario</dt>
          <dd className="mt-0.5 text-texto-principal">
            {formatearHora(cita.hora_inicio)} – {formatearHora(cita.hora_fin)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-texto-secundario">Tipo</dt>
          <dd className="mt-0.5 text-texto-principal">{ETIQUETA_TIPO[cita.tipo]}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-texto-secundario">Sede</dt>
          <dd className="mt-0.5 text-texto-principal">{cita.sede?.nombre}</dd>
        </div>
        {cita.motivo && (
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-texto-secundario">Motivo</dt>
            <dd className="mt-0.5 text-texto-principal">{cita.motivo}</dd>
          </div>
        )}
        {cita.notas && (
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-texto-secundario">Notas</dt>
            <dd className="mt-0.5 whitespace-pre-line text-texto-principal">{cita.notas}</dd>
          </div>
        )}
      </dl>

      {cita.paciente && puedeCrearConsulta && cita.estado !== "cancelada" && (
        <Link
          href={`/panel/pacientes/${cita.paciente.id}/consultas/nueva?cita=${cita.id}`}
          className="flex items-center justify-center gap-1.5 rounded-suave bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))] px-4 py-2.5 text-sm font-medium text-white shadow-tarjeta transition-all hover:shadow-tarjeta-hover hover:brightness-105"
        >
          <HeartMark className="h-4 w-4" /> Registrar consulta
        </Link>
      )}

      {cita.paciente && (
        <Link
          href={`/panel/pacientes/${cita.paciente.id}`}
          className="inline-block text-sm text-rosa-principal hover:text-rosa-hover"
        >
          Ver ficha del paciente →
        </Link>
      )}

      {permisos.editar && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-texto-secundario">Cambiar estado</p>
          <div className="flex flex-wrap gap-2">
            {ESTADOS_CITA.map((e) => (
              <button
                key={e}
                onClick={() => cambiar(e)}
                disabled={ocupado || e === cita.estado}
                className="rounded-suave border px-2.5 py-1.5 text-xs font-medium transition-all disabled:opacity-40"
                style={{ borderColor: `${COLOR_ESTADO[e]}66`, color: COLOR_ESTADO[e] }}
              >
                {ETIQUETA_ESTADO[e]}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-estado-urgente">{error}</p>}

      <div className="flex items-center gap-2 border-t border-[var(--borde)] pt-4">
        {permisos.editar && (
          <Button variante="secundario" onClick={onEditar}>
            Editar
          </Button>
        )}
        {permisos.borrar && (
          <button
            onClick={borrar}
            disabled={ocupado}
            className="rounded-suave border border-[var(--borde)] px-4 py-2.5 text-sm text-texto-secundario transition-colors hover:border-estado-urgente hover:text-estado-urgente disabled:opacity-60"
          >
            Eliminar
          </button>
        )}
        <Button variante="fantasma" onClick={onCerrar} className="ml-auto">
          Cerrar
        </Button>
      </div>
    </div>
  );
}
