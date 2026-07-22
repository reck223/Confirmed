export function RangeBar({ sl, entry, tp1, tp2, direction }: { sl: number; entry: number; tp1: number; tp2: number; direction: string }) {
  const vals = [sl, entry, tp1, tp2].filter(v => typeof v === 'number' && !Number.isNaN(v))
  if (vals.length < 3) return null
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const pos = (v: number) => ((v - min) / range) * 100
  const markers = [
    { v: sl,    color: '#f87171', label: 'SL'  },
    { v: entry, color: '#EFEFEF', label: direction === 'long' ? '▲' : '▼' },
    { v: tp1,   color: '#4ade80', label: 'TP1' },
    ...(tp2 && tp2 !== tp1 ? [{ v: tp2, color: '#22c55e', label: 'TP2' }] : []),
  ]
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ position: 'relative', height: 4, borderRadius: 999, background: 'linear-gradient(90deg,#f87171,rgba(255,255,255,0.14),#4ade80)' }}>
        {markers.map(m => (
          <div key={m.label} style={{ position: 'absolute', left: `${pos(m.v)}%`, top: -3, transform: 'translateX(-50%)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color, border: '2px solid #0d0d0d' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 9, fontWeight: 800 }}>
        <span style={{ color: '#f87171' }}>SL {sl.toFixed(5)}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Entry {entry.toFixed(5)}</span>
        <span style={{ color: '#4ade80' }}>TP {tp1.toFixed(5)}</span>
      </div>
    </div>
  )
}
