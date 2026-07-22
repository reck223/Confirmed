import type { PairStat } from '../types'

export function PairPerformance({ stats }: { stats: PairStat[] }) {
  if (!stats.length) return null
  const maxAbs = Math.max(...stats.map(s => Math.abs(s.pnl)), 1)
  return (
    <div style={{ borderRadius: 18, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '18px', marginBottom: 20 }}>
      <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>PAIR PERFORMANCE</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stats.map(s => {
          const positive = s.pnl >= 0
          const widthPct = (Math.abs(s.pnl) / maxAbs) * 100
          const wr = s.count ? Math.round((s.wins / s.count) * 100) : 0
          return (
            <div key={s.pair}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#EFEFEF' }}>
                  {s.pair} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>· {wr}% ({s.count})</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: positive ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                  {positive ? '+' : ''}${s.pnl.toFixed(0)}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${widthPct}%`, borderRadius: 999, background: positive ? 'linear-gradient(90deg,#22c55e,#4ade80)' : 'linear-gradient(90deg,#dc2626,#f87171)' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
