import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { FieldComments } from '../AssessComments'
import type { Assessment } from '@/lib/types/database'

function getWeekStart(): string {
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  return sunday.toISOString().split('T')[0]
}

const RATING_COLOR: Record<number, string> = {
  1: '#f87171', 2: '#f87171', 3: '#fb923c', 4: '#fbbf24', 5: '#fbbf24',
  6: '#D4AF37', 7: '#D4AF37', 8: '#4ade80', 9: '#4ade80', 10: '#22c55e',
}
const RATING_GRAD: Record<number, string> = {
  1: 'linear-gradient(135deg,#1a0000,#0d0d0d)', 2: 'linear-gradient(135deg,#1a0000,#0d0d0d)',
  3: 'linear-gradient(135deg,#1a0800,#0d0d0d)', 4: 'linear-gradient(135deg,#1a1200,#0d0d0d)',
  5: 'linear-gradient(135deg,#1a1200,#0d0d0d)', 6: 'linear-gradient(135deg,#1a1400,#0d0d0d)',
  7: 'linear-gradient(135deg,#1a1400,#0d0d0d)', 8: 'linear-gradient(135deg,#001a08,#0d0d0d)',
  9: 'linear-gradient(135deg,#001a08,#0d0d0d)', 10: 'linear-gradient(135deg,#001a08,#0d0d0d)',
}

type CommentType = { id: string; user_id: string; field: string; content: string; created_at: string; author_name: string | null }

export default async function ViewAssessPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: ownerId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (user.id === ownerId) redirect('/assess')

  const weekStart = getWeekStart()

  // Fetch owner profile + their current-week assessment
  const [{ data: ownerProfile }, { data: assessmentRow }] = await Promise.all([
    supabase.from('profiles').select('full_name, username, streak').eq('id', ownerId).single(),
    supabase.from('assessments').select('*').eq('user_id', ownerId).eq('week_start', weekStart).single(),
  ])

  if (!ownerProfile) notFound()

  const assessment = assessmentRow as Assessment | null
  if (!assessment) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px', textAlign: 'center' }} className="view-panel">
        <p style={{ fontSize: 40, marginBottom: 16 }}>📖</p>
        <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', marginBottom: 6 }}>
          {(ownerProfile as { full_name: string | null }).full_name ?? 'This person'} hasn&apos;t reflected yet this week
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>Check back after their reflection day.</p>
      </div>
    )
  }

  // Fetch comments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: commentRows } = await (supabase.from('assessment_comments') as any)
    .select('id, user_id, field, content, created_at')
    .eq('assessment_id', assessment.id)
    .order('created_at', { ascending: true })
  const rawComments = (commentRows ?? []) as { id: string; user_id: string; field: string; content: string; created_at: string }[]
  const authorIds = [...new Set(rawComments.map(c => c.user_id))]
  const { data: authorRows } = authorIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', authorIds)
    : { data: [] }
  const authorMap = Object.fromEntries(((authorRows ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name]))
  const comments: CommentType[] = rawComments.map(c => ({ ...c, author_name: authorMap[c.user_id] ?? null }))

  const rating = assessment.rating ?? 7
  const rColor = RATING_COLOR[rating] ?? '#D4AF37'
  const rGrad  = RATING_GRAD[rating]  ?? 'linear-gradient(135deg,#1a1400,#0d0d0d)'
  const ownerName = (ownerProfile as { full_name: string | null }).full_name ?? 'Member'
  const dateLabel = new Date(assessment.week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 40px' }} className="view-panel">
      {/* Back */}
      <a href="/circle" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, textDecoration: 'none' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>Back to Circle</span>
      </a>

      {/* Hero */}
      <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', marginBottom: 14, background: rGrad, border: `1px solid ${rColor}22`, padding: '32px 26px 28px' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: `${rColor}12`, filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ height: 1, width: 20, background: `${rColor}50` }} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: rColor, opacity: 0.8 }}>
              {ownerName.toUpperCase()} · WEEK OF {dateLabel.toUpperCase()}
            </span>
          </div>
          {assessment.week_title ? (
            <h1 style={{ fontSize: 34, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 20 }}>
              &ldquo;{assessment.week_title}&rdquo;
            </h1>
          ) : (
            <h1 style={{ fontSize: 30, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 20 }}>
              {ownerName}&apos;s Reflection
            </h1>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: rColor, textShadow: `0 0 32px ${rColor}60` }}>{rating}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: `${rColor}70` }}>/10</span>
          </div>
        </div>
      </div>

      {/* Fields with comments */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {assessment.wins       && <ViewField label="WINS"        emoji="🏆" content={assessment.wins}       accent="#22c55e" assessmentId={assessment.id} field="wins"        comments={comments} currentUserId={user.id} ownerUserId={ownerId} />}
        {assessment.challenges && <ViewField label="CHALLENGES"  emoji="⚡" content={assessment.challenges} accent="#f59e0b" assessmentId={assessment.id} field="challenges"  comments={comments} currentUserId={user.id} ownerUserId={ownerId} />}
        {assessment.lessons    && <ViewField label="LESSON"      emoji="💡" content={assessment.lessons}    accent="#a78bfa" assessmentId={assessment.id} field="lessons"     comments={comments} currentUserId={user.id} ownerUserId={ownerId} />}
        {assessment.intentions && <ViewField label="NEXT 7 DAYS" emoji="🎯" content={assessment.intentions} accent="#D4AF37" assessmentId={assessment.id} field="intentions"  comments={comments} currentUserId={user.id} ownerUserId={ownerId} />}
        {assessment.gratitude  && <ViewField label="YOUR CIRCLE" emoji="🤝" content={assessment.gratitude}  accent="#38bdf8" assessmentId={assessment.id} field="gratitude"   comments={comments} currentUserId={user.id} ownerUserId={ownerId} />}
      </div>
    </div>
  )
}

function ViewField({ label, emoji, content, accent, assessmentId, field, comments, currentUserId, ownerUserId }: {
  label: string; emoji: string; content: string; accent: string
  assessmentId: string; field: string; comments: CommentType[]; currentUserId: string; ownerUserId: string
}) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${accent}14` }}>
      <div style={{ padding: '10px 16px 8px', background: `${accent}08`, borderBottom: `1px solid ${accent}10`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13 }}>{emoji}</span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: accent, opacity: 0.8 }}>{label}</span>
      </div>
      <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.01)' }}>
        <p style={{ fontSize: 13, color: '#AAA', fontWeight: 300, lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>{content}</p>
      </div>
      <FieldComments assessmentId={assessmentId} field={field} comments={comments} currentUserId={currentUserId} ownerUserId={ownerUserId} accent={accent} />
    </div>
  )
}
