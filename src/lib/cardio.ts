import type {
  Paciente,
  DiabetesTipo,
  TabaquismoEstado,
  EstadoCivil,
  SexoPaciente,
  TipoEstudio,
} from "@/types/database";

// ---------- Etiquetas en español ----------
export const ETIQUETA_SEXO: Record<SexoPaciente, string> = {
  femenino: "Femenino",
  masculino: "Masculino",
};

export const ETIQUETA_ESTADO_CIVIL: Record<EstadoCivil, string> = {
  soltero: "Soltero/a",
  casado: "Casado/a",
  union_libre: "Unión libre",
  divorciado: "Divorciado/a",
  viudo: "Viudo/a",
  otro: "Otro",
};

export const ETIQUETA_DIABETES: Record<DiabetesTipo, string> = {
  no: "No",
  tipo_1: "Tipo 1",
  tipo_2: "Tipo 2",
};

export const ETIQUETA_TABAQUISMO: Record<TabaquismoEstado, string> = {
  nunca: "Nunca",
  exfumador: "Exfumador",
  activo: "Activo",
};

export const ETIQUETA_TIPO_ESTUDIO: Record<TipoEstudio, string> = {
  ecocardiograma: "Ecocardiograma",
  electrocardiograma: "Electrocardiograma",
  prueba_esfuerzo: "Prueba de esfuerzo",
  holter_ritmo: "Holter de ritmo",
  holter_presion: "Holter de presión (MAPA)",
  otro: "Otro",
};

// ---------- IMC ----------
export function clasificacionIMC(imc: number | null): {
  etiqueta: string;
  color: string;
} | null {
  if (imc === null) return null;
  if (imc < 18.5) return { etiqueta: "Bajo peso", color: "#E8A13C" };
  if (imc < 25) return { etiqueta: "Peso normal", color: "#4CAF82" };
  if (imc < 30) return { etiqueta: "Sobrepeso", color: "#E8A13C" };
  if (imc < 35) return { etiqueta: "Obesidad grado I", color: "#E0567A" };
  if (imc < 40) return { etiqueta: "Obesidad grado II", color: "#E0567A" };
  return { etiqueta: "Obesidad grado III", color: "#E0567A" };
}

export function esObeso(imc: number | null): boolean {
  return imc !== null && imc >= 30;
}

// ---------- Perfil de riesgo cardiovascular ----------
export interface FactorRiesgo {
  clave: string;
  etiqueta: string;
  detalle?: string;
}

/**
 * Deriva la lista de factores de riesgo activos del paciente.
 * (La obesidad se deriva del IMC calculado en base de datos.)
 */
export function factoresDeRiesgo(p: Paciente): FactorRiesgo[] {
  const f: FactorRiesgo[] = [];
  if (p.rf_hipertension)
    f.push({
      clave: "hipertension",
      etiqueta: "Hipertensión arterial",
      detalle: p.rf_hipertension_desde
        ? `desde ${p.rf_hipertension_desde}`
        : undefined,
    });
  if (p.rf_diabetes !== "no")
    f.push({
      clave: "diabetes",
      etiqueta: `Diabetes ${ETIQUETA_DIABETES[p.rf_diabetes].toLowerCase()}`,
      detalle: p.rf_diabetes_desde ? `desde ${p.rf_diabetes_desde}` : undefined,
    });
  if (p.rf_dislipidemia)
    f.push({ clave: "dislipidemia", etiqueta: "Dislipidemia" });
  if (p.rf_tabaquismo === "activo")
    f.push({
      clave: "tabaquismo",
      etiqueta: "Tabaquismo activo",
      detalle: p.rf_tabaquismo_paquetes_ano
        ? `${p.rf_tabaquismo_paquetes_ano} paq/año`
        : undefined,
    });
  if (p.rf_tabaquismo === "exfumador")
    f.push({ clave: "exfumador", etiqueta: "Exfumador" });
  if (p.rf_sedentarismo)
    f.push({ clave: "sedentarismo", etiqueta: "Sedentarismo" });
  if (esObeso(p.imc))
    f.push({
      clave: "obesidad",
      etiqueta: "Obesidad",
      detalle: p.imc ? `IMC ${p.imc}` : undefined,
    });
  if (p.rf_antecedentes_familiares)
    f.push({
      clave: "familiares",
      etiqueta: "Antecedentes familiares de ECV",
      detalle: p.rf_antecedentes_familiares_parentesco ?? undefined,
    });
  if (p.rf_enfermedad_renal)
    f.push({ clave: "renal", etiqueta: "Enfermedad renal crónica" });
  return f;
}

/** Nivel de riesgo simple según cantidad de factores (visual, no diagnóstico). */
export function nivelRiesgo(cantidad: number): {
  etiqueta: string;
  color: string;
} {
  if (cantidad === 0) return { etiqueta: "Sin factores registrados", color: "#4CAF82" };
  if (cantidad <= 2) return { etiqueta: "Riesgo bajo-moderado", color: "#E8A13C" };
  if (cantidad <= 4) return { etiqueta: "Riesgo alto", color: "#E0567A" };
  return { etiqueta: "Riesgo muy alto", color: "#E0567A" };
}
