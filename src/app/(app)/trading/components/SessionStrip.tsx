'use client'
import { useState, useEffect } from 'react'

// Mirrors tools/forex_bot.mjs isTradingWindow() — the bot now trades all four
// sessions 24/5 (breakout regime on London/NY, range regime on Sydney/Tokyo),
// so these boundaries reflect real bot behavior, not just a visual strip.
const SESSIONS = [
  { id: 'sydney', label: 'Sydney',   color: '#a78bfa', active: (h: number) => h >= 21 || h < 6 },
  { id: 'tokyo',  label: 'Tokyo',    color: '#38bdf8', active: (h: number) => h >= 0  && h < 9 },
  { id: 'london', label: 'London',   color: '#4ade80', active: (h: number) => h >= 8  && h < 17 },
  { id: 'ny',     label: 'New York', color: '#4ade80', active: (h: number) => h >= 13 && h < 22 },
]

// Derive contiguous [start,end) hour segments by scanning active() rather than
// hardcoding boundaries a second time — keeps this file impossible to drift
// from SESSIONS.active, and handles Sydney's midnight wrap as two segments
// automatically (21-24 and 0-6) instead of needing special-case logic.
function segmentsFor(active: (h: number) => boolean): Array<[number, number]> {
  const segs: Array<[number, number]> = []
  let start: number | null = null
  for (let h = 0; h <= 24; h++) {
    const on = h < 24 && active(h)
    if (on && start === null) start = h
    if (!on && start !== null) { segs.push([start, h]); start = null }
  }
  return segs
}

export function SessionStrip() {
  const [hour, setHour] = useState<number | null>(null)
  const [minute, setMinute] = useState(0)
  useEffect(() => {
    const tick = () => { const n = new Date(); setHour(n.getUTCHours()); setMinute(n.getUTCMinutes()) }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])
  if (hour === null) return <div style={{ height: 140, marginBottom: 20 }} />

  const activeIds = SESSIONS.filter(s => s.active(hour)).map(s => s.id)
  const overlap = activeIds.includes('london') && activeIds.includes('ny')
  const nowPct = ((hour + minute / 60) / 24) * 100

  return (
    <div style={{ marginBottom: 20, borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)' }}>SESSIONS · UTC</p>
        {overlap && <p style={{ fontSize: 8, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.08em' }}>LONDON/NY OVERLAP</p>}
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: `${nowPct}%`, top: 0, bottom: 0, width: 2, background: '#D4AF37', zIndex: 3, boxShadow: '0 0 6px #D4AF37' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SESSIONS.map(s => {
            const isActive = activeIds.includes(s.id)
            const prime = isActive && overlap && (s.id === 'london' || s.id === 'ny')
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 54, flexShrink: 0, fontSize: 9, fontWeight: 800, color: isActive ? '#EFEFEF' : 'rgba(255,255,255,0.3)' }}>{s.label}</span>
                <div style={{ position: 'relative', flex: 1, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.04)' }}>
                  {segmentsFor(s.active).map(([start, end], i) => (
                    <div
                      key={i}
                      className={prime ? 'pulse-gold' : isActive ? 'pulse-green' : undefined}
                      style={{
                        position: 'absolute', top: 0, bottom: 0, borderRadius: 5,
                        left: `${(start / 24) * 100}%`,
                        width: `${((end - start) / 24) * 100}%`,
                        background: prime ? '#D4AF37' : s.color,
                        opacity: isActive ? 0.85 : 0.22,
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingLeft: 62 }}>
        {[0, 6, 12, 18, 24].map(h => (
          <span key={h} style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.2)' }}>{h.toString().padStart(2, '0')}</span>
        ))}
      </div>
    </div>
  )
}
