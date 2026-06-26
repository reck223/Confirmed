import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssessForm } from './AssessForm'
import type { Assessment } from '@/lib/types/database'

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - day)
  return sunday.toISOString().split('T')[0]
}

const RATING_COLOR: Record<number, string> = {
  1: '#f87171', 2: '#f87171', 3: '#fb923c', 4: '#fbbf24', 5: '#fbbf24',
  6: '#D4AF37', 7: '#D4AF37', 8: '#4ade80', 9: '#4ade80', 10: '#22c55e',
}

export default async function AssessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const weekStart = getWeekStart()

  const { data } = await supabase
    .from('assessments').select('*').eq('user_id', user.id).eq('week_start', weekStart).single()

  const existing = data as Assessment | null

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }} className="view-panel">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>WEEKLY REFLECTION</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
          {existing ? 'This Week\'s\nReflection.' : 'Reflect on\nyour week.'}
        </h1>
        <p style={{ fontSize: 12, color: '#555', fontWeight: 300, marginTop: 8 }}>Week of {weekStart}</p>
      </div>

      {existing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Rating display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 22px', borderRadius: 18, border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.06)' }}>
            <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 0.9, color: RATING_COLOR[existing.rating ?? 7] ?? '#D4AF37', textShadow: `0 0 28px ${RATING_COLOR[existing.rating ?? 7] ?? '#D4AF37'}44` }}>
              {existing.rating}
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#555', marginBottom: 6 }}>YOUR RATING</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: RATING_COLOR[existing.rating ?? 7] ?? '#D4AF37' }}>
                {(existing.rating ?? 0) <= 3 ? 'Rough week — keep going.' : (existing.rating ?? 0) <= 6 ? 'Decent week. Keep pushing.' : (existing.rating ?? 0) <= 8 ? 'Strong week. Build on it.' : 'Incredible week. Lock it in.'}
              </p>
            </div>
          </div>

          {/* Submitted notice */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 14, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>Reflection submitted ✓</p>
              <p style={{ fontSize: 11, color: '#555', fontWeight: 300, marginTop: 2 }}>Come back next Sunday for your next reflection</p>
            </div>
          </div>

          {existing.wins && <ReadField label="WINS" content={existing.wins} accent="#4ade80" />}
          {existing.challenges && <ReadField label="CHALLENGES" content={existing.challenges} accent="#f87171" />}
          {existing.lessons && <ReadField label="LESSONS" content={existing.lessons} accent="#D4AF37" />}
          {existing.intentions && <ReadField label="INTENTIONS FOR NEXT WEEK" content={existing.intentions} accent="#a78bfa" />}
          {existing.gratitude && <ReadField label="GRATITUDE" content={existing.gratitude} accent="#38bdf8" />}
        </div>
      ) : (
        <>
          {/* Streak warning */}
          <div style={{ marginBottom: 24, padding: '14px 18px', borderRadius: 14, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.18)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 22, flexShrink: 0 }}>⚠️</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF' }}>Reflection due this week</p>
              <p style={{ fontSize: 11, color: '#666', fontWeight: 300, marginTop: 2 }}>Miss it and your chain resets to zero. <span style={{ color: '#D4AF37', fontWeight: 600 }}>Your Circle will notice.</span></p>
            </div>
          </div>
          <AssessForm weekStart={weekStart} />
        </>
      )}
    </div>
  )
}

function ReadField({ label, content, accent }: { label: string; content: string; accent: string }) {
  return (
    <div style={{ padding: '18px 20px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${accent}22` }}>
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#555', marginBottom: 10 }}>{label}</p>
      <p style={{ fontSize: 13, color: '#AAA', fontWeight: 300, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{content}</p>
    </div>
  )
}
