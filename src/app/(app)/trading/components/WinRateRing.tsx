export function WinRateRing({ pct }: { pct: number | null }) {
  const r = 28, sw = 5
  const size = (r + sw) * 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - ((pct ?? 0) / 100) * circumference
  const color = pct === null ? 'rgba(255,255,255,0.3)' : pct >= 60 ? '#4ade80' : pct >= 40 ? '#D4AF37' : '#f87171'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={r + sw} cy={r + sw} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        {pct !== null && (
          <circle cx={r + sw} cy={r + sw} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 900, color }}>{pct !== null ? `${pct}%` : '—'}</span>
      </div>
    </div>
  )
}
