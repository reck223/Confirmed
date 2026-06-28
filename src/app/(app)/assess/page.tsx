import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssessForm } from './AssessForm'
import { AssessTabs } from './AssessTabs'
import { FieldComments } from './AssessComments'
import { DeleteReflectionButton } from './DeleteReflectionButton'
import { ArchiveChapterCard } from './ArchiveChapterCard'
import type { Assessment } from '@/lib/types/database'

type AssessmentComment = {
  id: string; user_id: string; field: string; content: string; created_at: string; author_name: string | null
}

const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - day)
  return sunday.toISOString().split('T')[0]
}

function nextOccurrence(targetDay: number): Date {
  const now = new Date()
  const today = now.getDay()
  const daysUntil = (targetDay - today + 7) % 7 || 7
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntil)
  return next
}

const RATING_COLOR: Record<number, string> = {
  1: '#f87171', 2: '#f87171', 3: '#fb923c', 4: '#fbbf24', 5: '#fbbf24',
  6: '#D4AF37', 7: '#D4AF37', 8: '#4ade80', 9: '#4ade80', 10: '#22c55e',
}
const RATING_LABEL: Record<number, string> = {
  1: 'Keep going.', 2: 'Keep going.', 3: 'Keep going.',
  4: 'Stay the course.', 5: 'Solid effort.',
  6: 'Decent week.', 7: 'Good week.',
  8: 'Strong week.', 9: 'Exceptional.', 10: 'Lock it in.',
}
const RATING_GRAD: Record<number, string> = {
  1: 'linear-gradient(135deg,#1a0000,#0d0d0d)',
  2: 'linear-gradient(135deg,#1a0000,#0d0d0d)',
  3: 'linear-gradient(135deg,#1a0800,#0d0d0d)',
  4: 'linear-gradient(135deg,#1a1200,#0d0d0d)',
  5: 'linear-gradient(135deg,#1a1200,#0d0d0d)',
  6: 'linear-gradient(135deg,#1a1400,#0d0d0d)',
  7: 'linear-gradient(135deg,#1a1400,#0d0d0d)',
  8: 'linear-gradient(135deg,#001a08,#0d0d0d)',
  9: 'linear-gradient(135deg,#001a08,#0d0d0d)',
  10: 'linear-gradient(135deg,#001a08,#0d0d0d)',
}

