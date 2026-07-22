'use client'
import { useState, useEffect } from 'react'

// Mirrors tools/forex_bot.mjs isTradingWindow() for London/NY;
// Sydney/Tokyo added here for the visual strip only (not used for gating).
const SESSIONS = [
  { id: 'sydney', label: 'Sydney',   active: (h: number) => h >= 21 || h < 6 },
  { id: 'tokyo',  label: 'Tokyo',    active: (h: number) => h >= 0  && h < 9 },
  { id: 'london', label: 'London',   active: (h: number) => h >= 8  && h < 17 },
  { id: 'ny',     label: 'New York', active: (h: number) => h >= 13 && h < 22 },
]

export function SessionStrip() {
  const [hour, setHour] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setHour(new Date().getUTCHours())
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])
  if (hour === null) return <div style={{ height: 46, marginBottom: 20 }} />
  const activeIds = SESSIONS.filter(s => s.active(hour)).map(s => s.id)
  const overlap = activeIds.includes('london') && activeIds.includes('ny')
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
      {SESSIONS.map(s => {
        const isActive = activeIds.includes(s.id)
        const prime = isActive && overlap && (s.id === 'london' || s.id === 'ny')
        return (
          <div key={s.id} style={{
            flex: 1, borderRadius: 10, padding: '8px 4px', textAlign: 'center',
            background: isActive ? (prime ? 'rgba(212,175,55,0.1)' : 'rgba(74,222,128,0.06)') : 'rgba(255,255,255,0.02)',
            border: `1px solid ${isActive ? (prime ? 'rgba(212,175,55,0.3)' : 'rgba(74,222,128,0.18)') : 'rgba(255,255,255,0.05)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span className={isActive ? (prime ? 'pulse-gold' : 'pulse-green') : undefined} style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                background: isActive ? (prime ? '#D4AF37' : '#4ade80') : 'rgba(255,255,255,0.15)',
              }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: isActive ? '#EFEFEF' : 'rgba(255,255,255,0.3)' }}>{s.label}</span>
            </div>
            {prime && <p style={{ fontSize: 6, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.08em', marginTop: 2 }}>OVERLAP</p>}
          </div>
        )
      })}
    </div>
  )
}
