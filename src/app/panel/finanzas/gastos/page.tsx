import type { Metadata } from "next";
import Link from "next/link";
import { requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HeartMark } from "@/components/ui/HeartMark";
import { GestorGastos, type GastoVista } from "@/components/finanzas/GestorGastos";
import type { Gasto, CategoriaGasto } from "@/types/database";

export const metadata: Metadata = { title: "Gastos" };

export default async function GastosPage() {
  await requerirRol("admin");
  const supabase = await createClient();

  const [{ data: gastosRaw }, { data: catsRaw }] = await Promise.all([
    supabase
      .from("gastos")
      .select("id, fecha, monto, categoria_id, metodo_pago, nota, comprobante_path")
      .order("fecha", { ascending: false })
      .limit(200),
    supabase.from("categorias_gasto").select("*").order("orden", { ascending: true }),
  ]);

  const categorias = (catsRaw as CategoriaGasto[] | null) ?? [];
  const cats = new Map(categorias.map((c) => [c.id, c.nombre]));
  const rows = (gastosRaw as (Pick<Gasto, "id" | "fecha" | "monto" | "categoria_id" | "metodo_pago" | "nota" | "comprobante_path">)[] | null) ?? [];

  const gastos: GastoVista[] = await Promise.all(
    rows.map(async (g) => {
      let comprobante_url: string | null = null;
      if (g.comprobante_path) {
        const { data } = await supabase.storage
          .from("comprobantes")
          .createSignedUrl(g.comprobante_path, 600);
        comprobante_url = data?.signedUrl ?? null;
      }
      return {
        id: g.id,
        fecha: g.fecha,
        monto: g.monto,
        categoria: cats.get(g.categoria_id ?? "") ?? null,
        metodo_pago: g.metodo_pago,
        nota: g.nota,
        comprobante_url,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <Link href="/panel/finanzas" className="text-sm text-texto-secundario hover:text-rosa-principal">
          ← Panel financiero
        </Link>
        <div className="mt-2 flex items-center gap-2 text-sm text-rosa-medio">
          <HeartMark className="h-4 w-4" />
          <span>Finanzas</span>
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-texto-principal">
          Gastos del consultorio
        </h1>
      </header>

      <GestorGastos gastos={gastos} categorias={categorias} />
    </div>
  );
}
