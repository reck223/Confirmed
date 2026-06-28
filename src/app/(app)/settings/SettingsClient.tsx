'use client'
import { useState, useTransition } from 'react'
import { updateProfile, signOut } from './actions'
import type { Profile } from '@/lib/types/database'

const FOCUS_AREAS = ['health', 'career', 'finance', 'learning', 'creative', 'relationships']
const FOCUS_LABELS: Record<string, string> = {
  health: '💪 Health', career: '💼 Career', finance: '💰 Finance',
  learning: '📚 Learning', creative: '🎨 Creative', relationships: '🤝 Relationships',
}
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TIMES = [
  { value: 'morning',   label: 'Morning (8–10am)' },
  { value: 'afternoon', label: 'Afternoon (12–2pm)' },
  { value: 'evening',   label: 'Evening (7–9pm)' },
]

export function SettingsClient({ profile }: { profile: Profile }) {
  const [focusAreas, setFocusAreas] = useState<string[]>(profile.focus_areas ?? [])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [signingOut, startSignOut] = useTransition()

  function toggleFocus(area: string) {
    setFocusAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }

  function handleSubmit(formData: FormData) {
    setError('')
    focusAreas.forEach(a => formData.append('focus_areas', a))
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result?.error) { setError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  function handleSignOut() {
    startSignOut(async () => { await signOut() })
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 48px' }} className="view-panel">

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>ACCOUNT</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1 }}>Settings</h1>
      </div>

      <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Profile ── */}
        <section>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#555', marginBottom: 14 }}>PROFILE</p>
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#777', marginBottom: 6 }}>DISPLAY NAME</label>
              <input name="full_name" defaultValue={profile.full_name ?? ''} placeholder="Your name" className="cc-input" style={{ fontSize: 14 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#777', marginBottom: 6 }}>USERNAME</label>
              <input name="username" defaultValue={profile.username ?? ''} placeholder="@username" className="cc-input" style={{ fontSize: 14 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#777', marginBottom: 6 }}>TAGLINE</label>
              <input name="tagline" defaultValue={profile.tagline ?? ''} placeholder="One line about you…" className="cc-input" style={{ fontSize: 14 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#777', marginBottom: 6 }}>BIO</label>
              <textarea name="bio" defaultValue={profile.bio ?? ''} placeholder="Tell your circle what you're working toward…" rows={3} className="cc-input" style={{ fontSize: 13, resize: 'none' }} />
            </div>
          </div>
        </section>

        {/* ── Focus Areas ── */}
        <section>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#555', marginBottom: 6 }}>FOCUS AREAS</p>
          <p style={{ fontSize: 11, color: '#444', fontWeight: 300, marginBottom: 14 }}>What are you working on? Your Circle sees this.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FOCUS_AREAS.map(area => {
              const active = focusAreas.includes(area)
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleFocus(area)}
                  style={{
                    padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s',
                    background: active ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
                    color: active ? '#D4AF37' : '#555',
                    border: active ? '1px solid rgba(212,175,55,0.35)' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {FOCUS_LABELS[area]}
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Reflection Schedule ── */}
        <section>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#555', marginBottom: 6 }}>WEEKLY REFLECTION</p>
          <p style={{ fontSize: 11, color: '#444', fontWeight: 300, marginBottom: 14 }}>When do you want your weekly check-in reminder?</p>
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#777', marginBottom: 6 }}>DAY</label>
              <select name="assessment_day" defaultValue={profile.assessment_day ?? 'Sunday'} className="cc-input" style={{ fontSize: 14, cursor: 'pointer' }}>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#777', marginBottom: 6 }}>TIME</label>
              <select name="assessment_time" defaultValue={profile.assessment_time ?? 'evening'} className="cc-input" style={{ fontSize: 14, cursor: 'pointer' }}>
                {TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Save */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>{error}</p>
          </div>
        )}
        <button type="submit" disabled={isPending} className="btn-gold">
          {saved ? '✓ SAVED' : isPending ? 'SAVING…' : 'SAVE CHANGES'}
        </button>

      </form>

      {/* ── Danger zone ── */}
      <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#555', marginBottom: 16 }}>ACCOUNT</p>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            width: '100%', padding: '13px', borderRadius: 14,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
            cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#f87171',
            fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.02em', transition: 'all 0.15s',
          }}
        >
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>

    </div>
  )
}
