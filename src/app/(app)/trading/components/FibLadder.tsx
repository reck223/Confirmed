import type { Signal } from '../types'

// Reference grid per Forex_Trading_Strategy_Spec.md (0% = anchor, 100% = breakout).
// Plotted alongside the signal's actual entry/SL/TP so any drift between the
// documented strategy and what the bot's math actually produced is visible.
const FIB_GRID_PCTS = [0, 50, 61.8, 71, 78.6, 88.6, 100]

export function FibLadder({ signal }: { signal: Signal }) {
  const { entry, sl, tp1, tp2, fib_anchor, fib_break } = signal
  if (fib_anchor == null || fib_break == null) return null

  const gridPoints = FIB_GRID_PCTS.map(pct => ({ pct, price: fib_anchor + (fib_break - fib_anchor) * (pct / 100) }))
  const markers = [
    { key: 'sl',    label: 'SL',    price: sl,    color: '#f87171' },
    { key: 'entry', label: 'ENTRY', price: entry, color: '#EFEFEF' },
    { key: 'tp1',   label: 'TP1',   price: tp1,   color: '#4ade80' },
    ...(tp2 && tp2 !== tp1 ? [{ key: 'tp2', label: 'TP2', price: tp2, color: '#22c55e' }] : []),
  ]

  const allPrices = [...gridPoints.map(g => g.price), ...markers.map(m => m.price)]
  const min = Math.min(...allPrices), max = Math.max(...allPrices)
  const range = max - min || 1
  const yFor = (price: number) => 100 - ((price - min) / range) * 100

  const zoneTop    = yFor(gridPoints.find(g => g.pct === 100)!.price)
  const zoneBottom = yFor(gridPoints.find(g => g.pct === 88.6)!.price)

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>FIB LEVELS</p>
      <div style={{ display: 'flex', gap: 8, height: 150 }}>
        <div style={{ position: 'relative', width: 22, flexShrink: 0 }}>
          {gridPoints.map(g => (
            <span key={g.pct} style={{ position: 'absolute', top: `${yFor(g.price)}%`, right: 4, transform: 'translateY(-50%)', fontSize: 7, fontWeight: 800, color: 'rgba(255,255,255,0.25)' }}>
              {g.pct}
            </span>
          ))}
        </div>
        <div style={{ position: 'relative', width: 3, borderRadius: 999, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ position: 'absolute', left: -2, right: -2, top: `${Math.min(zoneTop, zoneBottom)}%`, height: `${Math.abs(zoneBottom - zoneTop)}%`, background: 'rgba(212,175,55,0.3)', borderRadius: 3 }} />
          {gridPoints.map(g => (
            <div key={g.pct} style={{ position: 'absolute', left: -3, top: `${yFor(g.price)}%`, width: 9, height: 1, background: 'rgba(255,255,255,0.2)' }} />
          ))}
          {markers.map(m => (
            <div key={m.key} style={{ position: 'absolute', left: -4, top: `${yFor(m.price)}%`, transform: 'translateY(-50%)', width: 11, height: 11, borderRadius: '50%', background: m.color, border: '2px solid #0d0d0d', zIndex: 2 }} />
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          {markers.map(m => (
            <span key={m.key} style={{ position: 'absolute', top: `${yFor(m.price)}%`, transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, color: m.color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {m.label} · {m.price.toFixed(5)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
