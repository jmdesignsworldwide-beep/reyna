"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirUsuaria } from "@/lib/auth";
import {
  pagoSchema,
  gastoSchema,
  categoriaGastoSchema,
} from "@/lib/validaciones";
import { limitarTasa } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";
import { puedeUI } from "@/lib/permissions";
import {
  formatearRD,
  numeroRecibo,
  ETIQUETA_METODO,
  ETIQUETA_TIPO_PAGO,
} from "@/lib/finanzas";
import { formatearFecha } from "@/lib/formato";
import { generarPdfRecibo } from "@/lib/pdf-recibo";
import type { Pago } from "@/types/database";

export interface ResultadoFinanza {
  ok: boolean;
  error?: string;
  id?: string;
}

const UUID = /^[0-9a-f-]{36}$/i;

function texto(fd: FormData, k: string): string {
  return (fd.get(k) as string | null)?.trim() ?? "";
}
function monto(fd: FormData, k: string): number {
  const v = texto(fd, k).replace(/,/g, "");
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}
function opcionUuid(fd: FormData, k: string): string | null {
  const v = texto(fd, k);
  return v && UUID.test(v) ? v : null;
}

// ---------- Recibo PDF (regenera y sube al bucket privado) ----------
async function generarYSubirRecibo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pago: Pick<
    Pago,
    | "id"
    | "recibo_numero"
    | "fecha"
    | "monto"
    | "tipo"
    | "concepto"
    | "metodo_pago"
    | "ncf"
    | "notas"
    | "paciente_id"
  >,
): Promise<string | null> {
  let nombre = "Cliente";
  let cedula: string | null = null;
  if (pago.paciente_id) {
    const { data: pac } = await supabase
      .from("pacientes")
      .select("nombres, apellidos, cedula")
      .eq("id", pago.paciente_id)
      .single();
    if (pac) {
      nombre = `${pac.nombres} ${pac.apellidos}`;
      cedula = pac.cedula;
    }
  }
  try {
    const bytes = await generarPdfRecibo({
      reciboNumero: numeroRecibo(pago.recibo_numero),
      fechaTexto: formatearFecha(pago.fecha),
      pacienteNombre: nombre,
      pacienteCedula: cedula,
      tipoTexto: ETIQUETA_TIPO_PAGO[pago.tipo],
      concepto: pago.concepto,
      montoTexto: formatearRD(pago.monto),
      metodoTexto: ETIQUETA_METODO[pago.metodo_pago],
      ncf: pago.ncf,
      notas: pago.notas,
    });
    const ruta = `${pago.id}.pdf`;
    const { error } = await supabase.storage
      .from("recibos")
      .upload(ruta, Buffer.from(bytes), {
        contentType: "application/pdf",
        upsert: true,
      });
    return error ? null : ruta;
  } catch {
    return null;
  }
}

// ============================================================
// Pagos
// ============================================================
function extraerPago(fd: FormData) {
  return {
    paciente_id: opcionUuid(fd, "paciente_id"),
    fecha: texto(fd, "fecha"),
    monto: monto(fd, "monto"),
    tipo: texto(fd, "tipo") || "consulta",
    concepto: texto(fd, "concepto"),
    metodo_pago: texto(fd, "metodo_pago") || "efectivo",
    ncf: texto(fd, "ncf"),
    notas: texto(fd, "notas"),
  };
}

