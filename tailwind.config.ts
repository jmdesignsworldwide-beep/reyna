import type { Config } from "tailwindcss";

/**
 * Marca — Dra. Reyna Massiel
 * Paleta rosa pastel + crema, femenina y premium.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores de marca ligados a las variables CSS de tema para que
        // TODAS las utilidades (text-*, bg-*, border-*) cambien en modo oscuro.
        // (Antes eran hex fijos del modo claro → el texto no cambiaba en oscuro.)
        rosa: {
          principal: "var(--rosa-principal)",
          medio: "var(--rosa-medio)",
          hover: "var(--rosa-hover)",
          pastel: "#FBE4EC",
          claro: "#FDEEF3",
        },
        crema: "#FFFAF7",
        texto: {
          principal: "var(--texto-principal)",
          secundario: "var(--texto-secundario)",
        },
        estado: {
          exito: "#4CAF82",
          urgente: "#E0567A",
          advertencia: "#E8A13C",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Cormorant Garamond", "Georgia", "serif"],
        display: ["var(--font-display)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        tarjeta: "16px",
        suave: "12px",
      },
      boxShadow: {
        tarjeta: "0 4px 20px -6px rgba(177, 74, 115, 0.18)",
        "tarjeta-hover": "0 10px 32px -8px rgba(177, 74, 115, 0.28)",
        aura: "0 0 0 1px rgba(177, 74, 115, 0.08)",
      },
      keyframes: {
        "aurora-shift": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(2%, -3%, 0) scale(1.06)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "heart-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.12)", opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        aurora: "aurora-shift 18s ease-in-out infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.8s ease both",
        "heart-pulse": "heart-pulse 2.4s ease-in-out infinite",
        "scale-in": "scale-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
