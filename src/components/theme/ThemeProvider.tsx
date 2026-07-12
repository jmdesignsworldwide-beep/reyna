"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Tema = "claro" | "oscuro";

interface ContextoTema {
  tema: Tema;
  alternar: () => void;
}

const Contexto = createContext<ContextoTema | null>(null);

const CLAVE = "reyna-tema";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>("claro");

  useEffect(() => {
    const guardado = window.localStorage.getItem(CLAVE) as Tema | null;
    const inicial: Tema =
      guardado ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "oscuro"
        : "claro");
    setTema(inicial);
    document.documentElement.classList.toggle("dark", inicial === "oscuro");
  }, []);

  const alternar = useCallback(() => {
    setTema((actual) => {
      const siguiente: Tema = actual === "claro" ? "oscuro" : "claro";
      window.localStorage.setItem(CLAVE, siguiente);
      document.documentElement.classList.toggle("dark", siguiente === "oscuro");
      return siguiente;
    });
  }, []);

  return (
    <Contexto.Provider value={{ tema, alternar }}>
      {children}
    </Contexto.Provider>
  );
}

export function useTema(): ContextoTema {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useTema debe usarse dentro de ThemeProvider");
  return ctx;
}