export async function crearPago(formData: FormData): Promise<ResultadoFinanza> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "pagos", "crear")) {
    return { ok: false, error: "No tienes permiso para registrar pagos." };
  }
  const permitido = await limitarTasa(`crear-pago:${usuaria.id}`, 120, 3600);
  if (!permitido) return { ok: false, error: "Demasiadas solicitudes. Intenta más tarde." };

  const parseo = pagoSchema.safeParse(extraerPago(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parseo.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pagos")
    .insert({
      paciente_id: d.paciente_id,
      cita_id: opcionUuid(formData, "cita_id"),
      consulta_id: opcionUuid(formData, "consulta_id"),
      fecha: d.fecha,
      monto: d.monto,
      tipo: d.tipo,
      concepto: d.concepto || null,
      metodo_pago: d.metodo_pago,
      ncf: d.ncf || null,
      notas: d.notas || null,
      created_by: usuaria.id,
    } as never)
    .select("id, recibo_numero, fecha, monto, tipo, concepto, metodo_pago, ncf, notas, paciente_id")
    .single();

  if (error || !data) return { ok: false, error: "No se pudo registrar el pago." };
  const pago = data as unknown as Pago;

  const pdfPath = await generarYSubirRecibo(supabase, pago);
  if (pdfPath) {
    await supabase.from("pagos").update({ pdf_path: pdfPath } as never).eq("id", pago.id);
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "crear_pago",
    entidad: "pagos",
    entidadId: pago.id,
    metadata: { monto: d.monto, tipo: d.tipo, recibo: pago.recibo_numero },
  });

  if (d.paciente_id) revalidatePath(`/panel/pacientes/${d.paciente_id}`);
  revalidatePath("/panel/finanzas");
  return { ok: true, id: pago.id };
}

export async function actualizarPago(
  id: string,
  formData: FormData,
): Promise<ResultadoFinanza> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "pagos", "editar")) {
    return { ok: false, error: "No tienes permiso para editar pagos." };
  }
  if (!UUID.test(id)) return { ok: false, error: "Pago inválido." };

  const parseo = pagoSchema.safeParse(extraerPago(formData));
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parseo.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pagos")
    .update({
      paciente_id: d.paciente_id,
      fecha: d.fecha,
      monto: d.monto,
      tipo: d.tipo,
      concepto: d.concepto || null,
      metodo_pago: d.metodo_pago,
      ncf: d.ncf || null,
      notas: d.notas || null,
    } as never)
    .eq("id", id)
    .select("id, recibo_numero, fecha, monto, tipo, concepto, metodo_pago, ncf, notas, paciente_id")
    .single();

  if (error || !data) return { ok: false, error: "No se pudo actualizar el pago." };
  const pago = data as unknown as Pago;

  // Regenerar el recibo con los datos actualizados.
  const pdfPath = await generarYSubirRecibo(supabase, pago);
  if (pdfPath) {
    await supabase.from("pagos").update({ pdf_path: pdfPath } as never).eq("id", pago.id);
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "actualizar_pago",
    entidad: "pagos",
    entidadId: id,
    metadata: { monto: d.monto },
  });

  if (d.paciente_id) revalidatePath(`/panel/pacientes/${d.paciente_id}`);
  revalidatePath("/panel/finanzas");
  return { ok: true, id };
}

export async function eliminarPago(
  id: string,
  pacienteId?: string,
): Promise<ResultadoFinanza> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "pagos", "borrar")) {
    return { ok: false, error: "No tienes permiso para eliminar pagos." };
  }
  if (!UUID.test(id)) return { ok: false, error: "Pago inválido." };

  const supabase = await createClient();
  const { data: pago } = await supabase.from("pagos").select("pdf_path").eq("id", id).single();

  const { error } = await supabase.from("pagos").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar el pago." };

  if (pago?.pdf_path) await supabase.storage.from("recibos").remove([pago.pdf_path]);

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "eliminar_pago",
    entidad: "pagos",
    entidadId: id,
  });

  if (pacienteId) revalidatePath(`/panel/pacientes/${pacienteId}`);
  revalidatePath("/panel/finanzas");
  return { ok: true };
}

