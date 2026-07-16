'use client'
import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { AiBriefing } from '@/components/AiBriefing'
import { getTodayQod } from '@/lib/qod'
import { getTodayWod } from '@/lib/wod'
import { markMissionDone } from './actions'
import { submitCheckin } from '@/app/(app)/checkin/actions'

type MomentumDay = { date: string; dayLabel: string; done: boolean }
type MissionGoal = {
  id: string
  title: string
  category: string | null
  progress: number
  next_action: string | null
  deadline: string | null
}
type RingGoal = { id: string; title: string; category: string | null; progress: number }
type NextLesson = { moduleEmoji: string; moduleTitle: string; moduleColor: string; lessonTitle: string; duration: string }

type WeeklyReflection = { rating: number; weekTitle: string | null } | null

interface Props {
  firstName: string
  streak: number
  xp: number
  level: number
  todayLabel: string
  momentumDays: MomentumDay[]
  missionGoal: MissionGoal | null
  ringGoals: RingGoal[]
  nextLesson: NextLesson | null
  weeklyReflection: WeeklyReflection
  reflectionUnlocked: boolean
  reflectionDayName: string
  qodAnswered: boolean
  missionDone: boolean
  energyToday: number | null
}

const CAT_COLOR: Record<string, string> = {
  health: '#22c55e', fitness: '#22c55e',
  career: '#a78bfa', work: '#a78bfa',
  finance: '#D4AF37', money: '#D4AF37', savings: '#D4AF37',
  learning: '#38bdf8', education: '#38bdf8',
  relationships: '#f97316', social: '#f97316',
  creative: '#ec4899', mindset: '#D4AF37',
}

function getCatColor(cat: string | null): string {
  return CAT_COLOR[(cat ?? '').toLowerCase()] ?? '#D4AF37'
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return 'night owl'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function getSubline(streak: number) {
  if (streak >= 12) return `${streak}-week streak. You're in rare company.`
  if (streak >= 8)  return `${streak} weeks straight. You're built different.`
  if (streak >= 4)  return `${streak}-week streak — consistency is compounding.`
  if (streak >= 2)  return `Week ${streak} — the chain is growing. Don't break it.`
  if (streak >= 1)  return "One week in. Build the habit, then build the life."
  const h = new Date().getHours()
  if (h < 5)  return 'Still at it. Respect.'
  if (h < 12) return 'What will you build today?'
  if (h < 17) return 'Keep the momentum going.'
  return 'Finish strong.'
}

// ── Animated SVG goal ring ─────────────────────────────────────────────
function GoalRing({ goal, index }: { goal: RingGoal; index: number }) {
  const circleRef = useRef<SVGCircleElement>(null)
  const r = 30
  const circ = 2 * Math.PI * r
  const targetOffset = circ * (1 - goal.progress / 100)
  const color = getCatColor(goal.category)

  useEffect(() => {
    const el = circleRef.current
    if (!el) return
    el.style.strokeDashoffset = String(circ)
    const id = setTimeout(() => {
      el.style.transition = `stroke-dashoffset ${0.9 + index * 0.1}s cubic-bezier(0.4,0,0.2,1) ${index * 0.1 + 0.1}s`
      el.style.strokeDashoffset = String(targetOffset)
    }, 80)
    return () => clearTimeout(id)
  }, [circ, targetOffset, index])

  return (
    <Link
      href={`/goals?goal=${goal.id}`}
      style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}
    >
      <div style={{ position: 'relative', width: 76, height: 76 }}>
        <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="38" cy="38" r={r} fill="none" stroke={`${color}1A`} strokeWidth="6" />
          <circle
            ref={circleRef}
            cx="38" cy="38" r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 900, color, lineHeight: 1 }}>{goal.progress}%</span>
        </div>
      </div>
      <p style={{
        fontSize: 10, fontWeight: 700,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center', lineHeight: 1.4,
        maxWidth: 80,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {goal.title}
      </p>
    </Link>
  )
}

// ── Animated progress bar for mission card ────────────────────────────
function MissionBar({ progress, color }: { progress: number; color: string }) {
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const id = setTimeout(() => {
      el.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)'
      el.style.width = `${progress}%`
    }, 280)
    return () => clearTimeout(id)
  }, [progress])

  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden', marginTop: 14 }}>
      <div
        ref={barRef}
        style={{ height: '100%', width: '0%', background: `linear-gradient(90deg,${color}cc,${color})`, borderRadius: 99 }}
      />
    </div>
  )
}

// ── Reflection card ────────────────────────────────────────────────────
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

