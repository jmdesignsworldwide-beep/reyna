"use client";

import { motion } from "framer-motion";

const checkIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** Input con label flotante + check verde de validez en vivo. */
export function CampoFlotante({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  valido = false,
  maxLength,
  inputMode,
  placeholder = " ",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  valido?: boolean;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
  placeholder?: string;
}) {
  const arriba = type === "date" || type === "time";
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        className={`peer w-full rounded-suave border border-[var(--borde)] bg-[var(--superficie)] px-3.5 pb-2 pt-5 text-texto-principal outline-none transition-all placeholder:text-transparent focus:border-rosa-hover focus:ring-[3px] focus:ring-[rgba(232,127,166,0.18)] ${
          valido ? "border-[rgba(76,175,130,0.55)]" : ""
        }`}
      />
      <label
        className={`pointer-events-none absolute left-3 bg-[var(--superficie)] px-1 text-texto-secundario transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-rosa-principal peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs ${
          arriba ? "top-0 -translate-y-1/2 text-xs" : "top-1/2 -translate-y-1/2 text-base"
        }`}
      >
        {label}
        {required && <span className="text-estado-urgente"> *</span>}
      </label>
      {valido && value.trim() !== "" && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-estado-exito"
        >
          {checkIcon}
        </motion.span>
      )}
    </div>
  );
}

export function AreaFlotante({
  label,
  value,
  onChange,
  rows = 3,
  maxLength,
  alerta = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
  alerta?: boolean;
}) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder=" "
        className={`peer w-full resize-y rounded-suave border bg-[var(--superficie)] px-3.5 pb-2 pt-5 text-texto-principal outline-none transition-all placeholder:text-transparent focus:ring-[3px] ${
          alerta && value.trim() !== ""
            ? "border-[rgba(224,86,122,0.55)] focus:border-estado-urgente focus:ring-[rgba(224,86,122,0.18)]"
            : "border-[var(--borde)] focus:border-rosa-hover focus:ring-[rgba(232,127,166,0.18)]"
        }`}
      />
      <label className="pointer-events-none absolute left-3 top-4 bg-[var(--superficie)] px-1 text-texto-secundario transition-all duration-200 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-rosa-principal peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs">
        {label}
      </label>
    </div>
  );
}

export function SelectFlotante({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opciones: { valor: string; texto: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="peer w-full appearance-none rounded-suave border border-[var(--borde)] bg-[var(--superficie)] px-3.5 pb-2 pt-5 text-texto-principal outline-none transition-all focus:border-rosa-hover focus:ring-[3px] focus:ring-[rgba(232,127,166,0.18)]"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      <label className="pointer-events-none absolute left-3 top-0 -translate-y-1/2 bg-[var(--superficie)] px-1 text-xs text-texto-secundario">
        {label}
      </label>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-texto-secundario">
        ▾
      </span>
    </div>
  );
}

/** Control segmentado tipo pastilla para enums cortos. */
export function Segmentado({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opciones: { valor: string; texto: string }[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-texto-secundario">{label}</p>
      <div className="flex flex-wrap gap-1.5 rounded-suave border border-[var(--borde)] bg-[var(--superficie-suave)] p-1">
        {opciones.map((o) => {
          const activo = value === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              onClick={() => onChange(o.valor)}
              className={`relative flex-1 whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
                activo ? "text-white" : "text-texto-secundario hover:text-rosa-principal"
              }`}
            >
              {activo && (
                <motion.span
                  layoutId={`seg-${label}`}
                  className="absolute inset-0 rounded-[10px] bg-[linear-gradient(120deg,var(--rosa-principal),var(--rosa-medio))]"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{o.texto}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Tarjeta seleccionable (toggle) para factores de riesgo. */
export function ToggleCard({
  activo,
  onToggle,
  titulo,
  descripcion,
  color = "var(--rosa-principal)",
}: {
  activo: boolean;
  onToggle: () => void;
  titulo: string;
  descripcion?: string;
  color?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.97 }}
      className="flex items-center gap-3 rounded-suave border p-3.5 text-left transition-all"
      style={{
        borderColor: activo ? color : "var(--borde)",
        backgroundColor: activo ? `${color}14` : "var(--superficie)",
      }}
    >
      <span
        className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition-colors"
        style={{
          borderColor: activo ? color : "var(--borde)",
          backgroundColor: activo ? color : "transparent",
          color: "#fff",
        }}
      >
        {activo && checkIcon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-texto-principal">{titulo}</span>
        {descripcion && <span className="block text-xs text-texto-secundario">{descripcion}</span>}
      </span>
    </motion.button>
  );
}