// ============================================================
// Gastos
// ============================================================
export async function crearGasto(formData: FormData): Promise<ResultadoFinanza> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "finanzas", "crear")) {
    return { ok: false, error: "No tienes permiso para registrar gastos." };
  }
  const permitido = await limitarTasa(`crear-gasto:${usuaria.id}`, 120, 3600);
  if (!permitido) return { ok: false, error: "Demasiadas solicitudes. Intenta más tarde." };

  const parseo = gastoSchema.safeParse({
    fecha: texto(formData, "fecha"),
    monto: monto(formData, "monto"),
    categoria_id: opcionUuid(formData, "categoria_id"),
    metodo_pago: texto(formData, "metodo_pago") || "efectivo",
    nota: texto(formData, "nota"),
  });
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parseo.data;

  const supabase = await createClient();

  // Comprobante opcional (imagen/PDF) al bucket privado.
  let comprobante_path: string | null = null;
  const file = formData.get("comprobante") as File | null;
  if (file && file.size > 0) {
    const tipos = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!tipos.includes(file.type)) {
      return { ok: false, error: "Comprobante: usa PDF, JPG, PNG o WEBP." };
    }
    if (file.size > 15 * 1024 * 1024) {
      return { ok: false, error: "El comprobante supera 15 MB." };
    }
    const limpio = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
    const ruta = `${crypto.randomUUID()}-${limpio}`;
    const { error: errSub } = await supabase.storage
      .from("comprobantes")
      .upload(ruta, file, { contentType: file.type, upsert: false });
    if (!errSub) comprobante_path = ruta;
  }

  const { data, error } = await supabase
    .from("gastos")
    .insert({
      fecha: d.fecha,
      monto: d.monto,
      categoria_id: d.categoria_id,
      metodo_pago: d.metodo_pago,
      nota: d.nota || null,
      comprobante_path,
      created_by: usuaria.id,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    if (comprobante_path) await supabase.storage.from("comprobantes").remove([comprobante_path]);
    return { ok: false, error: "No se pudo registrar el gasto." };
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "crear_gasto",
    entidad: "gastos",
    entidadId: data.id,
    metadata: { monto: d.monto },
  });

  revalidatePath("/panel/finanzas");
  return { ok: true, id: data.id };
}

export async function eliminarGasto(id: string): Promise<ResultadoFinanza> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "finanzas", "borrar")) {
    return { ok: false, error: "No tienes permiso para eliminar gastos." };
  }
  if (!UUID.test(id)) return { ok: false, error: "Gasto inválido." };

  const supabase = await createClient();
  const { data: gasto } = await supabase
    .from("gastos")
    .select("comprobante_path")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar el gasto." };

  if (gasto?.comprobante_path)
    await supabase.storage.from("comprobantes").remove([gasto.comprobante_path]);

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "eliminar_gasto",
    entidad: "gastos",
    entidadId: id,
  });

  revalidatePath("/panel/finanzas");
  return { ok: true };
}

// ============================================================
// Categorías de gasto
// ============================================================
export async function crearCategoria(nombre: string): Promise<ResultadoFinanza> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "finanzas", "crear")) {
    return { ok: false, error: "No tienes permiso." };
  }
  const parseo = categoriaGastoSchema.safeParse({ nombre });
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues[0]?.message ?? "Nombre inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categorias_gasto")
    .insert({ nombre: parseo.data.nombre, orden: 99 } as never)
    .select("id")
    .single();
  if (error || !data) {
    const dup = error?.code === "23505";
    return { ok: false, error: dup ? "Ya existe esa categoría." : "No se pudo crear la categoría." };
  }

  await registrarAuditoria({
    actorId: usuaria.id,
    actorEmail: usuaria.email,
    accion: "crear_categoria_gasto",
    entidad: "categorias_gasto",
    entidadId: data.id,
    metadata: { nombre: parseo.data.nombre },
  });

  revalidatePath("/panel/finanzas");
  return { ok: true, id: data.id };
}

export async function archivarCategoria(
  id: string,
  activo: boolean,
): Promise<ResultadoFinanza> {
  const usuaria = await requerirUsuaria();
  if (!puedeUI(usuaria.rol, "finanzas", "editar")) {
    return { ok: false, error: "No tienes permiso." };
  }
  if (!UUID.test(id)) return { ok: false, error: "Categoría inválida." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categorias_gasto")
    .update({ activo } as never)
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar la categoría." };

  revalidatePath("/panel/finanzas");
  return { ok: true };
}
