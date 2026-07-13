"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alerta } from "@/components/ui/Alerta";
import { crearCita, actualizarCita } from "@/app/panel/agenda/acciones";
import { TIPOS_CONSULTA, DIAS_SEMANA, formatearHora, fechaDesdeClave } from "@/lib/agenda";
import type { Sede, SedeHorario, TipoConsulta } from "@/types/database";
import type { CitaConRel, PacienteOpcion } from "@/app/panel/agenda/page";

interface Props {
  modo: "crear" | "editar";
  cita?: CitaConRel;
  sedes: Sede[];
  horarios: SedeHorario[];
  pacientes: PacienteOpcion[];
  prefill?: { fecha?: string; sede_id?: string; hora_inicio?: string; paciente_id?: string };
  onDone: () => void;
  onCancel: () => void;
}

export function FormularioCita({
  modo,
  cita,
  sedes,
  horarios,
  pacientes,
  prefill,
  onDone,
  onCancel,
}: Props) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paciente (buscador)
  const prePaciente = prefill?.paciente_id
    ? pacientes.find((p) => p.id === prefill.paciente_id)
    : undefined;
  const [pacienteId, setPacienteId] = useState(cita?.paciente_id ?? prefill?.paciente_id ?? "");
  const [busqueda, setBusqueda] = useState(
    cita?.paciente
      ? `${cita.paciente.apellidos}, ${cita.paciente.nombres}`
      : prePaciente
        ? `${prePaciente.apellidos}, ${prePaciente.nombres}`
        : "",
  );
  const [abiertaLista, setAbiertaLista] = useState(false);

  const [sedeId, setSedeId] = useState(cita?.sede_id ?? prefill?.sede_id ?? sedes[0]?.id ?? "");
  const [fecha, setFecha] = useState(cita?.fecha ?? prefill?.fecha ?? "");
  const [horaInicio, setHoraInicio] = useState(
    cita ? cita.hora_inicio.slice(0, 5) : prefill?.hora_inicio ?? "",
  );
  const [tipo, setTipo] = useState<TipoConsulta>(cita?.tipo ?? "seguimiento");
  const defDuracion = TIPOS_CONSULTA.find((t) => t.valor === tipo)?.duracion ?? 30;
  const [duracion, setDuracion] = useState<number>(
    cita ? minutosEntre(cita.hora_inicio, cita.hora_fin) : defDuracion,
  );
  const [motivo, setMotivo] = useState(cita?.motivo ?? "");
  const [notas, setNotas] = useState(cita?.notas ?? "");

  const pacientesFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return pacientes.slice(0, 8);
    return pacientes
      .filter(
        (p) =>
          `${p.nombres} ${p.apellidos}`.toLowerCase().includes(t) ||
          (p.cedula ?? "").toLowerCase().includes(t),
      )
      .slice(0, 8);
  }, [busqueda, pacientes]);

  // Pista de horario de la sede para la fecha elegida
  const pistaHorario = useMemo(() => {
    if (!sedeId || !fecha) return null;
    const dia = fechaDesdeClave(fecha).getDay();
    const h = horarios.find((x) => x.sede_id === sedeId && x.dia_semana === dia);
    if (!h) return { atiende: false, texto: `No atiende los ${DIAS_SEMANA[dia]?.toLowerCase()}` };
    return {
      atiende: true,
      texto: `Atiende ${DIAS_SEMANA[dia]}: ${formatearHora(h.hora_inicio)} – ${formatearHora(h.hora_fin)}`,
    };
  }, [sedeId, fecha, horarios]);

  function elegirTipo(t: TipoConsulta) {
    setTipo(t);
    setDuracion(TIPOS_CONSULTA.find((x) => x.valor === t)?.duracion ?? 30);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pacienteId) return setError("Selecciona un paciente.");
    if (!fecha) return setError("Elige la fecha.");
    if (!horaInicio) return setError("Elige la hora de inicio.");

    const fd = new FormData();
    fd.set("paciente_id", pacienteId);
    fd.set("sede_id", sedeId);
    fd.set("fecha", fecha);
    fd.set("hora_inicio", horaInicio);
    fd.set("duracion", String(duracion));
    fd.set("tipo", tipo);
    fd.set("motivo", motivo);
    fd.set("notas", notas);

    setCargando(true);
    const res = modo === "crear" ? await crearCita(fd) : await actualizarCita(cita!.id, fd);
    setCargando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo guardar.");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      {/* Paciente */}
      <div className="relative">
        <label className="mb-1.5 block text-sm text-texto-secundario">
          Paciente <span className="text-estado-urgente">*</span>
        </label>
        <input
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPacienteId("");
            setAbiertaLista(true);
          }}
          onFocus={() => setAbiertaLista(true)}
          placeholder="Buscar por nombre o cédula…"
          className="campo"
          autoComplete="off"
        />
        {abiertaLista && !pacienteId && pacientesFiltrados.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-suave border border-[var(--borde)] bg-[var(--superficie)] shadow-tarjeta">
            {pacientesFiltrados.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPacienteId(p.id);
                    setBusqueda(`${p.apellidos}, ${p.nombres}`);
                    setAbiertaLista(false);
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-[var(--superficie-suave)]"
                >
                  <span className="font-medium text-texto-principal">
                    {p.apellidos}, {p.nombres}
                  </span>
                  {p.cedula && <span className="text-xs text-texto-secundario">{p.cedula}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sede + tipo */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">Sede</label>
          <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className="campo">
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">Tipo de consulta</label>
          <select
            value={tipo}
            onChange={(e) => elegirTipo(e.target.value as TipoConsulta)}
            className="campo"
          >
            {TIPOS_CONSULTA.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fecha + hora + duración */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="campo" required />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">Hora inicio</label>
          <input
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            className="campo"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-texto-secundario">Duración</label>
          <select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} className="campo">
            {[20, 30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </div>
      </div>

      {pistaHorario && (
        <p className={`text-xs ${pistaHorario.atiende ? "text-texto-secundario" : "text-estado-urgente"}`}>
          {pistaHorario.atiende ? "🕑 " : "⚠ "}
          {pistaHorario.texto}
        </p>
      )}

      <div>
        <label className="mb-1.5 block text-sm text-texto-secundario">Motivo (opcional)</label>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="campo" maxLength={300} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-texto-secundario">Notas (opcional)</label>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="campo resize-y" />
      </div>

      {error && <Alerta tono="urgente">{error}</Alerta>}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" cargando={cargando}>
          {modo === "crear" ? "Agendar cita" : "Guardar cambios"}
        </Button>
        <Button type="button" variante="secundario" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function minutosEntre(inicio: string, fin: string): number {
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  return (h2! * 60 + m2!) - (h1! * 60 + m1!);
}
