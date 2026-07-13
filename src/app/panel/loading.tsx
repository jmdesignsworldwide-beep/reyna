function Bloque({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-suave bg-[var(--superficie-suave)] ${className}`}
    />
  );
}

export default function CargandoPanel() {
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="space-y-3">
        <Bloque className="h-4 w-40" />
        <Bloque className="h-9 w-72" />
        <Bloque className="h-4 w-56" />
      </div>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="tarjeta !p-5">
            <div className="flex items-start justify-between">
              <Bloque className="h-4 w-24" />
              <Bloque className="h-9 w-9 !rounded-full" />
            </div>
            <Bloque className="mt-4 h-9 w-20" />
            <Bloque className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Contenido */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="tarjeta space-y-3">
            <Bloque className="h-6 w-40" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Bloque key={i} className="h-12 w-full" />
            ))}
          </div>
          <div className="tarjeta space-y-3">
            <Bloque className="h-6 w-52" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Bloque key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="tarjeta space-y-3">
            <Bloque className="h-6 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Bloque key={i} className="h-14 w-full" />
            ))}
          </div>
          <div className="tarjeta">
            <Bloque className="mx-auto h-40 w-40 !rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
