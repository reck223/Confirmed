import type { Timeframe } from './useTradeChart'

const OPTIONS: Timeframe[] = ['15m', '1H', '4H', '1D']

export function TimeframeSwitcher({ value, onChange }: { value: Timeframe; onChange: (tf: Timeframe) => void }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 2 }}
    >
      {OPTIONS.map(tf => {
        const sel = tf === value
        return (
          <button
            key={tf}
            onClick={() => onChange(tf)}
            style={{
              border: 'none', cursor: 'pointer', borderRadius: 6, padding: '3px 7px',
              fontFamily: 'Satoshi,sans-serif', fontSize: 9, fontWeight: 800, letterSpacing: '0.02em',
              background: sel ? 'rgba(212,175,55,0.15)' : 'transparent',
              color: sel ? '#D4AF37' : 'rgba(255,255,255,0.35)',
              outline: sel ? '1px solid rgba(212,175,55,0.3)' : 'none',
            }}
          >
            {tf}
          </button>
        )
      })}
    </div>
  )
}
