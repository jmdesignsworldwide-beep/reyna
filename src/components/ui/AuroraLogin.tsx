/**
 * Fondo aurora premium con profundidad (rosa pastel → crema).
 * Glows que derivan muy lento en capas + un halo que gira + viñeta.
 * CSS puro (sin JS): rendimiento y suavidad. Decorativo.
 */
export function AuroraLogin() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base crema con degradado suave */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, var(--superficie-suave) 0%, var(--fondo) 55%)",
        }}
      />

      {/* Halo grande que gira muy lento (profundidad) */}
      <div className="absolute left-1/2 top-1/2 h-[130vh] w-[130vh] -translate-x-1/2 -translate-y-1/2 anim-giro">
        <div
          className="absolute inset-0 rounded-full opacity-60 blur-[90px]"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(232,127,166,0.20), rgba(251,228,236,0.05), rgba(194,90,130,0.18), rgba(255,250,247,0.02), rgba(232,127,166,0.20))",
          }}
        />
      </div>

      {/* Glows en capas que derivan lento */}
      <div
        className="absolute -left-[8%] -top-[12%] h-[58vh] w-[58vh] rounded-full blur-3xl anim-deriva-1 anim-respiro"
        style={{ background: "radial-gradient(circle, rgba(232,127,166,0.45), transparent 70%)" }}
      />
      <div
        className="absolute right-[-10%] top-[6%] h-[52vh] w-[52vh] rounded-full blur-3xl anim-deriva-2"
        style={{ background: "radial-gradient(circle, rgba(251,228,236,0.85), transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-18%] left-[18%] h-[62vh] w-[62vh] rounded-full blur-3xl anim-deriva-3"
        style={{ background: "radial-gradient(circle, rgba(194,90,130,0.30), transparent 70%)" }}
      />

      {/* Viñeta suave para dar foco al centro */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(90,74,82,0.10) 100%)",
        }}
      />
    </div>
  );
}
