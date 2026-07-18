import { requerirUsuaria } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { puedeUI } from "@/lib/permissions";
import { DashboardCliente, type DashboardDatos, type CitaResumen } from "@/components/dashboard/DashboardCliente";
import { factoresDeRiesgo } from "@/lib/cardio";
import { claveFecha, diasDeSemana } from "@/lib/agenda";
import type { InsightItem } from "@/components/dashboard/DashboardCliente";
import type { Paciente, Sede } from "@/types/database";

const SELECT_CITA =
  "id, fecha, hora_inicio, estado, tipo, paciente:pacientes(id,nombres,apellidos), sede:sedes(nombre,color)";

export default async function DashboardPage() {
  const usuaria = await requerirUsuaria();
  const supabase = await createClient();
  const clinico = puedeUI(usuaria.rol, "estudios", "ver"); // admin / asistente

  const ahora = new Date();
  const hoy = claveFecha(ahora);
  const inicioMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;
  const semana = diasDeSemana(ahora);
  const semanaIni = claveFecha(semana[0]!);
  const semanaFin = claveFecha(semana[6]!);

  // ---- Datos comunes (respetan RLS) ----
  const [
    { count: activos },
    { count: nuevosMes },
    { data: citasHoyRaw },
    { data: proximasRaw },
    { data: futuras },
    { data: sedesRaw },
    { data: recientesPacRaw },
    { data: recientesCitasRaw },
    { count: citasSemana },
  ] = await Promise.all([
    supabase.from("pacientes").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("pacientes").select("id", { count: "exact", head: true }).gte("created_at", inicioMes),
    supabase.from("citas").select(SELECT_CITA).eq("fecha", hoy).neq("estado", "cancelada").order("hora_inicio"),
    supabase.from("citas").select(SELECT_CITA).gt("fecha", hoy).neq("estado", "cancelada").order("fecha").order("hora_inicio").limit(6),
    supabase.from("citas").select("paciente_id, sede_id").gte("fecha", hoy).neq("estado", "cancelada"),
    supabase.from("sedes").select("id, nombre, color").eq("activo", true).order("nombre"),
    supabase.from("pacientes").select("id, nombres, apellidos, created_at").eq("activo", true).order("created_at", { ascending: false }).limit(5),
    supabase.from("citas").select(SELECT_CITA).order("created_at", { ascending: false }).limit(5),
    supabase.from("citas").select("id", { count: "exact", head: true }).gte("fecha", semanaIni).lte("fecha", semanaFin).neq("estado", "cancelada"),
  ]);

  const citasHoy = (citasHoyRaw as unknown as CitaResumen[] | null) ?? [];
  const proximas = (proximasRaw as unknown as CitaResumen[] | null) ?? [];

  // Resumen por sede (citas futuras por sede)
  const conteoSede = new Map<string, number>();
  const pacientesConCitaFutura = new Set<string>();
  for (const f of (futuras as { paciente_id: string; sede_id: string }[] | null) ?? []) {
    conteoSede.set(f.sede_id, (conteoSede.get(f.sede_id) ?? 0) + 1);
    pacientesConCitaFutura.add(f.paciente_id);
  }
  const sedes = ((sedesRaw as Pick<Sede, "id" | "nombre" | "color">[] | null) ?? []).map((s) => ({
    nombre: s.nombre,
    color: s.color ?? "#B14A73",
    total: conteoSede.get(s.id) ?? 0,
  }));

  const recientesPacientes = ((recientesPacRaw as Pick<Paciente, "id" | "nombres" | "apellidos" | "created_at">[] | null) ?? []).map((p) => ({
    id: p.id,
    nombre: `${p.apellidos}, ${p.nombres}`,
    created_at: p.created_at,
  }));

  // ---- Insights inteligentes (solo datos reales) ----
  const insights: InsightItem[] = [];

  // ---- Datos clínicos (solo admin / asistente) ----
  let clinicoDatos: DashboardDatos["clinico"] = null;
  if (clinico) {
    const { data: pacRaw } = await supabase
      .from("pacientes")
      .select(
        "id, nombres, apellidos, alergias, imc, rf_hipertension, rf_hipertension_desde, rf_diabetes, rf_diabetes_desde, rf_dislipidemia, rf_tabaquismo, rf_tabaquismo_paquetes_ano, rf_sedentarismo, rf_antecedentes_familiares, rf_antecedentes_familiares_parentesco, rf_enfermedad_renal",
      )
      .eq("activo", true)
      .limit(3000);

    const pac = (pacRaw as unknown as Paciente[] | null) ?? [];

    // Distribución por nivel de riesgo
    const niveles = { sin: 0, bajo: 0, alto: 0, muy: 0 };
    // Conteo por factor
    const fc = { hta: 0, dm: 0, disli: 0, tabaco: 0, sed: 0, obes: 0, fam: 0, renal: 0 };
    const alergias: { id: string; nombre: string }[] = [];
    const reevaluaciones: { id: string; nombre: string }[] = [];
    let riesgoAlto = 0;
    let htaSinSeguimiento = 0;

    for (const p of pac) {
      if (p.rf_hipertension && !pacientesConCitaFutura.has(p.id)) htaSinSeguimiento++;
      const n = factoresDeRiesgo(p).length;
      if (n === 0) niveles.sin++;
      else if (n <= 2) niveles.bajo++;
      else if (n <= 4) niveles.alto++;
      else niveles.muy++;

      if (p.rf_hipertension) fc.hta++;
      if (p.rf_diabetes !== "no") fc.dm++;
      if (p.rf_dislipidemia) fc.disli++;
      if (p.rf_tabaquismo === "activo") fc.tabaco++;
      if (p.rf_sedentarismo) fc.sed++;
      if (p.imc !== null && p.imc >= 30) fc.obes++;
      if (p.rf_antecedentes_familiares) fc.fam++;
      if (p.rf_enfermedad_renal) fc.renal++;

      const nombre = `${p.apellidos}, ${p.nombres}`;
      if ((p.alergias ?? "").trim() !== "" && alergias.length < 6) alergias.push({ id: p.id, nombre });

      if (n >= 3) {
        riesgoAlto++;
        if (!pacientesConCitaFutura.has(p.id) && reevaluaciones.length < 6) {
          reevaluaciones.push({ id: p.id, nombre });
        }
      }
    }

    const totalAlergias = pac.filter((p) => (p.alergias ?? "").trim() !== "").length;
    const totalReeval = pac.filter(
      (p) => factoresDeRiesgo(p).length >= 3 && !pacientesConCitaFutura.has(p.id),
    ).length;

    // Insights clínicos (en cristiano, solo de datos reales)
    const total = pac.length;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    if (htaSinSeguimiento > 0) {
      insights.push({
        icono: "agenda",
        color: "#E0567A",
        pre: "Tienes",
        fuerte: `${htaSinSeguimiento} ${htaSinSeguimiento === 1 ? "paciente hipertenso" : "pacientes hipertensos"}`,
        post: "sin cita próxima agendada.",
      });
    }
    if (total > 0 && (fc.hta > 0 || fc.dm > 0 || fc.disli > 0)) {
      insights.push({
        icono: "pacientes",
        color: "#B14A73",
        pre: "Perfil de tu consulta:",
        fuerte: `${pct(fc.hta)}% hipertensos · ${pct(fc.dm)}% diabéticos · ${pct(fc.disli)}% dislipidémicos`,
        post: "",
      });
    }
    if (totalReeval > 0) {
      insights.push({
        icono: "cuenta",
        color: "#E8A13C",
        pre: "Hay",
        fuerte: `${totalReeval} ${totalReeval === 1 ? "paciente de alto riesgo" : "pacientes de alto riesgo"}`,
        post: "pendientes de reevaluación (sin cita próxima).",
      });
    }

    clinicoDatos = {
      distribNivel: [
        { etiqueta: "Sin factores", valor: niveles.sin, color: "#4CAF82" },
        { etiqueta: "Bajo-moderado", valor: niveles.bajo, color: "#E8A13C" },
        { etiqueta: "Alto", valor: niveles.alto, color: "#E0567A" },
        { etiqueta: "Muy alto", valor: niveles.muy, color: "#B14A73" },
      ],
      factores: [
        { etiqueta: "Hipertensión", valor: fc.hta, color: "#B14A73" },
        { etiqueta: "Diabetes", valor: fc.dm, color: "#C25A82" },
        { etiqueta: "Dislipidemia", valor: fc.disli, color: "#E0567A" },
        { etiqueta: "Tabaquismo activo", valor: fc.tabaco, color: "#E8A13C" },
        { etiqueta: "Sedentarismo", valor: fc.sed, color: "#8A6B78" },
        { etiqueta: "Obesidad", valor: fc.obes, color: "#E87FA6" },
        { etiqueta: "Antec. familiares", valor: fc.fam, color: "#C25A82" },
        { etiqueta: "Enf. renal crónica", valor: fc.renal, color: "#B14A73" },
      ],
      riesgoAlto,
      alergias: { total: totalAlergias, lista: alergias },
      reevaluaciones: { total: totalReeval, lista: reevaluaciones },
    };
  }

  // Insight general (todos los roles): agenda de la semana.
  if ((citasSemana ?? 0) > 0) {
    insights.push({
      icono: "agenda",
      color: "#4CAF82",
      pre: "Tienes",
      fuerte: `${citasSemana} ${citasSemana === 1 ? "cita" : "citas"} esta semana`,
      post: sedes.length > 1 ? "entre las dos sedes." : "en tu agenda.",
    });
  }

  const datos: DashboardDatos = {
    insights,
    sinPacientes: (activos ?? 0) === 0,
    metricas: {
      activos: activos ?? 0,
      nuevosMes: nuevosMes ?? 0,
      citasHoy: citasHoy.length,
      proximas: (futuras as unknown[] | null)?.length ?? 0,
    },
    citasHoy,
    proximas,
    sedes,
    recientesPacientes,
    recientesCitas: (recientesCitasRaw as unknown as CitaResumen[] | null) ?? [],
    clinico: clinicoDatos,
  };

  return <DashboardCliente nombre={usuaria.nombre_completo} rol={usuaria.rol} datos={datos} />;
}
