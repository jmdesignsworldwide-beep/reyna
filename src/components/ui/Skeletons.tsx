import { Card } from "@/components/ui/Card";

/** Bloque base con shimmer. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`esqueleto ${className}`} aria-hidden="true" />;
}

function Encabezado() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

/** Carga de una vista global (encabezado + filtros + tabla). */
export function SkeletonTabla({ filas = 6 }: { filas?: number }) {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando…">
      <Encabezado />
      <Skeleton className="h-14 w-full rounded-tarjeta" />
      <Card className="!p-0">
        <div className="divide-y divide-[var(--borde)]">
          {Array.from({ length: filas }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <Skeleton className="h-4 w-20" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-16 rounded-suave" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Carga de un grid de tarjetas (dashboard, listados). */
export function SkeletonCards({ n = 4, alto = "h-28" }: { n?: number; alto?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <Card key={i} className="!p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className={`mt-3 w-20 ${alto === "h-28" ? "h-8" : alto}`} />
          <Skeleton className="mt-3 h-3 w-28" />
        </Card>
      ))}
    </div>
  );
}

/** Carga del dashboard. */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando…">
      <Encabezado />
      <SkeletonCards n={4} />
      <Skeleton className="h-40 w-full rounded-tarjeta" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-tarjeta lg:col-span-2" />
        <Skeleton className="h-72 rounded-tarjeta" />
      </div>
    </div>
  );
}

/** Carga de la ficha del paciente. */
export function SkeletonFicha() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando…">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-28 rounded-suave" />
      </div>
      <Skeleton className="h-20 w-full rounded-tarjeta" />
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-tarjeta" />
        ))}
      </div>
      <Skeleton className="h-10 w-96 rounded-full" />
      <Skeleton className="h-64 w-full rounded-tarjeta" />
    </div>
  );
}

/** Carga genérica de un listado simple. */
export function SkeletonLista({ filas = 6 }: { filas?: number }) {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando…">
      <Encabezado />
      <Card>
        <div className="space-y-3">
          {Array.from({ length: filas }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-suave" />
          ))}
        </div>
      </Card>
    </div>
  );
}
