"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirUsuaria } from "@/lib/auth";
import { puedeUI } from "@/lib/permissions";
import { limitarTasa } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";
import { generarPdfReporte } from "@/lib/pdf-reporte";
import {
  ETIQUETA_TIPO_REPORTE,
  construirMensaje,
  snapConsulta,
  snapEstudio,
  snapGeneral,
  type ContenidoReporte,
} from "@/lib/reportes";
import { ETIQUETA_SEXO } from "@/lib/cardio";
import { calcularEdad, formatearFecha, formatearFechaHora } from "@/lib/formato";
import type {
  TipoReporte,
  Paciente,
  Consulta,
  Estudio,
} from "@/types/database";

export interface ResultadoReporte {
  ok: boolean;
  error?: string;
  id?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;
const TIPOS: TipoReporte[] = ["resumen_consulta", "resultado_estudio", "reporte_general"];

export async function generarReporte(
  pacienteId: string,
  formData: FormData,
): Promise<ResultadoReporte> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "reportes", "crear")) {
    return { ok: false, error: "No tienes permiso para generar reportes." };
  }
  if (!UUID.test(pacienteId)) return { ok: false, error: "Paciente inválido." };

  const tipo = (formData.get("tipo") as string | null)?.trim() as TipoReporte;
  if (!TIPOS.includes(tipo)) return { ok: false, error: "Tipo de reporte inválido." };

  const consultaId = (formData.get("consulta_id") as string | null)?.trim() || null;
  const estudioId = (formData.get("estudio_id") as string | null)?.trim() || null;

  const permitido = await limitarTasa(`generar-reporte:${usuaria.id}`, 60, 3600);
  if (!permitido) return { ok: false, error: "Demasiadas solicitudes. Intenta más tarde." };

  const supabase = await createClient();

  const { data: pacData } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", pacienteId)
    .single();
  if (!pacData) return { ok: false, error: "No se encontró el paciente." };
  const p = pacData as Paciente;

  const paciente = {
    nombre: `${p.nombres} ${p.apellidos}`,
    cedula: p.cedula,
    edad: calcularEdad(p.fecha_nacimiento),
    sexo: p.sexo ? ETIQUETA_SEXO[p.sexo] : null,
  };

  const contenido: ContenidoReporte = { paciente };
  let titulo = ETIQUETA_TIPO_REPORTE[tipo];
  let fechaReporte = new Date().toISOString().slice(0, 10);

  if (tipo === "resumen_consulta") {
    if (!consultaId || !UUID.test(consultaId)) return { ok: false, error: "Selecciona una consulta." };
    const { data: coData } = await supabase
      .from("consultas")
      .select("*")
      .eq("id", consultaId)
      .eq("paciente_id", pacienteId)
      .single();
    if (!coData) return { ok: false, error: "No se encontró la consulta." };
    const co = coData as Consulta;
    const snap = snapConsulta(co);
    contenido.consulta = snap;
    titulo = `Resumen de consulta — ${snap.fecha}`;
    fechaReporte = co.fecha;
  } else if (tipo === "resultado_estudio") {
    if (!estudioId || !UUID.test(estudioId)) return { ok: false, error: "Selecciona un estudio." };
    const { data: esData } = await supabase
      .from("estudios_cardiologicos")
      .select("*")
      .eq("id", estudioId)
      .eq("paciente_id", pacienteId)
      .single();
    if (!esData) return { ok: false, error: "No se encontró el estudio." };
    const e = esData as Estudio;
    const snap = snapEstudio(e);
    contenido.estudio = snap;
    titulo = `Resultado de ${snap.tipo} — ${snap.fecha}`;
    fechaReporte = e.fecha_estudio;
  } else {
    // reporte_general
    const { data: ultimasRaw } = await supabase
      .from("consultas")
      .select("fecha, motivo, diagnosticos")
      .eq("paciente_id", pacienteId)
      .order("fecha", { ascending: false })
      .limit(5);
    const ultimas = (ultimasRaw as Pick<Consulta, "fecha" | "motivo" | "diagnosticos">[] | null) ?? [];
    contenido.general = snapGeneral(p, ultimas);
    titulo = `Reporte general — ${formatearFecha(fechaReporte)}`;
  }

  const fechaTexto = formatearFecha(fechaReporte);
  const resumenTexto = construirMensaje(tipo, contenido, fechaTexto);

  // Insertar la fila (sin PDF todavía) para obtener el id y armar la ruta.
  const { data: fila, error: errIns } = await supabase
    .from("reportes")
    .insert({
      paciente_id: pacienteId,
      tipo,
      titulo,
      fecha: fechaReporte,
      consulta_id: tipo === "resumen_consulta" ? consultaId : null,
      estudio_id: tipo === "resultado_estudio" ? estudioId : null,
      contenido: contenido as never,
      resumen_texto: resumenTexto,
      created_by: usuaria.id,
    } as never)
    .select("id")
    .single();

  if (errIns || !fila) return { ok: false, error: "No se pudo generar el reporte." };
  const id = fila.id as string;

  // Generar y subir el PDF.
  try {
    const bytes = await generarPdfReporte({
      tipo,
      titulo,
      contenido,
      fechaTexto,
      generadoPor: usuaria.nombre_completo,
      generadoFechaTexto: formatearFechaHora(new Date()),
    });
    const ruta = `${pacienteId}/${id}.pdf`;
    const { error: errSubida } = await supabase.storage
      .from("reportes")
      .upload(ruta, Buffer.from(bytes), { contentType: "application/pdf", upsert: true });
    if (!errSubida) {
      await supabase.from("reportes").update({ pdf_path: ruta } as never).eq("id", id);
    }
  } catch {
    // Si el PDF falla, el reporte queda guardado y se puede regenerar.
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "generar_reporte",
    entidad: "reportes",
    entidadId: id,
    metadata: { paciente_id: pacienteId, tipo },
  });

  revalidatePath(`/panel/pacientes/${pacienteId}`);
  return { ok: true, id };
}

export async function eliminarReporte(
  id: string,
  pacienteId: string,
): Promise<ResultadoReporte> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "reportes", "borrar")) {
    return { ok: false, error: "No tienes permiso para eliminar reportes." };
  }
  if (!UUID.test(id)) return { ok: false, error: "Reporte inválido." };

  const supabase = await createClient();
  // Borra el PDF del bucket (si existe) y luego la fila.
  const { data: rep } = await supabase.from("reportes").select("pdf_path").eq("id", id).single();
  const pdfPath = (rep as { pdf_path: string | null } | null)?.pdf_path ?? null;

  const { error } = await supabase.from("reportes").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar el reporte." };
  if (pdfPath) await supabase.storage.from("reportes").remove([pdfPath]);

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "eliminar_reporte",
    entidad: "reportes",
    entidadId: id,
    metadata: { paciente_id: pacienteId },
  });

  revalidatePath(`/panel/pacientes/${pacienteId}`);
  return { ok: true };
}
