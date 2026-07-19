"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  sedePreferida?: string | null;
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
  sedePreferida,
  onDone,
  onCancel,
}: Props) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cajaPaciente = useRef<HTMLDivElement>(null);

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

  const pacienteSel = pacientes.find((p) => p.id === pacienteId);
  const alergiaPaciente = (pacienteSel?.alergias ?? cita?.paciente?.alergias ?? "").trim();

  const [sedeId, setSedeId] = useState(
    cita?.sede_id ?? prefill?.sede_id ?? sedePreferida ?? sedes[0]?.id ?? "",
  );
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

  // Si hay un paciente ya seleccionado y el texto coincide con su nombre, no se
  // filtra (se muestra la lista completa para poder cambiarlo con comodidad).
  const pacientesFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const nombreSel = pacienteId
      ? `${pacienteSel?.apellidos ?? ""}, ${pacienteSel?.nombres ?? ""}`.toLowerCase()
      : "";
    const filtrar = t !== "" && t !== nombreSel;
    const base = filtrar
      ? pacientes.filter(
          (p) =>
            `${p.nombres} ${p.apellidos}`.toLowerCase().includes(t) ||
            (p.cedula ?? "").toLowerCase().includes(t),
        )
      : pacientes;
    return base.slice(0, 50); // scroll dentro del desplegable
  }, [busqueda, pacientes, pacienteId, pacienteSel]);

  // Cerrar el desplegable al hacer clic fuera.
  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (cajaPaciente.current && !cajaPaciente.current.contains(e.target as Node)) {
        setAbiertaLista(false);
      }
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

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
      {/* Paciente — desplegable: al enfocar muestra la lista completa; filtra al escribir */}
      <div className="relative" ref={cajaPaciente}>
        <label className="mb-1.5 block text-sm text-texto-secundario">
          Paciente <span className="text-estado-urgente">*</span>
        </label>
        <div className="relative">
          <input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPacienteId("");
              setAbiertaLista(true);
            }}
            onFocus={() => setAbiertaLista(true)}
            placeholder="Haz clic para elegir, o escribe nombre o cédula…"
            className="campo pr-9"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setAbiertaLista((v) => !v)}
            aria-label="Mostrar pacientes"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-texto-secundario transition-transform"
            style={{ transform: `translateY(-50%) rotate(${abiertaLista ? 180 : 0}deg)` }}
          >
            ▾
          </button>
        </div>
        {abiertaLista && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-suave border border-[var(--borde)] bg-[var(--superficie)] shadow-tarjeta-hover">
            <p className="border-b border-[var(--borde)] px-3 py-1.5 text-[11px] uppercase tracking-wide text-texto-secundario">
              {pacientes.length} {pacientes.length === 1 ? "paciente" : "pacientes"} · elige o escribe para filtrar
            </p>
            {pacientesFiltrados.length === 0 ? (
              <p className="px-3 py-3 text-sm text-texto-secundario">
                Sin coincidencias.
              </p>
            ) : (
              <ul className="max-h-64 overflow-auto">
                {pacientesFiltrados.map((p) => {
                  const sel = p.id === pacienteId;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPacienteId(p.id);
                          setBusqueda(`${p.apellidos}, ${p.nombres}`);
                          setAbiertaLista(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--superficie-suave)]"
                        style={sel ? { backgroundColor: "var(--rosa-pastel)" } : undefined}
                      >
                        <span className="flex flex-col">
                          <span className="font-medium text-texto-principal">
                            {p.apellidos}, {p.nombres}
                          </span>
                          {p.cedula && (
                            <span className="text-xs text-texto-secundario">
                              Cédula {p.cedula}
                            </span>
                          )}
                        </span>
                        {sel && <span className="text-rosa-principal">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Alerta clínica: alergia crítica del paciente */}
      {alergiaPaciente !== "" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-suave border p-3"
          style={{ borderColor: "#E0567A", backgroundColor: "#E0567A14" }}
        >
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-estado-urgente text-xs font-bold text-white">
            !
          </span>
          <p className="text-sm text-texto-principal">
            <strong className="text-estado-urgente">Alergia registrada:</strong> {alergiaPaciente}
          </p>
        </div>
      )}

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
