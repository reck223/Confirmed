'use client'

import { useState, useTransition, useRef, useEffect, useMemo, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import type { Goal } from '@/lib/types/database'
import { submitCheckin } from '../checkin/actions'
import { toggleReaction } from '../circle/actions'
import { toggleMilestone } from '../goals/actions'
import { createHomePost } from './actions'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { RecentPost, CheckinDay, FocusItem } from './page'

// ── Helpers ──────────────────────────────────────────────────────────
const ENERGY_COLOR = (e: number) =>
  e >= 8 ? '#22c55e' : e >= 6 ? '#D4AF37' : e >= 4 ? '#f97316' : '#f87171'
const ENERGY_LABEL = (e: number) =>
  e >= 9 ? 'Locked in' : e >= 7 ? 'Strong' : e >= 5 ? 'Decent' : e >= 3 ? 'Low' : 'Drained'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return 'night owl'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const TYPE_META: Record<string, { emoji: string; color: string }> = {
  win:       { emoji: '🏆', color: '#4ade80' },
  lesson:    { emoji: '💡', color: '#D4AF37' },
  progress:  { emoji: '📈', color: '#a78bfa' },
  vibe:      { emoji: '🔥', color: '#f97316' },
  milestone: { emoji: '🎯', color: '#7dd3fc' },
  question:  { emoji: '❓', color: '#f472b6' },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_GRADS = [
  'linear-gradient(135deg,#22c55e,#0ea5e9)',
  'linear-gradient(135deg,#f472b6,#fb923c)',
  'linear-gradient(135deg,#a78bfa,#38bdf8)',
  'linear-gradient(135deg,#D4AF37,#f97316)',
  'linear-gradient(135deg,#f87171,#d946ef)',
  'linear-gradient(135deg,#4ade80,#D4AF37)',
]
function avatarGrad(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_GRADS[hash % AVATAR_GRADS.length]
}

const CAT_EMOJI: Record<string, string> = {
  health: '💪', career: '🚀', finance: '💰', learning: '📚',
  creative: '🎨', relationships: '❤️', mindset: '🧠', business: '💼',
  personal: '✦', adventure: '🏔️', material: '🎯', spiritual: '🌿',
}

const GOAL_PALETTE: Record<string, { accent: string; bg: string; glow: string }> = {
  health:        { accent: '#22c55e', bg: 'rgba(34,197,94,0.07)',    glow: 'rgba(34,197,94,0.35)'   },
  career:        { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.07)',   glow: 'rgba(139,92,246,0.35)'  },
  finance:       { accent: '#D4AF37', bg: 'rgba(212,175,55,0.07)',   glow: 'rgba(212,175,55,0.35)'  },
  learning:      { accent: '#38bdf8', bg: 'rgba(56,189,248,0.07)',   glow: 'rgba(56,189,248,0.35)'  },
  creative:      { accent: '#f97316', bg: 'rgba(249,115,22,0.07)',   glow: 'rgba(249,115,22,0.35)'  },
  relationships: { accent: '#f43f5e', bg: 'rgba(244,63,94,0.07)',    glow: 'rgba(244,63,94,0.35)'   },
  mindset:       { accent: '#818cf8', bg: 'rgba(129,140,248,0.07)',  glow: 'rgba(129,140,248,0.35)' },
  business:      { accent: '#3b82f6', bg: 'rgba(59,130,246,0.07)',   glow: 'rgba(59,130,246,0.35)'  },
  personal:      { accent: '#14b8a6', bg: 'rgba(20,184,166,0.07)',   glow: 'rgba(20,184,166,0.35)'  },
  adventure:     { accent: '#84cc16', bg: 'rgba(132,204,22,0.07)',   glow: 'rgba(132,204,22,0.35)'  },
  material:      { accent: '#ef4444', bg: 'rgba(239,68,68,0.07)',    glow: 'rgba(239,68,68,0.35)'   },
  spiritual:     { accent: '#c084fc', bg: 'rgba(192,132,252,0.07)',  glow: 'rgba(192,132,252,0.35)' },
}
function goalPalette(cat: string | null) {
  return GOAL_PALETTE[cat ?? ''] ?? { accent: '#D4AF37', bg: 'rgba(212,175,55,0.07)', glow: 'rgba(212,175,55,0.35)' }
}

function deadlineBadge(deadline: string | null): { label: string; color: string } | null {
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline + 'T12:00:00').getTime() - Date.now()) / 86400000)
  if (days < 0)   return { label: 'Past due', color: '#f87171' }
  if (days === 0) return { label: 'Due today', color: '#f87171' }
  if (days <= 3)  return { label: `${days}d`, color: '#f97316' }
  if (days <= 14) return { label: `${days}d`, color: '#D4AF37' }
  return null
}

type GoalGroup = {
  goalId: string; goalTitle: string; category: string | null
  deadline: string | null; progress: number; items: FocusItem[]
}
function groupByGoal(pool: FocusItem[]): GoalGroup[] {
  const map: Record<string, GoalGroup> = {}
  for (const item of pool) {
    if (!map[item.goalId]) map[item.goalId] = { goalId: item.goalId, goalTitle: item.goalTitle, category: item.category, deadline: item.deadline, progress: item.progress, items: [] }
    map[item.goalId].items.push(item)
  }
  return Object.values(map)
}

// ── Props ─────────────────────────────────────────────────────────────
interface Props {
  todayLabel: string; firstName: string; streak: number
  goals: Goal[]; focusPool: FocusItem[]; isNewUser: boolean
  todayCheckin: { energy: number; note: string | null } | null
  checkinHistory: CheckinDay[]; recentPosts: RecentPost[]
  reflectionDone: boolean; assessmentDay: string; inCircle: boolean
  userId: string; isCreator?: boolean
}

