'use client'
import { useState, useEffect } from 'react'

export function AiBriefing({ firstName, topGoalTitle, streak }: {
  firstName: string; topGoalTitle: string | null; streak: number
}) {
  const [text, setText]       = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cacheKey = `briefing:${new Date().toISOString().split('T')[0]}`
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) { setText(cached); setLoading(false); return }
    } catch { /* */ }

    let workout: string | null = null
    try {
      const wp = localStorage.getItem('weekPlan')
      if (wp) {
        const plan = JSON.parse(wp)
        const todayIdx = (new Date().getDay() + 6) % 7
        const td = plan[todayIdx]
        if (td && !td.restDay && td.types?.length > 0) workout = (td.types as string[]).join(' + ')
      }
    } catch { /* */ }

    fetch('/api/ai-briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, topGoal: topGoalTitle, energy: null, streak, workout }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.text) {
          try { sessionStorage.setItem(cacheKey, d.text) } catch { /* */ }
          setText(d.text)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loading && !text) return null

  return (
    <div style={{ margin: '0 20px 24px', padding: '18px 20px', borderRadius: 20, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.16)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 14, color: '#D4AF37', flexShrink: 0, marginTop: 2 }}>✦</span>
        <div style={{ flex: 1 }}>
          {loading ? (
            <>
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(212,175,55,0.1)', marginBottom: 8, width: '80%' }} />
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(212,175,55,0.07)', width: '60%' }} />
            </>
          ) : (
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#EFEFEF', fontWeight: 400, margin: 0 }}>{text}</p>
          )}
        </div>
      </div>
    </div>
  )
}
