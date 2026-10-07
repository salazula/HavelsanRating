/** Basit rating geçmişi çizgi grafiği (SVG, istemci kodu yok). */
export function RatingChart({ points }: { points: { label: string; value: number }[] }) {
  if (points.length < 2) return <p className="py-10 text-center text-sm text-ink-soft">Grafik için en az bir tamamlanmış tur gerekli.</p>;
  const W = 640, H = 200, P = 32;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = Math.max(max - min, 20);
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v: number) => H - P - ((v - min) * (H - 2 * P)) / span;
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Rating geçmişi">
      <defs>
        <linearGradient id="rc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-table-500)" stopOpacity=".25" />
          <stop offset="1" stopColor="var(--color-table-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${x(points.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill="url(#rc-fill)" />
      <path d={d} fill="none" stroke="var(--color-table-600)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="4" fill="white" stroke="var(--color-ball-500)" strokeWidth="2.5" />
          {(points.length <= 12 || i % Math.ceil(points.length / 12) === 0 || i === points.length - 1) && (
            <>
              <text x={x(i)} y={y(p.value) - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-ink)">{p.value}</text>
              <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--color-ink-soft)">{p.label}</text>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}