export default async function AssessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const weekStart = getWeekStart()

  const [{ data: allAssessments }, { data: profileData }] = await Promise.all([
    supabase.from('assessments').select('*').eq('user_id', user.id).order('week_start', { ascending: false }),
    supabase.from('profiles').select('streak, assessment_day').eq('id', user.id).single(),
  ])

  const existingForComments = ((allAssessments as Assessment[] | null) ?? []).find(a => a.week_start === getWeekStart()) ?? null

  // Fetch comments on this week's assessment
  let comments: AssessmentComment[] = []
  if (existingForComments) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: commentRows } = await (supabase.from('assessment_comments') as any)
      .select('id, user_id, field, content, created_at')
      .eq('assessment_id', existingForComments.id)
      .order('created_at', { ascending: true })
    const rawComments = (commentRows ?? []) as { id: string; user_id: string; field: string; content: string; created_at: string }[]
    const authorIds = [...new Set(rawComments.map(c => c.user_id))]
    const { data: authorRows } = authorIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', authorIds)
      : { data: [] }
    const authorMap = Object.fromEntries(((authorRows ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name]))
    comments = rawComments.map(c => ({ ...c, author_name: authorMap[c.user_id] ?? null }))
  }

  const assessments = (allAssessments as Assessment[] | null) ?? []
  const existing = assessments.find(a => a.week_start === weekStart) ?? null
  const history  = assessments.filter(a => a.week_start !== weekStart)
  const streak = (profileData as { streak: number; assessment_day: string } | null)?.streak ?? 0
  const assessmentDay = (profileData as { streak: number; assessment_day: string } | null)?.assessment_day ?? 'Sun'

  const todayNum = new Date().getDay()
  const setDayNum = DAY_MAP[assessmentDay] ?? 0
  const lateDay = (setDayNum + 1) % 7
  const isAllowed = todayNum === setDayNum || todayNum === lateDay

  // ── This Week content ──
  let thisWeekContent: React.ReactNode

  if (existing) {
    const rating = existing.rating ?? 7
    const rColor = RATING_COLOR[rating] ?? '#D4AF37'
    const rGrad  = RATING_GRAD[rating]  ?? 'linear-gradient(135deg,#1a1400,#0d0d0d)'
    const chapterNum = assessments.length
    const dateLabel = new Date(existing.week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    thisWeekContent = (
      <div>
        {/* Chapter hero */}
        <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', marginBottom: 14, background: rGrad, border: `1px solid ${rColor}22`, padding: '36px 28px 32px' }}>
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: `${rColor}14`, filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: '50%', background: `${rColor}08`, filter: 'blur(50px)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Chapter label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ height: 1, width: 24, background: `${rColor}60` }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: rColor, opacity: 0.8 }}>
                CHAPTER {chapterNum} · WEEK OF {dateLabel.toUpperCase()}
              </span>
              <div style={{ height: 1, flex: 1, background: `${rColor}20` }} />
            </div>

            {/* Title */}
            {existing.week_title ? (
              <h1 style={{ fontSize: 38, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 24 }}>
                &ldquo;{existing.week_title}&rdquo;
              </h1>
            ) : (
              <h1 style={{ fontSize: 34, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 24 }}>
                Week {chapterNum}
              </h1>
            )}

            {/* Rating row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: rColor, textShadow: `0 0 40px ${rColor}60` }}>{rating}</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: `${rColor}80` }}>/10</span>
              </div>
              <div>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.2 }}>{RATING_LABEL[rating]}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke={rColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontSize: 11, color: rColor, fontWeight: 600 }}>Reflection complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rating bar sparkline (all weeks) */}
        {assessments.length > 1 && (
          <div style={{ marginBottom: 14, padding: '14px 18px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#444', marginBottom: 10 }}>YOUR JOURNEY — {assessments.length} WEEKS</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 32 }}>
              {[...assessments].reverse().map((a, i) => {
                const r = a.rating ?? 5
                const c = RATING_COLOR[r] ?? '#D4AF37'
                const isThis = a.week_start === weekStart
                return (
                  <div key={i} title={`Week of ${a.week_start}: ${r}/10`} style={{ flex: 1, borderRadius: 3, transition: 'height 0.3s', height: `${(r / 10) * 100}%`, background: isThis ? c : `${c}55`, boxShadow: isThis ? `0 0 8px ${c}60` : 'none' }} />
                )
              })}
            </div>
          </div>
        )}

        {/* Journal entries with comments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {existing.wins       && <JournalField label="WINS"        emoji="🏆" content={existing.wins}       accent="#22c55e" assessmentId={existing.id} field="wins"        comments={comments} currentUserId={user.id} ownerUserId={user.id} />}
          {existing.challenges && <JournalField label="CHALLENGES"  emoji="⚡" content={existing.challenges} accent="#f59e0b" assessmentId={existing.id} field="challenges"  comments={comments} currentUserId={user.id} ownerUserId={user.id} />}
          {existing.lessons    && <JournalField label="LESSON"      emoji="💡" content={existing.lessons}    accent="#a78bfa" assessmentId={existing.id} field="lessons"     comments={comments} currentUserId={user.id} ownerUserId={user.id} />}
          {existing.intentions && <JournalField label="NEXT 7 DAYS" emoji="🎯" content={existing.intentions} accent="#D4AF37" assessmentId={existing.id} field="intentions"  comments={comments} currentUserId={user.id} ownerUserId={user.id} />}
          {existing.gratitude  && <JournalField label="YOUR CIRCLE" emoji="🤝" content={existing.gratitude}  accent="#38bdf8" assessmentId={existing.id} field="gratitude"   comments={comments} currentUserId={user.id} ownerUserId={user.id} />}
        </div>

        <p style={{ marginTop: 20, fontSize: 11, color: '#333', textAlign: 'center', fontStyle: 'italic' }}>
          Come back {DAY_NAMES[setDayNum]} for Chapter {chapterNum + 1}
        </p>
        <DeleteReflectionButton assessmentId={existing.id} />
      </div>
    )
  } else if (!isAllowed) {
    thisWeekContent = (
      <div>
        <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', background: 'linear-gradient(160deg,#0f0f0f,#080808)', border: '1px solid rgba(255,255,255,0.06)', padding: '52px 28px', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, borderRadius: '50%', background: 'rgba(212,175,55,0.05)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>🔒</div>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#D4AF37', marginBottom: 10, opacity: 0.7 }}>REFLECTION LOCKED</p>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8 }}>
              Opens {DAY_NAMES[setDayNum]}
            </h2>
            <p style={{ fontSize: 13, color: '#555', fontWeight: 300, lineHeight: 1.7, marginBottom: 28 }}>
              Your reflection window opens on <strong style={{ color: '#888' }}>{DAY_NAMES[setDayNum]}</strong>.<br />
              Late submissions accepted through {DAY_NAMES[lateDay]}.
            </p>
            <div style={{ display: 'inline-block', padding: '14px 24px', borderRadius: 16, background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.18)' }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#D4AF37', marginBottom: 5, opacity: 0.7 }}>NEXT CHAPTER OPENS</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF' }}>
                {nextOccurrence(setDayNum).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  } else {
    thisWeekContent = <AssessForm weekStart={weekStart} streak={streak} />
  }

  // ── Archive content ──
  const archiveContent = (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#555', marginBottom: 8 }}>YOUR MEMOIR</p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {history.length} Chapter{history.length !== 1 ? 's' : ''}<br />Written.
        </h1>
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
          <p style={{ fontSize: 40, marginBottom: 14 }}>📖</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', marginBottom: 6 }}>No chapters yet</p>
          <p style={{ fontSize: 13, color: '#555', fontWeight: 300, lineHeight: 1.65 }}>
            Complete a weekly reflection and it will live here forever.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(history as Assessment[]).map((a, idx) => (
            <ArchiveChapterCard
              key={a.id}
              assessment={a}
              chapterNum={assessments.length - 1 - idx}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <AssessTabs
      historyCount={history.length}
      thisWeek={thisWeekContent}
      archive={archiveContent}
    />
  )
}

type CommentType = { id: string; user_id: string; field: string; content: string; created_at: string; author_name: string | null }

function JournalField({ label, emoji, content, accent, assessmentId, field, comments, currentUserId, ownerUserId }: {
  label: string; emoji: string; content: string; accent: string
  assessmentId?: string; field?: string; comments?: CommentType[]; currentUserId?: string; ownerUserId?: string
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
      {assessmentId && field && comments && currentUserId && ownerUserId && (
        <FieldComments
          assessmentId={assessmentId}
          field={field}
          comments={comments}
          currentUserId={currentUserId}
          ownerUserId={ownerUserId}
          accent={accent}
        />
      )}
    </div>
  )
}