// ══════════════════════════════════════════════════════
// 1. HERO + MOMENTUM RING
// ══════════════════════════════════════════════════════
function HeroSection({ firstName, greeting, streak, todayLabel, goals, focusPool, isNewUser }: {
  firstName: string; greeting: string; streak: number; todayLabel: string
  goals: Goal[]; focusPool: FocusItem[]; isNewUser: boolean
}) {
  const [ringMounted, setRingMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setRingMounted(true), 300); return () => clearTimeout(t) }, [])

  const avgProgress = goals.length > 0
    ? Math.round(goals.reduce((a, g) => a + (g.progress ?? 0), 0) / goals.length)
    : 0

  const nextDeadline = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const upcoming = goals
      .filter(g => g.deadline && g.deadline >= today)
      .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
    if (!upcoming.length) return null
    const days = Math.ceil((new Date(upcoming[0].deadline! + 'T12:00:00').getTime() - Date.now()) / 86400000)
    return { days }
  }, [goals])

  const ringR = 52
  const ringCirc = 2 * Math.PI * ringR
  const ringOffset = ringCirc * (1 - (ringMounted ? avgProgress : 0) / 100)
  const ringColor = avgProgress >= 70 ? '#4ade80' : avgProgress >= 35 ? '#D4AF37' : '#f97316'
  const ringGlow  = avgProgress >= 70 ? 'rgba(74,222,128,0.55)' : avgProgress >= 35 ? 'rgba(212,175,55,0.55)' : 'rgba(249,115,22,0.55)'

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background aurora */}
      <div style={{ position: 'absolute', top: -80, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.13) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 60, left: -80, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px 20px 0', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)' }}>{todayLabel}</p>
        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.22)' }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#D4AF37', fontFamily: 'Satoshi,sans-serif' }}>{streak}w</span>
          </div>
        )}
      </div>

      {/* Greeting */}
      <div style={{ padding: '14px 20px 20px', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 34, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.03em', lineHeight: 1.08, margin: 0 }}>
          Good {greeting},<br />
          <span style={{ background: 'linear-gradient(90deg,#F5D070,#D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {firstName}.
          </span>
        </h1>
      </div>

      {/* Momentum panel */}
      {!isNewUser && goals.length > 0 && (
        <div style={{ margin: '0 20px 28px', padding: '20px', borderRadius: 24, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', zIndex: 1, backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

            {/* Ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: -18, borderRadius: '50%', background: `radial-gradient(circle, ${ringGlow.replace('0.55', '0.12')} 0%, transparent 70%)`, pointerEvents: 'none' }} />
              <svg width="124" height="124" viewBox="0 0 124 124" style={{ display: 'block' }}>
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={ringColor} stopOpacity="1"/>
                    <stop offset="100%" stopColor={ringColor} stopOpacity="0.6"/>
                  </linearGradient>
                </defs>
                {/* Track */}
                <circle cx="62" cy="62" r={ringR} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                {/* Arc */}
                <circle cx="62" cy="62" r={ringR} fill="none"
                  stroke="url(#ringGrad)" strokeWidth="8"
                  strokeDasharray={ringCirc}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 62 62)"
                  style={{
                    transition: 'stroke-dashoffset 1.6s cubic-bezier(0.34,1.1,0.64,1)',
                    filter: `drop-shadow(0 0 10px ${ringGlow})`,
                  }}
                />
                {/* Center */}
                <text x="62" y="57" textAnchor="middle" fill="#EFEFEF" fontSize="22" fontWeight="900" fontFamily="Satoshi,sans-serif">{avgProgress}%</text>
                <text x="62" y="73" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="800" letterSpacing="1.8" fontFamily="Satoshi,sans-serif">PROGRESS</text>
              </svg>
            </div>

            {/* Stats */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <StatChip icon="🎯" value={`${goals.length}`} label={`Active Goal${goals.length !== 1 ? 's' : ''}`} color="#D4AF37" />
              <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
              <StatChip icon="📋" value={`${focusPool.length}`} label="Today&apos;s Tasks" color="#4ade80" />
              {nextDeadline && (
                <>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
                  <StatChip
                    icon="📅"
                    value={`${nextDeadline.days}d`}
                    label="Next Deadline"
                    color={nextDeadline.days <= 3 ? '#f87171' : nextDeadline.days <= 7 ? '#f97316' : '#D4AF37'}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatChip({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF', lineHeight: 1, fontFamily: 'Satoshi,sans-serif' }}>{value}</p>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)', fontWeight: 700, letterSpacing: '0.08em', marginTop: 1 }}>{label.toUpperCase()}</p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 2. GOAL STRIP — horizontal scroll
// ══════════════════════════════════════════════════════
const GOAL_CAT_COLORS: Record<string, string> = {
  health: '#22c55e', career: '#8b5cf6', finance: '#D4AF37', learning: '#38bdf8',
  creative: '#f97316', relationships: '#f43f5e', mindset: '#818cf8', business: '#3b82f6',
  personal: '#14b8a6', adventure: '#84cc16', material: '#ef4444', spiritual: '#c084fc',
}
function homeCatColor(cat: string | null) { return GOAL_CAT_COLORS[cat ?? ''] ?? '#D4AF37' }

function GoalStrip({ goals }: { goals: Goal[] }) {
  const [mounted, setMounted] = useState(false)
  const [catFilter, setCatFilter] = useState<string | null>(null)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 500); return () => clearTimeout(t) }, [])
  if (!goals.length) return null
  const nonLetter = goals.filter(g => g.goal_type !== 'letter')
  if (!nonLetter.length) return null
  const categories = [...new Set(nonLetter.map(g => g.category).filter(Boolean))] as string[]
  const displayed = catFilter ? nonLetter.filter(g => g.category === catFilter) : nonLetter

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 20px' }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)' }}>YOUR GOALS</p>
        <Link href="/goals" style={{ fontSize: 10, fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>See all →</Link>
      </div>
      {/* Category filter pills */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 20px 10px', WebkitOverflowScrolling: 'touch' }}>
          <button onClick={() => setCatFilter(null)} style={{ padding: '5px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s', background: catFilter === null ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: catFilter === null ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)', color: catFilter === null ? '#D4AF37' : '#555' }}>All</button>
          {categories.map(cat => {
            const c = homeCatColor(cat); const sel = catFilter === cat
            return <button key={cat} onClick={() => setCatFilter(sel ? null : cat)} style={{ padding: '5px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s', textTransform: 'capitalize', background: sel ? `${c}18` : 'rgba(255,255,255,0.04)', border: sel ? `1px solid ${c}44` : '1px solid rgba(255,255,255,0.08)', color: sel ? c : '#555' }}>{cat}</button>
          })}
        </div>
      )}
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto',
        padding: '4px 20px 12px',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        {displayed.map(g => {
          const { accent, bg, glow } = goalPalette(g.category)
          const pct = g.progress ?? 0
          const r = 20, circ = 2 * Math.PI * r
          const offset = circ * (1 - (mounted ? pct : 0) / 100)
          const emoji = CAT_EMOJI[g.category ?? ''] ?? '✦'
          return (
            <Link key={g.id} href={`/goals?goal=${g.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                width: 148, borderRadius: 20, overflow: 'hidden',
                background: '#0d0d0d', border: `1px solid ${accent}20`,
                boxShadow: `0 4px 28px rgba(0,0,0,0.5)`,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}>
                {/* Accent top bar */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}44)`, boxShadow: `0 2px 12px ${glow}` }} />
                <div style={{ padding: '12px 14px 14px' }}>
                  {/* Top row: emoji + ring */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      {emoji}
                    </div>
                    <svg width="48" height="48" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4.5"/>
                      <circle cx="24" cy="24" r={r} fill="none"
                        stroke={accent} strokeWidth="4.5"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform="rotate(-90 24 24)"
                        style={{
                          transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34,1.1,0.64,1) 0.5s',
                          filter: `drop-shadow(0 0 4px ${glow})`,
                        }}
                      />
                      <text x="24" y="28" textAnchor="middle" fill={accent} fontSize="10" fontWeight="900" fontFamily="Satoshi,sans-serif">{pct}%</text>
                    </svg>
                  </div>
                  {/* Title */}
                  <p style={{
                    fontSize: 12, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.35,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    marginBottom: 6,
                  }}>{g.title}</p>
                  {/* Category */}
                  <p style={{ fontSize: 9, color: accent, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {g.category ?? 'goal'}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
        {/* Add goal card */}
        <Link href="/goals" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 148, height: '100%', minHeight: 148, borderRadius: 20,
            border: '1px dashed rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.03)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>+</div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#D4AF37', letterSpacing: '0.06em' }}>ADD GOAL</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 3. PRIORITY GOAL CARD
// ══════════════════════════════════════════════════════
function PriorityGoalCard({ pool }: { pool: FocusItem[] }) {
  const groups = groupByGoal(pool)
  if (!groups.length) return null

  function urgencyScore(g: GoalGroup) {
    if (!g.deadline) return 999 - g.progress
    const days = Math.ceil((new Date(g.deadline + 'T12:00:00').getTime() - Date.now()) / 86400000)
    if (days < 0) return -1000 + days
    return days - g.progress / 10
  }

  const sorted = [...groups].sort((a, b) => urgencyScore(a) - urgencyScore(b))
  const top = sorted[0]
  if (!top) return null

  const badge = deadlineBadge(top.deadline)
  if (!badge && top.progress >= 60) return null

  const { accent, bg, glow } = goalPalette(top.category)
  const emoji = CAT_EMOJI[top.category ?? ''] ?? '✦'
  const firstTask = top.items[0]
  const isPastDue = badge?.label === 'Past due'
  const highlightColor = isPastDue ? '#f87171' : badge?.color ?? accent

  return (
    <div style={{ padding: '0 20px', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)' }}>PRIORITY TODAY</p>
        {badge && <span style={{ fontSize: 9, fontWeight: 800, color: highlightColor, padding: '2px 8px', borderRadius: 4, background: `${highlightColor}14`, border: `1px solid ${highlightColor}30`, letterSpacing: '0.06em' }}>{badge.label.toUpperCase()}</span>}
      </div>
      <Link href={`/goals?goal=${top.goalId}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          borderRadius: 20, padding: '16px 18px',
          background: isPastDue ? 'rgba(248,113,113,0.05)' : bg,
          border: `1px solid ${isPastDue ? 'rgba(248,113,113,0.2)' : accent + '30'}`,
          boxShadow: `0 4px 24px ${isPastDue ? 'rgba(248,113,113,0.08)' : glow.replace('0.35', '0.06')}`,
          transition: 'all 0.2s',
        }}>
          {/* Category + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${accent}15`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, color: accent, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'capitalize', marginBottom: 1 }}>{top.category ?? 'Goal'}</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{top.goalTitle}</p>
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>→</span>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: firstTask ? 12 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{top.items.length} task{top.items.length !== 1 ? 's' : ''} left</span>
              <span style={{ fontSize: 10, color: accent, fontWeight: 800 }}>{top.progress}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: `linear-gradient(90deg,${accent}88,${accent})`, width: `${top.progress}%`, borderRadius: 4, boxShadow: `0 0 6px ${glow}`, transition: 'width 0.8s ease' }} />
            </div>
          </div>

          {/* First task preview */}
          {firstTask && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 11, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', marginTop: 0 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${accent}60`, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstTask.text}</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 4. QUICK ACTIONS
// ══════════════════════════════════════════════════════
function QuickActions({ inCircle, reflectionDone }: { inCircle: boolean; reflectionDone: boolean }) {
  const actions = [
    { icon: '🏆', label: 'Post Win', href: '/circle', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.18)' },
    { icon: '🎯', label: 'New Goal', href: '/goals', color: '#D4AF37', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.18)' },
    { icon: reflectionDone ? '✅' : '📋', label: 'Reflect', href: '/assess', color: reflectionDone ? '#22c55e' : '#a78bfa', bg: reflectionDone ? 'rgba(34,197,94,0.08)' : 'rgba(139,92,246,0.08)', border: reflectionDone ? 'rgba(34,197,94,0.18)' : 'rgba(139,92,246,0.18)' },
    { icon: '👥', label: inCircle ? 'My Circle' : 'Join Circle', href: '/circle', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.18)' },
  ]
  return (
    <div style={{ padding: '0 20px', marginBottom: 28 }}>
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>QUICK ACTIONS</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {actions.map(a => (
          <Link key={a.label} href={a.href} style={{ textDecoration: 'none' }}>
            <div style={{
              borderRadius: 16, padding: '12px 8px 10px', textAlign: 'center',
              background: a.bg, border: `1px solid ${a.border}`,
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: 20, marginBottom: 5 }}>{a.icon}</div>
              <p style={{ fontSize: 9, fontWeight: 800, color: a.color, letterSpacing: '0.04em', lineHeight: 1.2 }}>{a.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 5. TODAY'S FOCUS
// ══════════════════════════════════════════════════════
function MilestoneRow({ item, isDone, accent, glow, onTap, animDelay, mode = 'work', isSelected = false }: {
  item: FocusItem; isDone: boolean; accent: string; glow: string
  onTap: () => void; animDelay: number; mode?: 'pick' | 'work'; isSelected?: boolean
}) {
  const [popping, setPopping] = useState(false)
  function handle() {
    if (mode === 'work' && !isDone) { setPopping(true); setTimeout(() => setPopping(false), 500) }
    onTap()
  }
  const badge = deadlineBadge(item.deadline)
  const lit = mode === 'work' ? isDone : isSelected
  return (
    <button onClick={handle} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: 'none',
      background: lit ? `${accent}09` : 'transparent',
      cursor: 'pointer', padding: '12px 16px', textAlign: 'left',
      transition: 'background 0.3s', fontFamily: 'Satoshi,sans-serif',
      animation: `mileIn 0.32s cubic-bezier(0.34,1.1,0.64,1) ${animDelay}ms both`,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        border: lit ? 'none' : `2px solid ${accent}70`,
        background: lit ? accent : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: lit ? `0 0 12px ${glow}` : 'none',
        animation: popping ? 'dotPop 0.45s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
      }}>
        {lit && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span style={{ flex: 1, fontSize: 13, fontWeight: lit && mode === 'work' ? 400 : 500, lineHeight: 1.45, color: lit && mode === 'work' ? '#444' : '#ccc', textDecoration: lit && mode === 'work' ? 'line-through' : 'none', transition: 'all 0.3s' }}>{item.text}</span>
      {!(lit && mode === 'work') && badge && (
        <span style={{ fontSize: 9, fontWeight: 800, color: badge.color, letterSpacing: '0.04em', flexShrink: 0, padding: '2px 6px', borderRadius: 4, background: `${badge.color}14`, border: `1px solid ${badge.color}30` }}>
          {badge.label.toUpperCase()}
        </span>
      )}
    </button>
  )
}

function GoalGroupCard({ group, doneIds, onToggle, cardDelay, mode = 'work', selectedIds }: {
  group: GoalGroup; doneIds: Set<string>; onToggle: (item: FocusItem) => void; cardDelay: number
  mode?: 'pick' | 'work'; selectedIds?: Set<string>
}) {
  const [open, setOpen] = useState(true)
  const { accent, bg, glow } = goalPalette(group.category)
  const emoji = CAT_EMOJI[group.category ?? ''] ?? '✦'
  const doneCnt = group.items.filter(i => doneIds.has(i.id)).length
  const allDone = mode === 'work' && doneCnt === group.items.length && group.items.length > 0
  const selCnt = mode === 'pick' ? group.items.filter(i => selectedIds?.has(i.id)).length : 0
  const countVal = mode === 'pick' ? `${selCnt}/${group.items.length}` : `${doneCnt}/${group.items.length}`
  const countLit = mode === 'pick' ? selCnt === group.items.length && group.items.length > 0 : allDone
  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden', border: `1px solid ${accent}22`, background: '#0d0d0d',
      boxShadow: (allDone || (mode === 'pick' && countLit)) ? `0 0 0 1px ${accent}35, 0 6px 32px ${glow}` : '0 2px 16px rgba(0,0,0,0.4)',
      transition: 'box-shadow 0.5s ease',
      animation: `focusGroupIn 0.42s cubic-bezier(0.34,1.1,0.64,1) ${cardDelay}ms both`,
    }}>
      <div style={{ display: 'flex' }}>
        <div style={{ width: 3, background: `linear-gradient(180deg, ${accent}, ${accent}44)`, flexShrink: 0, boxShadow: `3px 0 14px ${glow}` }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <button onClick={() => setOpen(o => !o)} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none',
            padding: '13px 14px 13px 12px', cursor: 'pointer', textAlign: 'left',
            background: (allDone || (mode === 'pick' && countLit)) ? `${accent}12` : bg, transition: 'background 0.4s', fontFamily: 'Satoshi,sans-serif',
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{group.category ?? 'goal'}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: allDone ? '#555' : '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: allDone ? 'line-through' : 'none', transition: 'all 0.3s' }}>{group.goalTitle}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: countLit ? `${accent}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${countLit ? accent + '44' : 'rgba(255,255,255,0.08)'}`, transition: 'all 0.3s', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: countLit ? accent : '#666', transition: 'color 0.3s' }}>{countVal}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.25s ease' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          {open && (
            <div style={{ borderTop: `1px solid ${accent}14` }}>
              {group.items.map((item, idx) => (
                <div key={item.id}>
                  {idx > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.03)', margin: '0 16px' }} />}
                  <MilestoneRow item={item} isDone={doneIds.has(item.id)} accent={accent} glow={glow} onTap={() => onToggle(item)} animDelay={idx * 55} mode={mode} isSelected={selectedIds?.has(item.id) ?? false} />
                </div>
              ))}
              {allDone && (
                <div style={{ padding: '10px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${accent}18`, background: `${accent}07`, animation: 'mileIn 0.3s ease both' }}>
                  <span style={{ fontSize: 12, color: accent, fontWeight: 600 }}>All done 🎉</span>
                  <Link href="/circle" onClick={e => e.stopPropagation()} style={{ fontSize: 11, fontWeight: 800, color: accent, textDecoration: 'none', padding: '4px 10px', borderRadius: 7, background: `${accent}14`, border: `1px solid ${accent}30` }}>Share win →</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TodaysFocus({ pool }: { pool: FocusItem[] }) {
  const [open, setOpen] = useState(pool.length > 0)
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [mode, setMode] = useState<'pick' | 'work'>('pick')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()
  const celebrated = useRef(false)

  const allGroups = groupByGoal(pool)
  const categories = [...new Set(allGroups.map(g => g.category).filter(Boolean))] as string[]
  const groups = catFilter ? allGroups.filter(g => g.category === catFilter) : allGroups

  const focusGroups = mode === 'work'
    ? groups.map(g => ({ ...g, items: g.items.filter(i => selectedIds.has(i.id)) })).filter(g => g.items.length > 0)
    : groups

  const totalFocus = focusGroups.reduce((a, g) => a + g.items.length, 0)
  const doneCount = focusGroups.reduce((a, g) => a + g.items.filter(i => doneIds.has(i.id)).length, 0)
  const allDone = mode === 'work' && totalFocus > 0 && doneCount === totalFocus
  const selectedCount = selectedIds.size

  useEffect(() => {
    if (allDone && !celebrated.current) {
      celebrated.current = true
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.55 }, colors: ['#4ade80','#D4AF37','#a78bfa','#38bdf8','#f472b6','#fb923c'] })
    }
  }, [allDone])

  function toggleSelect(item: FocusItem) {
    setSelectedIds(prev => { const next = new Set(prev); next.has(item.id) ? next.delete(item.id) : next.add(item.id); return next })
  }

  function handleToggle(item: FocusItem) {
    const willBeDone = !doneIds.has(item.id)
    setDoneIds(prev => { const next = new Set(prev); if (willBeDone) next.add(item.id); else next.delete(item.id); return next })
    if (item.kind === 'milestone') {
      startTransition(async () => { await toggleMilestone(item.id, willBeDone, item.goalId) })
    }
  }

  function selectAll() {
    setSelectedIds(new Set(groups.flatMap(g => g.items.map(i => i.id))))
  }

  function startFocus() {
    if (selectedCount === 0) return
    celebrated.current = false
    setMode('work')
  }

  const accentDots = [...new Set(groups.map(g => goalPalette(g.category).accent))].slice(0, 5)

  return (
    <div style={{ padding: '0 20px', marginBottom: 24 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 18,
        background: open ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)',
        border: open ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.07)',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', fontFamily: 'Satoshi,sans-serif',
        marginBottom: open ? 12 : 0, boxShadow: open ? '0 4px 24px rgba(0,0,0,0.3)' : 'none',
      }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {accentDots.map((c, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}cc`, flexShrink: 0 }} />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 2 }}>TODAY&apos;S FOCUS</p>
          <p style={{ fontSize: 11, fontWeight: 500, color: allDone ? '#4ade80' : doneCount > 0 ? '#D4AF37' : '#666' }}>
            {allDone ? '✓ All done today'
              : mode === 'work' && doneCount > 0 ? `${doneCount} of ${totalFocus} done`
              : mode === 'work' ? `${totalFocus} task${totalFocus !== 1 ? 's' : ''} in focus`
              : selectedCount > 0 ? `${selectedCount} selected · tap Start`
              : `${groups.length} goal${groups.length !== 1 ? 's' : ''} · pick your focus`}
          </p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(0.34,1.1,0.64,1)' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Category filter */}
          {categories.length > 1 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
              <button onClick={() => setCatFilter(null)} style={{ padding: '5px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s', background: catFilter === null ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: catFilter === null ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)', color: catFilter === null ? '#D4AF37' : '#555' }}>All</button>
              {categories.map(cat => {
                const c = homeCatColor(cat); const sel = catFilter === cat
                return <button key={cat} onClick={() => setCatFilter(sel ? null : cat)} style={{ padding: '5px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s', textTransform: 'capitalize', background: sel ? `${c}18` : 'rgba(255,255,255,0.04)', border: sel ? `1px solid ${c}44` : '1px solid rgba(255,255,255,0.08)', color: sel ? c : '#555' }}>{cat}</button>
              })}
            </div>
          )}

          {mode === 'pick' ? (
            <>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 300, paddingLeft: 2, marginTop: -4 }}>Tap to select what you&apos;re working on today.</p>
              {groups.map((g, i) => (
                <GoalGroupCard key={g.goalId} group={g} doneIds={doneIds} onToggle={toggleSelect} cardDelay={i * 75} mode="pick" selectedIds={selectedIds} />
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={selectAll} style={{ padding: '11px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap' }}>
                  Select all
                </button>
                <button onClick={startFocus} disabled={selectedCount === 0} style={{ flex: 1, padding: '11px 16px', borderRadius: 12, border: 'none', cursor: selectedCount > 0 ? 'pointer' : 'default', fontSize: 12, fontWeight: 800, fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.02em', transition: 'all 0.2s', background: selectedCount > 0 ? 'linear-gradient(135deg,#D4AF37,#9A7010)' : 'rgba(255,255,255,0.04)', color: selectedCount > 0 ? '#000' : '#333' }}>
                  {selectedCount > 0 ? `Start Focus · ${selectedCount} task${selectedCount !== 1 ? 's' : ''}` : 'Pick tasks above'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setMode('pick')} style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>← Edit focus</button>
              </div>
              {allDone ? (
                <div style={{ borderRadius: 20, padding: '28px 20px', background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(34,197,94,0.02))', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center', animation: 'focusGroupIn 0.35s ease both' }}>
                  <p style={{ fontSize: 36, marginBottom: 10 }}>🔥</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: '#4ade80', letterSpacing: '-0.02em', marginBottom: 6 }}>You showed up today.</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 300, marginBottom: 18 }}>Your circle is watching. Share the momentum.</p>
                  <Link href="/circle" style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, color: '#4ade80', textDecoration: 'none', padding: '10px 22px', borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', letterSpacing: '0.06em' }}>SHARE A WIN →</Link>
                </div>
              ) : (
                focusGroups.map((g, i) => (
                  <GoalGroupCard key={g.goalId} group={g} doneIds={doneIds} onToggle={handleToggle} cardDelay={i * 75} mode="work" selectedIds={selectedIds} />
                ))
              )}
            </>
          )}
          <Link href="/goals" style={{ display: 'block', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.28)', textDecoration: 'none', fontWeight: 600, paddingTop: 4, animation: 'mileIn 0.35s ease 250ms both' }}>
            Manage all milestones →
          </Link>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 5. CIRCLE PULSE
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// POST CREATION MODAL
// ══════════════════════════════════════════════════════
const POST_TYPES = [
  { key: 'win',      emoji: '🏆', label: 'Win',      color: '#4ade80' },
  { key: 'progress', emoji: '📈', label: 'Progress', color: '#a78bfa' },
  { key: 'lesson',   emoji: '💡', label: 'Lesson',   color: '#D4AF37' },
  { key: 'vibe',     emoji: '🔥', label: 'Vibe',     color: '#f97316' },
]

function CreatePostModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [caption, setCaption] = useState('')
  const [postType, setPostType] = useState('win')
  const [visibility, setVisibility] = useState<'circle' | 'public'>('circle')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isVideo, setIsVideo] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [postError, setPostError] = useState('')

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setIsVideo(f.type.startsWith('video/'))
    setPreview(URL.createObjectURL(f))
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setIsVideo(false)
  }

  function handleClose() {
    clearFile()
    setCaption('')
    setPostType('win')
    setVisibility('circle')
    setPostError('')
    onClose()
  }

  async function handlePost() {
    if (!caption.trim() && !file) return
    setUploading(true)
    setPostError('')
    try {
      let mediaUrl: string | undefined
      let mediaType: 'image' | 'video' | undefined

      if (file) {
        const supabase = createBrowserClient()
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${userId}/${Date.now()}.${ext}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('post-media')
          .upload(path, file, { cacheControl: '3600', upsert: false })
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(uploadData.path)
        mediaUrl = publicUrl
        mediaType = file.type.startsWith('video/') ? 'video' : 'image'
      }

      const result = await createHomePost({ content: caption, type: postType, visibility, mediaUrl, mediaType })
      if (result.error) throw new Error(result.error)
      handleClose()
      router.refresh()
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Upload failed — try again')
    } finally {
      setUploading(false)
    }
  }

  const canPost = (caption.trim().length > 0 || !!file) && !uploading

  return (
    <>
      {/* Backdrop + centered sheet */}
      <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }} onClick={handleClose}>
      <div style={{ width: '100%', maxWidth: 560, maxHeight: '90dvh', borderRadius: 28, background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.2s ease both', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '12px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleClose} style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', padding: 0 }}>
            Cancel
          </button>
          <p style={{ fontSize: 14, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.01em' }}>New Post</p>
          <button onClick={handlePost} disabled={!canPost}
            style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', padding: '8px 18px', borderRadius: 20, cursor: canPost ? 'pointer' : 'default', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.2s', border: 'none', background: canPost ? 'linear-gradient(135deg,#D4AF37,#9A7010)' : 'rgba(255,255,255,0.06)', color: canPost ? '#000' : '#333' }}>
            {uploading ? '…' : 'POST'}
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Media zone */}
          <div style={{ position: 'relative', margin: '16px 20px 0', borderRadius: 20, overflow: 'hidden', background: preview ? '#000' : 'rgba(255,255,255,0.02)', border: preview ? 'none' : '1px dashed rgba(255,255,255,0.1)', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: preview ? 'default' : 'pointer', transition: 'border-color 0.2s' }}
            onClick={() => !preview && fileRef.current?.click()}>
            {preview ? (
              <>
                {isVideo
                  ? <video src={preview} controls playsInline style={{ width: '100%', maxHeight: 340, display: 'block' }} />
                  : <img src={preview} alt="" style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' }} />
                }
                <button onClick={e => { e.stopPropagation(); clearFile() }}
                  style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.25)', color: '#FFF', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontFamily: 'Satoshi,sans-serif' }}>
                  ×
                </button>
                <button onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                  style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.25)', color: '#FFF', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  Change
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ fontSize: 42, marginBottom: 12 }}>📸</div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', fontWeight: 700, marginBottom: 4 }}>Add photo or video</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: 300 }}>tap to browse your camera roll</p>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />

          {/* Type pills */}
          <div style={{ display: 'flex', gap: 8, padding: '16px 20px 0', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
            {POST_TYPES.map(t => {
              const active = postType === t.key
              return (
                <button key={t.key} onClick={() => setPostType(t.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s', border: `1px solid ${active ? t.color + '55' : 'rgba(255,255,255,0.08)'}`, background: active ? t.color + '18' : 'rgba(255,255,255,0.03)', color: active ? t.color : '#555' }}>
                  {t.emoji} {t.label}
                </button>
              )
            })}
          </div>

          {/* Visibility toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px 0' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginRight: 4 }}>VISIBLE TO</p>
            {([['circle', '👥', 'My Circle'], ['public', '🌍', 'Everyone']] as const).map(([v, emoji, label]) => {
              const active = visibility === v
              return (
                <button key={v} onClick={() => setVisibility(v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', border: `1px solid ${active ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)'}`, background: active ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)', color: active ? '#D4AF37' : '#555' }}>
                  {emoji} {label}
                </button>
              )
            })}
          </div>

          {/* Caption */}
          <div style={{ padding: '16px 20px 32px' }}>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              maxLength={500}
              className="cc-input"
              style={{ resize: 'none', fontSize: 15, lineHeight: 1.65, color: '#EFEFEF', fontWeight: 300, width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              {postError
                ? <p style={{ fontSize: 11, color: '#f87171', margin: 0 }}>{postError}</p>
                : <span />}
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', margin: 0 }}>{caption.length}/500</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}

function CirclePulse({ posts, inCircle, onPost }: { posts: RecentPost[]; inCircle: boolean; onPost: () => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [myReactions, setMyReactions] = useState<Record<string, Record<string, boolean>>>({})

  function handleReact(postId: string, type: 'fire' | 'strong' | 'relate') {
    setMyReactions(prev => ({ ...prev, [postId]: { ...(prev[postId] ?? {}), [type]: !(prev[postId]?.[type]) } }))
    startTransition(async () => { await toggleReaction(postId, type); router.refresh() })
  }

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 16 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)' }}>CIRCLE PULSE</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onPost} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: '0.03em', background: 'linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.08))', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
            + Share
          </button>
          <Link href="/circle" style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>See all →</Link>
        </div>
      </div>

      {!inCircle ? (
        <Link href="/circle" style={{ display: 'block', textDecoration: 'none', margin: '0 20px', padding: '28px 20px', borderRadius: 20, border: '1px dashed rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.03)', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', fontWeight: 400, marginBottom: 8, lineHeight: 1.5 }}>Accountability is better together.</p>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', letterSpacing: '0.06em' }}>JOIN OR CREATE A CIRCLE →</p>
        </Link>
      ) : posts.length === 0 ? (
        <div style={{ margin: '0 20px', padding: '28px 20px', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.07)', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✦</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 300, marginBottom: 10 }}>Be the first to share something.</p>
          <button onClick={onPost} style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.04em' }}>
            + CREATE A POST
          </button>
        </div>
      ) : (
        <div>
          {posts.map((post, idx) => {
            const meta = TYPE_META[post.type] ?? { emoji: '✦', color: '#D4AF37' }
            const localReacts = myReactions[post.id] ?? {}
            const hasMedia = !!post.media_url
            return (
              <div key={post.id}>
                {/* Post header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 12px' }}>
                  <Link href={`/profile/${post.user_id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#D4AF37,#a78bfa)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: avatarGrad(post.user_id), border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#FFF' }}>
                        {initials(post.author_name)}
                      </div>
                    </div>
                  </Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em' }}>{post.author_name ?? 'Member'}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: meta.color + '15', border: `1px solid ${meta.color}30`, color: meta.color, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'capitalize' }}>
                        {meta.emoji} {post.type}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{timeAgo(post.created_at)}</span>
                  </div>
                  <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.22)', letterSpacing: 2, lineHeight: 1, paddingBottom: 6 }}>···</span>
                </div>

                {/* Full-bleed media */}
                {post.media_url && post.media_type === 'image' && (
                  <img src={post.media_url} alt="" style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block', maxHeight: 500 }} />
                )}
                {post.media_url && post.media_type === 'video' && (
                  <video src={post.media_url} controls playsInline style={{ width: '100%', display: 'block', background: '#000', maxHeight: 500 }} />
                )}

                {/* Text-only post */}
                {!hasMedia && post.content && (
                  <div style={{ padding: '0 20px 12px' }}>
                    <p style={{ fontSize: 15, color: '#C8C8C8', fontWeight: 400, lineHeight: 1.65 }}>{post.content}</p>
                  </div>
                )}

                {/* Reactions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px 6px' }}>
                  {([['fire','🔥','#FF9500'], ['strong','💪','#a78bfa'], ['relate','🤝','#4ade80']] as const).map(([type, emoji, color]) => {
                    const active = localReacts[type] ?? post.my_reactions[type]
                    const count = post.reactions[type] + (localReacts[type] !== undefined && localReacts[type] !== post.my_reactions[type] ? (localReacts[type] ? 1 : -1) : 0)
                    return (
                      <button key={type} onClick={() => handleReact(post.id, type)} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '8px 14px', borderRadius: 999,
                        cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'Satoshi,sans-serif',
                        background: active ? `${color}15` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${active ? color + '40' : 'rgba(255,255,255,0.06)'}`,
                        color: active ? color : 'rgba(255,255,255,0.45)',
                      }}>
                        <span style={{ fontSize: 17, lineHeight: 1 }}>{emoji}</span>
                        {count > 0 && <span style={{ fontSize: 12, fontWeight: 800, color: active ? color : 'rgba(255,255,255,0.45)' }}>{count}</span>}
                      </button>
                    )
                  })}
                </div>

                {/* Caption (media posts only) */}
                {hasMedia && post.content && (
                  <p style={{ fontSize: 13, lineHeight: 1.6, padding: '2px 20px 10px', color: 'rgba(255,255,255,0.58)' }}>
                    <span style={{ fontWeight: 800, color: '#EFEFEF', marginRight: 6 }}>{post.author_name}</span>
                    {post.content}
                  </p>
                )}

                {/* Divider */}
                {idx < posts.length - 1 && (
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '10px 0 4px' }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 6. ENERGY CHECK-IN
// ══════════════════════════════════════════════════════
function CheckinWidget({ todayCheckin, checkinHistory }: {
  todayCheckin: Props['todayCheckin']; checkinHistory: CheckinDay[]
}) {
  const today = new Date().toISOString().split('T')[0]
  const days = useMemo(() => {
    const base = new Date(today).getTime()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base - (6 - i) * 86400000)
      const key = d.toISOString().split('T')[0]
      const found = checkinHistory.find(c => c.date === key)
      return { key, energy: found?.energy ?? null, isToday: key === today }
    })
  }, [checkinHistory, today])

  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<{ energy: number } | null>(todayCheckin ? { energy: todayCheckin.energy } : null)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [, startTransition] = useTransition()

  async function handleSubmit() {
    if (!selectedEnergy) return
    setSubmitting(true)
    const result = await submitCheckin(selectedEnergy, note)
    if (result?.error === 'TABLE_NOT_EXISTS') setSetupNeeded(true)
    else if (!result?.error) startTransition(() => setSubmitted({ energy: selectedEnergy }))
    setSubmitting(false)
  }

  const doneEnergy = submitted?.energy ?? null

  return (
    <div style={{ padding: '0 20px', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)' }}>ENERGY CHECK-IN</p>
        {/* 7-day sparkline */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
          {days.map((d, i) => {
            const c = d.energy !== null ? ENERGY_COLOR(d.energy) : 'rgba(255,255,255,0.07)'
            const h = d.energy !== null ? 8 + d.energy * 1.6 : 8
            return (
              <div key={i} style={{ width: 8, height: h, borderRadius: 3, background: d.isToday && doneEnergy !== null ? ENERGY_COLOR(doneEnergy) : c, outline: d.isToday ? `1.5px solid ${doneEnergy !== null ? ENERGY_COLOR(doneEnergy) : 'rgba(255,255,255,0.2)'}` : 'none', outlineOffset: 1, transition: 'all 0.3s' }} />
            )
          })}
        </div>
      </div>

      {setupNeeded ? (
        <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)' }}>
          <p style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>Run <code>supabase/daily_checkins.sql</code> in Supabase to activate check-ins.</p>
        </div>
      ) : doneEnergy !== null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, background: `${ENERGY_COLOR(doneEnergy)}0d`, border: `1px solid ${ENERGY_COLOR(doneEnergy)}28` }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${ENERGY_COLOR(doneEnergy)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: ENERGY_COLOR(doneEnergy), fontFamily: 'Satoshi,sans-serif' }}>{doneEnergy}</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', marginBottom: 2 }}>{ENERGY_LABEL(doneEnergy)} today</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', fontWeight: 700, letterSpacing: '0.06em' }}>ENERGY LOGGED ✓</p>
          </div>
        </div>
      ) : (
        <div style={{ padding: '18px', borderRadius: 18, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.58)', marginBottom: 14 }}>How are you feeling today?</p>
          <div style={{ display: 'flex', gap: 4, marginBottom: selectedEnergy ? 14 : 0 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
              const active = selectedEnergy === n
              const c = ENERGY_COLOR(n)
              return (
                <button key={n} onClick={() => setSelectedEnergy(n)} style={{
                  flex: 1, height: 36, borderRadius: 8,
                  border: active ? `1.5px solid ${c}` : '1.5px solid rgba(255,255,255,0.07)',
                  background: active ? `${c}1e` : 'rgba(255,255,255,0.03)',
                  color: active ? c : '#444',
                  fontSize: 11, fontWeight: active ? 900 : 600, cursor: 'pointer',
                  transition: 'all 0.1s', fontFamily: 'Satoshi,sans-serif',
                  transform: active ? 'translateY(-2px)' : 'none',
                  boxShadow: active ? `0 4px 12px ${c}44` : 'none',
                }}>{n}</button>
              )
            })}
          </div>
          {selectedEnergy && (
            <>
              <p style={{ fontSize: 12, color: ENERGY_COLOR(selectedEnergy), fontWeight: 700, marginBottom: 10 }}>
                {ENERGY_LABEL(selectedEnergy)} · {selectedEnergy}/10
              </p>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note... (optional)" rows={2}
                style={{ width: '100%', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#EFEFEF', fontSize: 13, padding: '10px 12px', resize: 'none', outline: 'none', fontFamily: 'Satoshi,sans-serif', marginBottom: 10, boxSizing: 'border-box' }}
              />
              <button onClick={handleSubmit} disabled={submitting} style={{
                width: '100%', padding: '12px', borderRadius: 12,
                background: 'linear-gradient(135deg,#D4AF37,#9A7010)',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, color: '#000',
                fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.06em', opacity: submitting ? 0.6 : 1,
              }}>
                {submitting ? 'LOGGING...' : 'LOG CHECK-IN'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// 7. REFLECTION — urgent banner + quiet bottom nudge
// ══════════════════════════════════════════════════════
function daysUntilAssessment(assessmentDay: string) {
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const todayIdx = new Date().getDay()
  const targetIdx = dayNames.indexOf(assessmentDay)
  let d = targetIdx - todayIdx
  if (d < 0) d += 7
  return d
}

function ReflectionUrgentBanner({ streak, assessmentDay }: { streak: number; assessmentDay: string }) {
  const daysUntil = daysUntilAssessment(assessmentDay)
  const isDueToday = daysUntil === 0

  return (
    <div style={{ padding: '0 20px', marginBottom: 28 }}>
      <Link href="/assess" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          borderRadius: 20, padding: '18px 20px',
          background: isDueToday
            ? 'linear-gradient(135deg,rgba(212,175,55,0.1),rgba(212,175,55,0.04))'
            : 'linear-gradient(135deg,rgba(167,139,250,0.08),rgba(167,139,250,0.03))',
          border: isDueToday ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(167,139,250,0.3)',
          boxShadow: isDueToday
            ? '0 0 0 0 rgba(212,175,55,0.2), 0 4px 24px rgba(212,175,55,0.06)'
            : '0 4px 20px rgba(167,139,250,0.05)',
          animation: isDueToday ? 'reflectionUrgentPulse 2.8s ease-in-out infinite' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Icon */}
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: isDueToday ? 'rgba(212,175,55,0.14)' : 'rgba(167,139,250,0.1)',
              border: isDueToday ? '1px solid rgba(212,175,55,0.35)' : '1px solid rgba(167,139,250,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>
              {isDueToday ? '⚡' : '📋'}
            </div>

            {/* Text */}
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.16em',
                color: isDueToday ? '#D4AF37' : '#a78bfa',
                marginBottom: 4, textTransform: 'uppercase',
              }}>
                {isDueToday ? 'Due Today' : 'Due Tomorrow'}
              </p>
              <p style={{ fontSize: 17, fontWeight: 900, color: '#EFEFEF', lineHeight: 1.2, marginBottom: 5, letterSpacing: '-0.01em' }}>
                Weekly reflection
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', lineHeight: 1.55, marginBottom: streak > 0 ? 10 : 0 }}>
                {isDueToday
                  ? "5 questions · ~10 min. Don't let this week go unexamined."
                  : 'Block 10 min tonight — your reflection is due tomorrow.'}
              </p>
              {streak > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13 }}>🔥</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37' }}>{streak}-week streak on the line</span>
                </div>
              )}
            </div>

            {/* Arrow CTA */}
            <div style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: 12,
              background: isDueToday ? 'rgba(212,175,55,0.12)' : 'rgba(167,139,250,0.08)',
              border: isDueToday ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(167,139,250,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={isDueToday ? '#D4AF37' : '#a78bfa'}
                strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

function ReflectionNudge({ done, streak, assessmentDay }: { done: boolean; streak: number; assessmentDay: string }) {
  const daysUntil = daysUntilAssessment(assessmentDay)
  const isDueToday = daysUntil === 0
  const isDueSoon  = daysUntil <= 2

  if (done) {
    return (
      <Link href="/assess" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}>
        <span style={{ fontSize: 18 }}>✓</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>Reflection done this week</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', marginTop: 1 }}>🔥 {streak}-week streak · Keep it going</p>
        </div>
      </Link>
    )
  }
  return (
    <Link href="/assess" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: isDueToday ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)', border: isDueToday ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: 18 }}>📋</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: isDueToday ? '#D4AF37' : '#888' }}>
          {isDueToday ? 'Reflection due today' : isDueSoon ? `Reflection in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}` : `Next reflection: ${assessmentDay}`}
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', marginTop: 1 }}>5 questions · ~10 min</p>
      </div>
      <span style={{ fontSize: 13, color: isDueToday ? '#D4AF37' : '#444' }}>→</span>
    </Link>
  )
}

// ══════════════════════════════════════════════════════
// AI DAILY BRIEFING
// ══════════════════════════════════════════════════════
function AiBriefing({ firstName, topGoalTitle, energy, streak }: {
  firstName: string; topGoalTitle: string | null; energy: number | null; streak: number
}) {
  const [text, setText]       = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cacheKey = `briefing:${new Date().toISOString().split('T')[0]}`
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) { setText(cached); setLoading(false); return }
    } catch { /* */ }

    // Read today's workout from the week plan in localStorage
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
      body: JSON.stringify({ firstName, topGoal: topGoalTitle, energy, streak, workout }),
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
    <div style={{ margin: '0 20px 24px', padding: '18px 20px', borderRadius: 20, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.16)', animation: 'slideUp 0.45s 0.1s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 14, color: '#D4AF37', flexShrink: 0, marginTop: 2 }}>✦</span>
        <div style={{ flex: 1 }}>
          {loading ? (
            <>
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(212,175,55,0.1)', marginBottom: 8, width: '80%', animation: 'shimmer 1.6s ease infinite' }} />
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(212,175,55,0.07)', width: '60%', animation: 'shimmer 1.6s 0.3s ease infinite' }} />
            </>
          ) : (
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#EFEFEF', fontWeight: 400, margin: 0 }}>{text}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TODAY'S WORKOUT CARD
// ══════════════════════════════════════════════════════
const WORKOUT_PALETTE: Record<string, { from: string; to: string; border: string; glow: string; text: string; icon: string }> = {
  'Push Day':        { from:'#ef4444', to:'#f97316', border:'rgba(239,68,68,0.28)',   glow:'rgba(239,68,68,0.18)',   text:'#f87171', icon:'💪' },
  'Pull Day':        { from:'#6366f1', to:'#8b5cf6', border:'rgba(99,102,241,0.28)',  glow:'rgba(99,102,241,0.18)',  text:'#a78bfa', icon:'🏋️' },
  'Leg Day':         { from:'#f97316', to:'#eab308', border:'rgba(249,115,22,0.28)',  glow:'rgba(249,115,22,0.18)',  text:'#fb923c', icon:'🦵' },
  'Upper Body':      { from:'#ef4444', to:'#ec4899', border:'rgba(239,68,68,0.24)',   glow:'rgba(239,68,68,0.14)',   text:'#f472b6', icon:'⬆️' },
  'Lower Body':      { from:'#f97316', to:'#ef4444', border:'rgba(249,115,22,0.28)',  glow:'rgba(249,115,22,0.18)',  text:'#fb923c', icon:'⬇️' },
  'Full Body':       { from:'#eab308', to:'#22c55e', border:'rgba(234,179,8,0.28)',   glow:'rgba(234,179,8,0.18)',   text:'#facc15', icon:'⚡' },
  'Cardio':          { from:'#22c55e', to:'#06b6d4', border:'rgba(34,197,94,0.28)',   glow:'rgba(34,197,94,0.18)',   text:'#4ade80', icon:'🏃' },
  'Core':            { from:'#eab308', to:'#f97316', border:'rgba(234,179,8,0.28)',   glow:'rgba(234,179,8,0.18)',   text:'#facc15', icon:'🎯' },
  'Glutes & Booty':  { from:'#f97316', to:'#ec4899', border:'rgba(249,115,22,0.28)',  glow:'rgba(249,115,22,0.18)',  text:'#fb923c', icon:'🍑' },
  'Arms':            { from:'#ef4444', to:'#8b5cf6', border:'rgba(239,68,68,0.24)',   glow:'rgba(239,68,68,0.14)',   text:'#f87171', icon:'💪' },
  'Shoulders':       { from:'#8b5cf6', to:'#06b6d4', border:'rgba(139,92,246,0.28)', glow:'rgba(139,92,246,0.18)', text:'#c084fc', icon:'🤸' },
  'Active Recovery': { from:'#22c55e', to:'#06b6d4', border:'rgba(34,197,94,0.2)',   glow:'rgba(34,197,94,0.1)',   text:'#4ade80', icon:'🧘' },
}

function WorkoutTodayCard() {
  const [plan, setPlan] = useState<{ name: string; types: string[]; exCount: number; setCount: number } | null>(null)

  useEffect(() => {
    try {
      const wp = localStorage.getItem('weekPlan')
      if (!wp) return
      const weekPlan = JSON.parse(wp)
      const todayIdx = (new Date().getDay() + 6) % 7
      const td = weekPlan[todayIdx]
      if (td && !td.restDay && td.exercises?.length > 0) {
        setPlan({
          name:     td.name || (td.types as string[]).join(' + ') || 'Workout',
          types:    td.types ?? [],
          exCount:  td.exercises.length,
          setCount: (td.exercises as { setCount: number }[]).reduce((t, e) => t + e.setCount, 0),
        })
      }
    } catch { /* */ }
  }, [])

  if (!plan) return null
  const ts = WORKOUT_PALETTE[plan.types[0]] ?? { from:'#ef4444', to:'#f97316', border:'rgba(239,68,68,0.28)', glow:'rgba(239,68,68,0.18)', text:'#ef4444', icon:'💪' }

  return (
    <div style={{ padding: '0 20px', marginBottom: 24, animation: 'slideUp 0.45s 0.15s ease both' }}>
      <Link href="/tools/workout" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          borderRadius: 20, padding: '16px 18px',
          background: `linear-gradient(135deg, ${ts.from}14, ${ts.to}07)`,
          border: `1px solid ${ts.border}`,
          boxShadow: `0 6px 28px ${ts.glow}`,
          display: 'flex', alignItems: 'center', gap: 14,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, ${ts.from}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ width: 46, height: 46, borderRadius: 14, background: `linear-gradient(135deg, ${ts.from}26, ${ts.to}16)`, border: `1px solid ${ts.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{ts.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.13em', color: ts.text, marginBottom: 3 }}>TODAY&apos;S WORKOUT</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.01em', marginBottom: 3 }}>{plan.name}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{plan.exCount} exercises · {plan.setCount} sets</p>
          </div>
          <div style={{ flexShrink: 0, padding: '9px 14px', borderRadius: 12, background: `linear-gradient(135deg, ${ts.from}, ${ts.to})`, fontSize: 12, fontWeight: 900, color: '#fff', boxShadow: `0 4px 16px ${ts.glow}`, letterSpacing: '0.02em' }}>
            ▶ Go
          </div>
        </div>
      </Link>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════
export function HomeClient({
  todayLabel, firstName, streak, goals, focusPool, isNewUser,
  todayCheckin, checkinHistory, recentPosts,
  reflectionDone, assessmentDay, inCircle, userId, isCreator,
}: Props) {
  const greeting = getGreeting()
  const [postOpen, setPostOpen] = useState(false)

  const reflectionDaysUntil = daysUntilAssessment(assessmentDay)
  const showReflectionBanner = !reflectionDone && reflectionDaysUntil <= 1

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 40 }} className="view-panel">

      <style>{`
        @keyframes focusGroupIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        @keyframes mileIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes dotPop {
          0%   { transform: scale(1);    }
          40%  { transform: scale(1.55); }
          70%  { transform: scale(0.88); }
          100% { transform: scale(1);    }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to   { transform: translateY(0);    }
        }
        @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:1} }
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>

      {/* ── PAGE TABS ── */}
      <div style={{ display: 'flex', padding: '0 20px 20px', gap: 8 }}>
        <div style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#4ade80', letterSpacing: '0.04em', fontFamily: 'Satoshi,sans-serif' }}>
          HOME
        </div>
        <Link href="/circle" style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em', textDecoration: 'none', display: 'block', fontFamily: 'Satoshi,sans-serif' }}>
          CIRCLE
        </Link>
        {isCreator && (
          <Link href="/creator" style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.18)', textAlign: 'center', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.50)', letterSpacing: '0.04em', textDecoration: 'none', display: 'block', fontFamily: 'Satoshi,sans-serif' }}>
            CREATOR
          </Link>
        )}
      </div>

      {/* ── HERO + MOMENTUM RING ── */}
      <HeroSection
        firstName={firstName} greeting={greeting} streak={streak}
        todayLabel={todayLabel} goals={goals} focusPool={focusPool} isNewUser={isNewUser}
      />

      {/* ── AI DAILY BRIEFING ── */}
      {!isNewUser && (
        <AiBriefing
          firstName={firstName}
          topGoalTitle={goals[0]?.title ?? null}
          energy={todayCheckin?.energy ?? null}
          streak={streak}
        />
      )}

      {/* ── TODAY'S WORKOUT ── */}
      <WorkoutTodayCard />

      {/* ── REFLECTION URGENT BANNER — surfaces when due today or tomorrow ── */}
      {showReflectionBanner && <ReflectionUrgentBanner streak={streak} assessmentDay={assessmentDay} />}

      {/* ── NEW USER ONBOARDING ── */}
      {isNewUser && (
        <div style={{ margin: '0 20px 28px', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(135deg,rgba(212,175,55,0.1) 0%,rgba(212,175,55,0.04) 100%)', border: '1px solid rgba(212,175,55,0.25)', animation: 'slideUp 0.5s ease both' }}>
          <div style={{ padding: '22px 20px 18px' }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 8 }}>YOUR FIRST STEP</p>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 6 }}>What&apos;s the one thing you want to make real?</h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', fontWeight: 300, lineHeight: 1.6, marginBottom: 18 }}>Set your first goal. Your streak starts today.</p>
            <Link href="/goals" className="btn-gold" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '13px', fontSize: 11, letterSpacing: '0.06em' }}>ADD YOUR FIRST GOAL →</Link>
          </div>
        </div>
      )}

      {/* ── PRIORITY GOAL ── */}
      {!isNewUser && focusPool.length > 0 && <PriorityGoalCard pool={focusPool} />}

      {/* ── GOAL STRIP ── */}
      <GoalStrip goals={goals} />

      {/* ── QUICK ACTIONS ── */}
      <QuickActions inCircle={inCircle} reflectionDone={reflectionDone} />

      {/* ── ENERGY CHECK-IN ── */}
      <CheckinWidget todayCheckin={todayCheckin} checkinHistory={checkinHistory} />

      {/* ── TODAY'S FOCUS ── */}
      {goals.length > 0 && focusPool.length > 0 && <TodaysFocus pool={focusPool} />}

      {/* ── CIRCLE PULSE ── */}
      <CirclePulse posts={recentPosts} inCircle={inCircle} onPost={() => setPostOpen(true)} />

      {/* ── PLAYBOOK ── */}
      <div style={{ padding: '0 20px', marginBottom: 28 }}>
        <Link href="/playbook" style={{ display: 'block', textDecoration: 'none' }}>
          <div style={{ borderRadius: 20, padding: '16px 18px', background: 'linear-gradient(135deg,rgba(212,175,55,0.08),rgba(167,139,250,0.06))', border: '1px solid rgba(212,175,55,0.18)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#D4AF37,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>📚</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#D4AF37', marginBottom: 2 }}>PLAYBOOK</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#EFEFEF', marginBottom: 2 }}>Learn the process</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>12 lessons on goal-setting & accountability</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </Link>
      </div>

      {/* ── REFLECTION NUDGE — hidden when urgent banner is already at top ── */}
      {!showReflectionBanner && (
        <div style={{ padding: '0 20px 8px' }}>
          <ReflectionNudge done={reflectionDone} streak={streak} assessmentDay={assessmentDay} />
        </div>
      )}

      {/* ── POST MODAL ── */}
      {postOpen && <CreatePostModal onClose={() => setPostOpen(false)} userId={userId} />}

    </div>
  )
}