function ReflectionCard({ reflection, unlocked, dayName }: { reflection: WeeklyReflection; unlocked: boolean; dayName: string }) {
  if (reflection) {
    const rColor = RATING_COLOR[reflection.rating] ?? '#D4AF37'
    return (
      <Link href="/assess" style={{ textDecoration: 'none', display: 'block', borderRadius: 20, background: 'linear-gradient(145deg,#101010,#0d0d0d)', border: `1px solid ${rColor}28`, padding: '18px 20px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: '50%', background: rColor, filter: 'blur(48px)', opacity: 0.12, pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, flexShrink: 0 }}>
            <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: rColor }}>{reflection.rating}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: `${rColor}60` }}>/10</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', marginBottom: 4 }}>THIS WEEK&apos;S REFLECTION</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {reflection.weekTitle ? `"${reflection.weekTitle}"` : RATING_LABEL[reflection.rating]}
            </p>
          </div>
          <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: `${rColor}18`, border: `1px solid ${rColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={rColor} strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 13L9.5 18.5L21 5"/>
            </svg>
          </div>
        </div>
      </Link>
    )
  }

  if (unlocked) {
    return (
      <Link href="/assess" style={{ textDecoration: 'none', display: 'block', borderRadius: 20, background: 'linear-gradient(145deg,rgba(139,92,246,0.06),#0d0d0d)', border: '1px solid rgba(139,92,246,0.22)', padding: '18px 20px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            📝
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.14em', color: '#a78bfa', marginBottom: 4 }}>WEEKLY REFLECTION</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em' }}>How was your week?</p>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: 999, background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.35)', flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#a78bfa', letterSpacing: '0.08em' }}>WRITE</span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 16 }}>📝</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>Weekly reflection opens {dayName}</p>
      </div>
      <Link href="/assess" style={{ textDecoration: 'none', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>view →</Link>
    </div>
  )
}

// ── Mission Card ──────────────────────────────────────────────────────
function MissionCard({ goal, initialDone }: { goal: MissionGoal | null; initialDone: boolean }) {
  const [done, setDone] = useState(initialDone)
  const [pending, startTransition] = useTransition()

  function handleDone() {
    if (done || pending) return
    setDone(true)
    startTransition(async () => {
      await markMissionDone()
    })
  }

  if (!goal) {
    return (
      <Link
        href="/goals"
        className="h-fadeup"
        style={{
          textDecoration: 'none', display: 'block',
          background: 'rgba(212,175,55,0.04)',
          border: '1px dashed rgba(212,175,55,0.18)',
          borderRadius: 20, padding: '28px 20px',
          marginBottom: 24, animationDelay: '0.12s', textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 28, marginBottom: 10 }}>🎯</p>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '-0.01em' }}>Set your first goal</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginTop: 6, lineHeight: 1.5 }}>
          Everything starts with a clear target.
        </p>
      </Link>
    )
  }

  const color  = getCatColor(goal.category)
  const action = goal.next_action ?? 'Work on this goal'

  return (
    <div
      className="h-fadeup"
      style={{
        borderRadius: 22,
        background: '#0c0c0c',
        border: `1px solid ${color}1e`,
        overflow: 'hidden',
        marginBottom: 24,
        animationDelay: '0.12s',
        position: 'relative',
      }}
    >
      {/* Atmospheric glow */}
      <div style={{ position: 'absolute', top: -70, left: -40, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle, ${color}18, transparent 65%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -50, right: -30, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${color}0a, transparent 65%)`, pointerEvents: 'none' }} />

      {/* Header */}
      <Link href={`/goals?goal=${goal.id}`} style={{ textDecoration: 'none', display: 'block', padding: '20px 20px 18px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)' }}>
            MISSION BRIEF
          </p>
          {goal.category && (
            <span style={{
              fontSize: 8, fontWeight: 900, letterSpacing: '0.12em',
              color: color,
              background: `${color}14`,
              border: `1px solid ${color}2e`,
              padding: '3px 9px', borderRadius: 999,
            }}>
              {goal.category.toUpperCase()}
            </span>
          )}
        </div>

        <p style={{ fontSize: 21, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.22, marginBottom: 18 }}>
          {goal.title}
        </p>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>{goal.progress}% complete</span>
          {goal.deadline && (
            <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.18)' }}>
              Due {new Date(goal.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        <MissionBar progress={goal.progress} color={color} />
      </Link>

      {/* Action strip */}
      <div style={{
        borderTop: `1px solid ${done ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)'}`,
        background: done ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.015)',
        padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'relative', zIndex: 1,
        transition: 'background 0.4s ease, border-top-color 0.4s ease',
      }}>
        {done ? (
          <>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(74,222,128,0.14)',
              border: '1px solid rgba(74,222,128,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 13L9.5 18.5L21 5"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: '#4ade80', marginBottom: 3, opacity: 0.85 }}>DONE TODAY</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {action}
              </p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(74,222,128,0.45)', flexShrink: 0 }}>✓</span>
          </>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.22)', marginBottom: 3 }}>TODAY&apos;S ACTION</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                → {action}
              </p>
            </div>
            <button
              onClick={handleDone}
              disabled={pending}
              style={{
                flexShrink: 0,
                padding: '9px 18px', borderRadius: 999,
                background: color,
                border: 'none',
                boxShadow: `0 3px 18px ${color}44`,
                cursor: 'pointer',
                opacity: pending ? 0.7 : 1,
                transition: 'opacity 0.2s ease, transform 0.12s ease',
                WebkitTapHighlightColor: 'transparent',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)' }}
              onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 13L9.5 18.5L21 5"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#000', letterSpacing: '0.08em' }}>DONE</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────
const ENERGY_OPTS = [
  { value: 2, emoji: '😴', label: 'Low' },
  { value: 4, emoji: '😐', label: 'Okay' },
  { value: 6, emoji: '😊', label: 'Good' },
  { value: 8, emoji: '😤', label: 'Great' },
  { value: 10, emoji: '🚀', label: 'Peak' },
]

export function HomeClient({ firstName, streak, xp, level, todayLabel, momentumDays, missionGoal, ringGoals, nextLesson, weeklyReflection, reflectionUnlocked, reflectionDayName, qodAnswered, missionDone, energyToday }: Props) {
  const greeting = getGreeting()
  const subline   = getSubline(streak)
  const activeDays = momentumDays.filter(d => d.done).length
  void activeDays

  const [energy, setEnergy] = useState<number | null>(energyToday)
  const [, startEnergyT] = useTransition()

  function handleEnergy(val: number) {
    if (energy !== null) return
    setEnergy(val)
    startEnergyT(async () => { await submitCheckin(val, '') })
  }

  // XP progress toward next level (100 XP per level)
  const xpPerLevel   = level * 100
  const xpInLevel    = xp % xpPerLevel
  const xpPct        = Math.min(100, Math.round((xpInLevel / xpPerLevel) * 100))

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }} className="view-panel">
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes momentumPop {
          0%   { transform:scale(0.3); opacity:0; }
          65%  { transform:scale(1.2); }
          100% { transform:scale(1);   opacity:1; }
        }
        .h-fadeup  { animation: fadeUp 0.4s ease both; }
        .m-dot-lit { animation: momentumPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
        .daily-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="h-fadeup" style={{ padding: '32px 0 20px', animationDelay: '0s' }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>
          {todayLabel}
        </p>

        <h1 style={{ fontSize: 38, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.03em', lineHeight: 1.06, marginBottom: 10 }}>
          Good {greeting},<br />
          <span style={{ background: 'linear-gradient(90deg,#F5D070,#D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {firstName}.
          </span>
        </h1>

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: 18 }}>{subline}</p>

        {/* XP progress bar */}
        {xp >= 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#D4AF37', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.22)', padding: '3px 9px', borderRadius: 999 }}>
                  LV.{level}
                </span>
                {streak > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.38)' }}>
                    🔥 {streak}w streak
                  </span>
                )}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>
                {xpInLevel} / {xpPerLevel} XP
              </span>
            </div>
            <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#D4AF37,#F5D070)', width: `${xpPct}%`, transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── AI BRIEFING ────────────────────────────────────── */}
      <div style={{ margin: '0 -20px' }}>
        <AiBriefing firstName={firstName} topGoalTitle={missionGoal?.title ?? null} streak={streak} />
      </div>

      {/* ── DAILY CARDS ROW (QOD + WOD horizontal scroll) ─── */}
      {(() => {
        const qod = getTodayQod()
        const wod = getTodayWod()
        return (
          <div className="h-fadeup" style={{ marginBottom: 20, animationDelay: '0.06s' }}>
            <div
              className="daily-scroll"
              style={{
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                margin: '0 -20px',
                padding: '4px 20px 8px',
              }}
            >
              {/* QOD card */}
              <Link
                href="/journal"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: '16px 18px',
                  background: 'rgba(212,175,55,0.05)',
                  border: '1px solid rgba(212,175,55,0.18)',
                  borderRadius: 18,
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                  width: 'min(82vw, 310px)',
                  scrollSnapAlign: 'start',
                }}
              >
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg,#D4AF37,#D4AF3740)', borderRadius: '18px 0 0 18px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.14em', color: '#D4AF37', opacity: 0.8 }}>
                    QUESTION OF THE DAY · {qod.label.toUpperCase()}
                  </p>
                  {qodAnswered && (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"><path d="M4 13L9.5 18.5L21 5"/></svg>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{qod.emoji}</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.45 }}>{qod.q}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(212,175,55,0.5)' }}>
                    {qodAnswered ? 'answered ✓' : 'tap to reflect →'}
                  </span>
                </div>
              </Link>

              {/* WOD card */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '16px 18px',
                  background: 'rgba(167,139,250,0.05)',
                  border: '1px solid rgba(167,139,250,0.18)',
                  borderRadius: 18,
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                  width: 'min(82vw, 310px)',
                  scrollSnapAlign: 'start',
                }}
              >
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg,#a78bfa,#a78bfa40)', borderRadius: '18px 0 0 18px' }} />
                <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.14em', color: '#a78bfa', opacity: 0.8 }}>WORD OF THE DAY</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em' }}>{wod.word}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', padding: '2px 6px', borderRadius: 999 }}>{wod.pos}</span>
                </div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>{wod.pronunciation}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{wod.definition}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.45, fontStyle: 'italic', borderTop: '1px solid rgba(167,139,250,0.1)', paddingTop: 8 }}>
                  &ldquo;{wod.example}&rdquo;
                </p>
              </div>

              {/* Spacer so last card has breathing room */}
              <div style={{ flexShrink: 0, width: 8 }} />
            </div>

            {/* Scroll indicator dots */}
            <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 4 }}>
              <div style={{ width: 16, height: 3, borderRadius: 999, background: 'rgba(212,175,55,0.5)' }} />
              <div style={{ width: 6, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.12)' }} />
            </div>
          </div>
        )
      })()}

      {/* ── MISSION CARD ───────────────────────────────────── */}
      <MissionCard goal={missionGoal} initialDone={missionDone} />

      {/* ── CONTINUE LEARNING ──────────────────────────────── */}
      {nextLesson && (() => {
        const mc = nextLesson.moduleColor
        return (
          <Link
            href="/playbook"
            className="h-fadeup"
            style={{
              textDecoration: 'none', display: 'block',
              background: `linear-gradient(145deg, ${mc}14 0%, #0d0d0d 55%)`,
              border: `1px solid ${mc}30`,
              borderRadius: 22,
              padding: '22px 22px 20px',
              animationDelay: '0.24s',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Accent line in module color */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${mc},${mc}00)`, borderRadius: '22px 22px 0 0', pointerEvents: 'none' }} />

            {/* Radial glow in module color */}
            <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${mc}18, transparent 65%)`, pointerEvents: 'none' }} />

            {/* Bottom-left ambient */}
            <div style={{ position: 'absolute', bottom: -40, left: -30, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${mc}0a, transparent 70%)`, pointerEvents: 'none' }} />

            {/* Header row: emoji + module badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 42, lineHeight: 1 }}>{nextLesson.moduleEmoji}</div>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                color: mc, background: `${mc}18`,
                border: `1px solid ${mc}35`,
                padding: '4px 10px', borderRadius: 999,
              }}>
                {nextLesson.moduleTitle.toUpperCase()}
              </span>
            </div>

            {/* Eyebrow */}
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: mc, marginBottom: 6, opacity: 0.75, position: 'relative', zIndex: 1 }}>
              CONTINUE LEARNING
            </p>

            {/* Lesson title */}
            <p style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: 18, position: 'relative', zIndex: 1 }}>
              {nextLesson.lessonTitle}
            </p>

            {/* Bottom row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: `${mc}99`, letterSpacing: '0.04em' }}>+20 XP on completion</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>{nextLesson.duration}</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 20px', borderRadius: 999,
                background: mc,
                boxShadow: `0 4px 22px ${mc}55`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#000', letterSpacing: '0.1em' }}>CONTINUE</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#000"><path d="M8 5.14v13.72L19 12z"/></svg>
              </div>
            </div>
          </Link>
        )
      })()}

      {/* ── WEEKLY REFLECTION ──────────────────────────────── */}
      <div id="reflection" className="h-fadeup" style={{ animationDelay: '0.28s', marginTop: 24 }}>
        <ReflectionCard reflection={weeklyReflection} unlocked={reflectionUnlocked} dayName={reflectionDayName} />
      </div>
    </div>
  )
}
