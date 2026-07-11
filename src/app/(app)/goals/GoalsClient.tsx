'use client'
import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { createGoal, updateGoalProgress, completeGoal, restartGoal, deleteGoal, toggleMilestone, saveMilestones, addBook, setBookReading, markBookDone, removeBook, unmarkBookDone, updateGoalVisibility, updateGoalNotes, updateGoalDeadline, addGoalEntry, removeGoalEntry, updateGoalEntry, updateGoalMeta } from './actions'
import type { GoalEntry } from '@/lib/types/database'
import { generateMilestones } from './aiActions'
import { CATEGORIES, categoryLabel } from '@/lib/categories'
import { getLevelInfo, LEVELS } from '@/lib/xp'
import type { Goal, GoalMilestone, GoalBook } from '@/lib/types/database'

type CeremonyData = {
  goalTitle: string
  xpGained: number
  newXP: number
  newLevel: number
  leveledUp: boolean
  earnedAchievements: { type: string; emoji: string; title: string; desc: string; color: string }[]
}

function CeremonyModal({ data, onClose }: { data: CeremonyData; onClose: () => void }) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const levelInfo = getLevelInfo(data.newXP)
  const prevLevelInfo = data.leveledUp ? LEVELS.find(l => l.level === data.newLevel - 1) : null

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    const burst = () => {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 }, colors: ['#D4AF37', '#FFD700', '#fff', '#a78bfa', '#4ade80'] })
      setTimeout(() => confetti({ particleCount: 60, spread: 130, origin: { y: 0.45 }, colors: ['#D4AF37', '#f97316', '#fff'] }), 350)
      setTimeout(() => confetti({ particleCount: 40, spread: 70, origin: { y: 0.6, x: 0.2 }, colors: ['#4ade80', '#fff'] }), 600)
      setTimeout(() => confetti({ particleCount: 40, spread: 70, origin: { y: 0.6, x: 0.8 }, colors: ['#a78bfa', '#fff'] }), 700)
    }
    burst()
    return () => clearTimeout(t)
  }, [])

  function handleShare() {
    onClose()
    router.push('/circle')
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, #1a1a2e 0%, #0f0f1a 100%)',
          border: '1px solid rgba(212,175,55,0.3)',
          borderRadius: 24,
          padding: '36px 28px 28px',
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 0 60px rgba(212,175,55,0.15), 0 24px 80px rgba(0,0,0,0.6)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.96)',
          transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          textAlign: 'center',
        }}
      >
        {/* Trophy */}
        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 12, filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.6))' }}>🏆</div>

        {/* Label */}
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#D4AF37', marginBottom: 8, textTransform: 'uppercase' }}>Goal Achieved</p>

        {/* Goal title */}
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 24px', lineHeight: 1.3 }}>
          {data.goalTitle}
        </h2>

        {/* XP earned */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)',
          borderRadius: 40, padding: '8px 20px', marginBottom: 16,
        }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#4ade80' }}>+{data.xpGained} XP</span>
        </div>

        {/* Level up banner */}
        {data.leveledUp && prevLevelInfo && (
          <div style={{
            background: `linear-gradient(135deg, ${levelInfo.color}22, ${levelInfo.color}11)`,
            border: `1px solid ${levelInfo.color}55`,
            borderRadius: 16, padding: '14px 20px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: levelInfo.color, textTransform: 'uppercase', marginBottom: 4 }}>Level Up!</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                <span style={{ color: 'rgba(255,255,255,0.50)' }}>{prevLevelInfo.title}</span>
                {' → '}
                <span style={{ color: levelInfo.color }}>{levelInfo.title}</span>
              </p>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: `${levelInfo.color}22`,
              border: `2px solid ${levelInfo.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 900, color: levelInfo.color,
              flexShrink: 0,
            }}>
              {data.newLevel}
            </div>
          </div>
        )}

        {/* Achievements earned */}
        {data.earnedAchievements.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase', marginBottom: 10 }}>Unlocked</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.earnedAchievements.map(a => (
                <div key={a.type} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: `${a.color}18`, border: `1px solid ${a.color}44`,
                  borderRadius: 12, padding: '10px 14px', textAlign: 'left',
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{a.emoji}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{a.title}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.58)' }}>{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* XP progress bar to next level */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{data.newXP} XP total</span>
            {levelInfo.xpToNext > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{levelInfo.xpToNext} XP to {LEVELS.find(l => l.level === data.newLevel + 1)?.title ?? 'next'}</span>}
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: levelInfo.color,
              width: `${levelInfo.progressToNext}%`,
              transition: 'width 1s ease 0.5s',
            }} />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1, padding: '13px', borderRadius: 14,
              background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)',
              color: '#D4AF37', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              fontFamily: 'Satoshi,sans-serif',
            }}
          >
            Share Win 🎉
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '13px', borderRadius: 14,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.58)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              fontFamily: 'Satoshi,sans-serif',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

const CAT: Record<string, { accent: string; bg: string; border: string; text: string }> = {
  health:        { accent: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   text: '#4ade80' },  // emerald
  career:        { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)',  text: '#a78bfa' },  // violet
  business:      { accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  text: '#60a5fa' },  // blue
  finance:       { accent: '#D4AF37', bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.22)', text: '#D4AF37' },  // gold
  learning:      { accent: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.2)',  text: '#7dd3fc' },  // sky
  creative:      { accent: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  text: '#fb923c' },  // orange
  relationships: { accent: '#f43f5e', bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)',   text: '#fb7185' },  // rose
  personal:      { accent: '#14b8a6', bg: 'rgba(20,184,166,0.08)',  border: 'rgba(20,184,166,0.2)',  text: '#2dd4bf' },  // teal
  adventure:     { accent: '#84cc16', bg: 'rgba(132,204,22,0.08)',  border: 'rgba(132,204,22,0.2)',  text: '#a3e635' },  // lime
  material:      { accent: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   text: '#f87171' },  // red
  spiritual:     { accent: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)', text: '#d8b4fe' },  // purple
}
const fallback = { accent: '#D4AF37', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.22)', text: '#D4AF37' }
function cc(cat: string | null) { return CAT[cat ?? ''] ?? fallback }

const VIS_LABEL: Record<string, string> = { circle: '👥 Circle', private: '🔒 Private', public: '🌍 Public' }
const VIS_DESC:  Record<string, string> = {
  private: 'Only you can see this goal.',
  circle:  'Your Circle members can see this.',
  public:  'Anyone on the platform can see this.',
}
const SPINE_COLORS = ['#d97706','#7c3aed','#0f766e','#b91c1c','#1d4ed8','#be185d','#92400e','#065f46','#c2410c','#4338ca','#0e7490','#6d28d9']

type GoalType = 'standard' | 'reading' | 'letter' | 'habit' | 'savings' | 'travel'
type CalGoal = { id: string; title: string; category: string | null; deadline: string }

function GoalCalendar({ goals }: { goals: CalGoal[] }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const goalsByDate: Record<string, CalGoal[]> = {}
  for (const g of goals) {
    goalsByDate[g.deadline] = [...(goalsByDate[g.deadline] ?? []), g]
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()
  const todayStr = today.toISOString().split('T')[0]

  const cells = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstDay + 1
    let date: Date
    if (dayNum < 1) date = new Date(viewYear, viewMonth - 1, prevMonthDays + dayNum)
    else if (dayNum > daysInMonth) date = new Date(viewYear, viewMonth + 1, dayNum - daysInMonth)
    else date = new Date(viewYear, viewMonth, dayNum)
    const dateKey = date.toISOString().split('T')[0]
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / 86400000)
    return {
      dateKey, dayNum: date.getDate(),
      inCurrentMonth: dayNum >= 1 && dayNum <= daysInMonth,
      isToday: dateKey === todayStr,
      isPast: dateKey < todayStr,
      isUrgent: daysUntil >= 0 && daysUntil <= 3,
      goals: goalsByDate[dateKey] ?? [],
    }
  })

  function prevMonth() {
    setSelectedDate(null)
    viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1)
  }
  function nextMonth() {
    setSelectedDate(null)
    viewMonth === 11 ? (setViewMonth(0), setViewYear(y => y + 1)) : setViewMonth(m => m + 1)
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const upcoming = goals.filter(g => g.deadline >= todayStr).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 8)
  const monthGoals = goals.filter(g => g.deadline.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`))
  const selectedGoals = selectedDate ? (goalsByDate[selectedDate] ?? []) : []
  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <div>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontSize: 18, color: 'rgba(255,255,255,0.50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1 }}>{monthLabel}</p>
          {monthGoals.length > 0 && (
            <p style={{ fontSize: 10, color: '#D4AF37', fontWeight: 600, marginTop: 3 }}>
              {monthGoals.length} deadline{monthGoals.length !== 1 ? 's' : ''} this month
            </p>
          )}
        </div>
        <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontSize: 18, color: 'rgba(255,255,255,0.50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>›</button>
        <button onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); setSelectedDate(null) }} style={{ padding: '7px 12px', borderRadius: 10, fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', background: 'rgba(212,175,55,0.07)', flexShrink: 0, letterSpacing: '0.04em' }}>TODAY</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', padding: '6px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 16 }}>
        {cells.map((cell, i) => {
          const isSelected = selectedDate === cell.dateKey
          const hasGoals = cell.goals.length > 0
          const primaryColor = hasGoals ? cc(cell.goals[0].category).accent : '#D4AF37'
          const isUrgentCell = cell.inCurrentMonth && cell.isUrgent && hasGoals
          return (
            <div
              key={i}
              onClick={() => { if (cell.goals.length) setSelectedDate(prev => prev === cell.dateKey ? null : cell.dateKey) }}
              style={{
                borderRadius: 10, padding: '8px 4px 6px', minHeight: 56,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                cursor: hasGoals ? 'pointer' : 'default', transition: 'all 0.15s', position: 'relative',
                background: isSelected ? `${primaryColor}18` : isUrgentCell ? 'rgba(248,113,113,0.05)' : cell.isToday ? 'rgba(212,175,55,0.07)' : 'transparent',
                border: isSelected ? `1px solid ${primaryColor}40` : cell.isToday ? '1px solid rgba(212,175,55,0.25)' : '1px solid transparent',
                boxShadow: isSelected ? `0 0 16px ${primaryColor}20` : 'none',
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: cell.isToday ? 900 : cell.inCurrentMonth ? 600 : 400,
                background: cell.isToday ? '#D4AF37' : 'transparent',
                color: cell.isToday ? '#000' : cell.inCurrentMonth ? (cell.isPast ? 'rgba(255,255,255,0.35)' : '#EFEFEF') : 'rgba(255,255,255,0.18)',
                boxShadow: cell.isToday ? '0 0 12px rgba(212,175,55,0.5)' : 'none', flexShrink: 0,
              }}>
                {cell.dayNum}
              </div>
              {cell.goals.length > 0 && cell.inCurrentMonth && (
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {cell.goals.slice(0, 3).map((g, gi) => (
                    <div key={gi} style={{ width: 6, height: 6, borderRadius: '50%', background: cc(g.category).accent, boxShadow: isUrgentCell ? `0 0 6px ${cc(g.category).accent}` : 'none', flexShrink: 0 }} />
                  ))}
                  {cell.goals.length > 3 && <div style={{ fontSize: 7, fontWeight: 800, color: 'rgba(255,255,255,0.42)', lineHeight: 1, marginTop: 1 }}>+{cell.goals.length - 3}</div>}
                </div>
              )}
              {isUrgentCell && !isSelected && (
                <div style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: '#f87171', boxShadow: '0 0 6px rgba(248,113,113,0.8)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day panel */}
      {selectedDate && selectedGoals.length > 0 && (
        <div style={{ marginBottom: 20, borderRadius: 18, border: '1px solid rgba(212,175,55,0.18)', background: 'rgba(212,175,55,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#D4AF37', marginBottom: 2 }}>DEADLINE</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF' }}>{selectedDateLabel}</p>
            </div>
            <button onClick={() => setSelectedDate(null)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.42)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Satoshi,sans-serif' }}>×</button>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedGoals.map(g => {
              const color = cc(g.category).accent
              const daysLeft = Math.ceil((new Date(g.deadline + 'T12:00:00').getTime() - today.getTime()) / 86400000)
              return (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: `${color}0a`, border: `1px solid ${color}22` }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.3 }}>{g.title}</p>
                    <p style={{ fontSize: 10, color, fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>{g.category ?? 'Goal'}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, color: daysLeft <= 1 ? '#f87171' : daysLeft <= 3 ? '#fbbf24' : color }}>{daysLeft}</p>
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.06em' }}>DAYS</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming deadlines */}
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>UPCOMING DEADLINES</p>
      {upcoming.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>📅</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No upcoming deadlines</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>Set deadlines on your goals and they&apos;ll appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcoming.map(g => {
            const daysLeft = Math.ceil((new Date(g.deadline + 'T12:00:00').getTime() - today.getTime()) / 86400000)
            const color = cc(g.category).accent
            const urgency = daysLeft <= 1 ? '#f87171' : daysLeft <= 3 ? '#fbbf24' : color
            return (
              <div
                key={g.id}
                onClick={() => setSelectedDate(g.deadline)}
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, borderRadius: 14, border: `1px solid ${urgency}18`, background: `${urgency}06`, cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${urgency}14`, border: `1px solid ${urgency}25`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <p style={{ fontSize: daysLeft > 99 ? 12 : 18, fontWeight: 900, lineHeight: 1, color: urgency }}>{daysLeft}</p>
                  <p style={{ fontSize: 7, color: urgency, fontWeight: 700, letterSpacing: '0.06em', opacity: 0.7 }}>DAYS</p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.42)', textTransform: 'capitalize' }}>{g.category ?? 'Goal'}</p>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>·</span>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{new Date(g.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
                {daysLeft <= 3 && <div style={{ width: 8, height: 8, borderRadius: '50%', background: urgency, boxShadow: `0 0 8px ${urgency}`, flexShrink: 0 }} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Modal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

// ── Goal Templates ─────────────────────────────────────────────────────────
type GoalTemplateItem = {
  id: string; emoji: string; title: string; category: string
  goalType: 'standard' | 'habit' | 'savings'
  milestones: string[]; deadlineWeeks: number
}
const GOAL_TEMPLATES: GoalTemplateItem[] = [
  { id: 'h1', emoji: '🏃', title: 'Run a 5K', category: 'health', goalType: 'standard', deadlineWeeks: 10,
    milestones: ['Register for a race', 'Run 1 mile without stopping', 'Complete a 3-mile run', 'Full practice 5K run', 'Race day'] },
  { id: 'h2', emoji: '💪', title: 'Build a workout habit', category: 'health', goalType: 'habit', deadlineWeeks: 13, milestones: [] },
  { id: 'h3', emoji: '🥗', title: 'Clean up my diet', category: 'health', goalType: 'habit', deadlineWeeks: 8, milestones: [] },
  { id: 'c1', emoji: '💼', title: 'Land a new job', category: 'career', goalType: 'standard', deadlineWeeks: 12,
    milestones: ['Update resume and LinkedIn', 'Apply to 20 positions', 'Land 3 interviews', 'Receive an offer', 'Start new role'] },
  { id: 'c2', emoji: '🚀', title: 'Launch a side project', category: 'career', goalType: 'standard', deadlineWeeks: 8,
    milestones: ['Define scope and MVP', 'Build v0.1', 'Get feedback from 5 people', 'Ship publicly'] },
  { id: 'c3', emoji: '📈', title: 'Get a promotion', category: 'career', goalType: 'standard', deadlineWeeks: 26,
    milestones: ['Talk to manager about growth path', 'Lead 2 high-impact projects', 'Deliver measurable results', 'Have the promotion conversation'] },
  { id: 'f1', emoji: '💰', title: 'Build a savings fund', category: 'finance', goalType: 'savings', deadlineWeeks: 26, milestones: [] },
  { id: 'f2', emoji: '💳', title: 'Pay off credit card debt', category: 'finance', goalType: 'standard', deadlineWeeks: 26,
    milestones: ['List all debts and minimums', 'Create a payoff plan', 'Pay off first card', '50% of debt cleared', 'Debt-free'] },
  { id: 'f3', emoji: '📊', title: 'Build a monthly budget', category: 'finance', goalType: 'standard', deadlineWeeks: 12,
    milestones: ['Track spending for 2 weeks', 'Set category budgets', 'Complete first month on budget', 'Review and refine'] },
  { id: 'l1', emoji: '💻', title: 'Learn to code', category: 'learning', goalType: 'standard', deadlineWeeks: 16,
    milestones: ['Finish an intro course', 'Build first project', 'Complete 50 coding challenges', 'Ship a real project'] },
  { id: 'l2', emoji: '🗣️', title: 'Learn a new language', category: 'learning', goalType: 'standard', deadlineWeeks: 26,
    milestones: ['Complete a 30-day beginner streak', 'Hold a basic conversation', 'Understand a podcast episode', 'Have a fluent 10-min conversation'] },
  { id: 'cr1', emoji: '✍️', title: 'Write and publish something', category: 'creative', goalType: 'standard', deadlineWeeks: 8,
    milestones: ['Brainstorm and outline', 'Write first draft', 'Edit and revise', 'Publish or submit'] },
  { id: 'cr2', emoji: '🎨', title: 'Build a creative portfolio', category: 'creative', goalType: 'standard', deadlineWeeks: 8,
    milestones: ['Pick 3–5 pieces to feature', 'Create or polish 2 new pieces', 'Set up portfolio site', 'Share it publicly'] },
  { id: 'b1', emoji: '🏢', title: 'Launch a business', category: 'business', goalType: 'standard', deadlineWeeks: 26,
    milestones: ['Validate idea with 10 people', 'Build MVP', 'Get first paying customer', 'Hit $1,000 in revenue', 'Reach $10k MRR'] },
  { id: 'b2', emoji: '🎯', title: 'Get first 10 customers', category: 'business', goalType: 'standard', deadlineWeeks: 12,
    milestones: ['Define ideal customer profile', 'Reach out to 50 prospects', 'Close first sale', '5 customers', '10 customers'] },
  { id: 'm1', emoji: '🧘', title: 'Daily meditation habit', category: 'mindset', goalType: 'habit', deadlineWeeks: 13, milestones: [] },
  { id: 'm2', emoji: '📓', title: 'Daily gratitude journal', category: 'mindset', goalType: 'habit', deadlineWeeks: 5, milestones: [] },
  { id: 'r1', emoji: '❤️', title: 'Deepen relationships', category: 'relationships', goalType: 'standard', deadlineWeeks: 12,
    milestones: ['Schedule weekly connection time', 'Plan 1 group activity per month', 'Quality 1-on-1 time with each person', 'Take a trip together'] },
  { id: 'p1', emoji: '🌅', title: 'Build a morning routine', category: 'personal', goalType: 'habit', deadlineWeeks: 8, milestones: [] },
  { id: 'p2', emoji: '🏠', title: 'Declutter and organize home', category: 'personal', goalType: 'standard', deadlineWeeks: 6,
    milestones: ['Tackle bedroom', 'Clear out kitchen', 'Sort and donate clothes', 'Organize storage'] },
  { id: 'a1', emoji: '🌍', title: 'Plan and take a trip', category: 'adventure', goalType: 'standard', deadlineWeeks: 16,
    milestones: ['Choose destination and budget', 'Book flights and accommodation', 'Plan itinerary', 'Take the trip'] },
  { id: 's1', emoji: '🙏', title: 'Daily spiritual practice', category: 'spiritual', goalType: 'habit', deadlineWeeks: 13, milestones: [] },
]
const TEMPLATE_CAT_ORDER = ['health','career','finance','learning','creative','business','mindset','relationships','personal','adventure','spiritual']

function GoalTemplatePicker({ onSelect, onSkip }: { onSelect: (t: GoalTemplateItem) => void; onSkip: () => void }) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const cats = TEMPLATE_CAT_ORDER.filter(c => GOAL_TEMPLATES.some(t => t.category === c))
  const visible = selectedCat ? GOAL_TEMPLATES.filter(t => t.category === selectedCat) : GOAL_TEMPLATES
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 300, marginBottom: 14, lineHeight: 1.5 }}>
        Start from a proven template or build your own.
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <button type="button" onClick={() => setSelectedCat(null)} style={{ padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: 'Satoshi,sans-serif', cursor: 'pointer', transition: 'all 0.15s', background: !selectedCat ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)', color: !selectedCat ? '#D4AF37' : 'rgba(255,255,255,0.42)', border: !selectedCat ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255,255,255,0.08)' }}>All</button>
        {cats.map(cat => {
          const color = cc(cat).accent
          const active = selectedCat === cat
          return (
            <button key={cat} type="button" onClick={() => setSelectedCat(active ? null : cat)} style={{ padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: 'Satoshi,sans-serif', cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize', background: active ? `${color}18` : 'rgba(255,255,255,0.03)', color: active ? color : 'rgba(255,255,255,0.42)', border: active ? `1px solid ${color}44` : '1px solid rgba(255,255,255,0.08)' }}>{cat}</button>
          )
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map(tpl => {
          const color = cc(tpl.category).accent
          const typeLabel = tpl.goalType === 'habit' ? '🔄 Habit' : tpl.goalType === 'savings' ? '💰 Savings' : `${tpl.milestones.length} milestones`
          return (
            <button key={tpl.id} type="button" onClick={() => onSelect(tpl)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 15px', borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', textAlign: 'left', transition: 'background 0.15s' }}>
              <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{tpl.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#EFEFEF', marginBottom: 3, lineHeight: 1.2 }}>{tpl.title}</p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 5, padding: '1px 6px', textTransform: 'capitalize' }}>{tpl.category}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{typeLabel}</span>
                </div>
              </div>
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>›</span>
            </button>
          )
        })}
      </div>
      <button type="button" onClick={onSkip} style={{ marginTop: 16, width: '100%', padding: '13px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.42)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
        Start from scratch →
      </button>
    </div>
  )
}

export function GoalsClient({ goals, milestones, books: allBooks, entries: allEntries, initialGoalId }: { goals: Goal[]; milestones: GoalMilestone[]; books: GoalBook[]; entries: GoalEntry[]; initialGoalId?: string | null }) {
  const [showCreate, setShowCreate] = useState(false)
  const [createView, setCreateView] = useState<'templates' | 'form'>('templates')
  const [tmplTitle, setTmplTitle] = useState('')
  const [tmplCategory, setTmplCategory] = useState('')
  const [tmplDeadline, setTmplDeadline] = useState('')
  const [tmplKey, setTmplKey] = useState(0)
  const [goalType, setGoalType] = useState<GoalType>('standard')
  const [visibility, setVisibility] = useState<'private' | 'circle' | 'public'>('circle')
  const [milestoneInputs, setMilestoneInputs] = useState<string[]>([''])
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState('')
  const [logGoalId, setLogGoalId] = useState<string | null>(initialGoalId ?? null)
  const [logTab, setLogTab] = useState<'milestones' | 'notes' | 'details'>('milestones')
  const [editingMs, setEditingMs] = useState(false)
  const [draftMs, setDraftMs] = useState<{ id?: string; text: string }[]>([])
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadlineDraft, setDeadlineDraft] = useState('')
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaTitleDraft, setMetaTitleDraft] = useState('')
  const [metaCategoryDraft, setMetaCategoryDraft] = useState('')
  const [addingBook, setAddingBook] = useState(false)
  const [pendingBook, setPendingBook] = useState<BookResult | null>(null)
  const [markDoneBookId, setMarkDoneBookId] = useState<string | null>(null)
  const [markDoneRating, setMarkDoneRating] = useState(0)
  const [markDoneDate, setMarkDoneDate] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [ceremony, setCeremony] = useState<CeremonyData | null>(null)
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  // Entry management (Habit / Savings / Travel)
  const [addingEntry, setAddingEntry] = useState(false)
  const [entryDraft, setEntryDraft] = useState<Record<string, string>>({})
  const [editDestId, setEditDestId] = useState<string | null>(null)
  const [entryError, setEntryError] = useState<string | null>(null)
  const router = useRouter()

  const milestonesByGoal = milestones.reduce<Record<string, GoalMilestone[]>>((acc, m) => {
    ;(acc[m.goal_id] ??= []).push(m)
    return acc
  }, {})

  const booksByGoal = allBooks.reduce<Record<string, GoalBook[]>>((acc, b) => {
    ;(acc[b.goal_id] ??= []).push(b)
    return acc
  }, {})

  const entriesByGoal = allEntries.reduce<Record<string, GoalEntry[]>>((acc, e) => {
    ;(acc[e.goal_id] ??= []).push(e)
    return acc
  }, {})

  const typeOrder = (g: Goal) => g.goal_type === 'reading' ? 0 : g.goal_type === 'letter' ? 2 : 1
  const active   = goals.filter(g => g.status === 'active').sort((a, b) => typeOrder(a) - typeOrder(b))
  const complete = goals.filter(g => g.status === 'complete' && g.goal_type !== 'letter')
  const logGoal  = goals.find(g => g.id === logGoalId) ?? null
  const hasActiveReadingGoal = goals.some(g => g.goal_type === 'reading' && g.status !== 'complete')
  const activeCategories = [...new Set(active.map(g => g.category).filter(Boolean))] as string[]
  const filteredActive = catFilter ? active.filter(g => g.category === catFilter) : active
  const calGoals: CalGoal[] = active.filter(g => g.deadline).map(g => ({ id: g.id, title: g.title, category: g.category, deadline: g.deadline! }))
  const filteredCalGoals: CalGoal[] = catFilter ? calGoals.filter(g => g.category === catFilter) : calGoals

  useEffect(() => {
    const anyOpen = !!logGoalId || showCreate || !!confirmDeleteId
    document.body.style.overflow = anyOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [logGoalId, showCreate, confirmDeleteId])

  function openCreate() {
    setGoalType('standard'); setVisibility('circle'); setError(''); setMilestoneInputs([''])
    setAddingEntry(false); setEntryDraft({}); setEntryError(null)
    setCreateView('templates'); setTmplTitle(''); setTmplCategory(''); setTmplDeadline('')
    setShowCreate(true)
  }
  function openCreateBlank() {
    setGoalType('standard'); setVisibility('circle'); setError(''); setMilestoneInputs([''])
    setAddingEntry(false); setEntryDraft({}); setEntryError(null)
    setCreateView('form'); setTmplTitle(''); setTmplCategory(''); setTmplDeadline('')
    setTmplKey(k => k + 1)
    setShowCreate(true)
  }
  function closeCreate() {
    setShowCreate(false); setError(''); setAddingEntry(false); setEntryDraft({}); setEntryError(null)
    setCreateView('templates'); setTmplTitle(''); setTmplCategory(''); setTmplDeadline('')
  }
  function selectTemplate(tpl: GoalTemplateItem) {
    setGoalType(tpl.goalType)
    setTmplTitle(tpl.title)
    setTmplCategory(tpl.category)
    const d = new Date(); d.setDate(d.getDate() + tpl.deadlineWeeks * 7)
    setTmplDeadline(d.toISOString().split('T')[0])
    setMilestoneInputs(tpl.milestones.length > 0 ? [...tpl.milestones] : [''])
    setTmplKey(k => k + 1)
    setCreateView('form')
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError('')
    startTransition(async () => {
      const result = await createGoal(formData)
      if (result?.error) { setError(result.error) }
    })
  }

  function handleProgress(id: string, p: number) {
    startTransition(async () => {
      await updateGoalProgress(id, p)
      setLogGoalId(null)
      router.refresh()
    })
  }

  function handleComplete(id: string) {
    startTransition(async () => {
      const result = await completeGoal(id)
      setLogGoalId(null)
      router.refresh()
      if (result?.success) {
        setCeremony({
          goalTitle: result.goalTitle,
          xpGained: result.xpGained,
          newXP: result.newXP,
          newLevel: result.newLevel,
          leveledUp: result.leveledUp,
          earnedAchievements: result.earnedAchievements,
        })
      }
    })
  }

  function handleRestart(id: string) {
    startTransition(async () => {
      await restartGoal(id)
      router.refresh()
    })
  }

  function handleSaveMilestones(goalId: string) {
    startTransition(async () => {
      await saveMilestones(goalId, draftMs)
      setEditingMs(false)
      router.refresh()
    })
  }

  function handleToggleMilestone(id: string, done: boolean, goalId: string, text?: string) {
    if (done) {
      confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 }, colors: ['#4ade80','#D4AF37','#a78bfa','#38bdf8'] })
      if (toastTimer.current) clearTimeout(toastTimer.current)
      setMilestoneToast(text ?? 'Milestone complete!')
      toastTimer.current = setTimeout(() => setMilestoneToast(null), 2500)
    }
    startTransition(async () => {
      await toggleMilestone(id, done, goalId)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      setConfirmDeleteId(null)
      await deleteGoal(id)
    })
  }

  function handleAddBook(goalId: string, book: BookResult) {
    startTransition(async () => {
      await addBook(goalId, book.title, book.author, book.cover)
      setAddingBook(false)
      setPendingBook(null)
      router.refresh()
    })
  }

  function handleSetBookReading(bookId: string, goalId: string, title: string) {
    startTransition(async () => {
      await setBookReading(bookId, goalId, title)
      router.refresh()
    })
  }

  function handleMarkBookDone(bookId: string, goalId: string, rating: number, dateFinished: string) {
    startTransition(async () => {
      await markBookDone(bookId, goalId, rating, dateFinished)
      setMarkDoneBookId(null)
      setMarkDoneRating(0)
      setMarkDoneDate('')
      router.refresh()
    })
  }

  function handleRemoveBook(bookId: string, goalId: string) {
    startTransition(async () => {
      await removeBook(bookId, goalId)
      router.refresh()
    })
  }

  function handleUnmarkBookDone(bookId: string, goalId: string) {
    startTransition(async () => {
      await unmarkBookDone(bookId, goalId)
      router.refresh()
    })
  }

  function handleUpdateVisibility(goalId: string, vis: 'private' | 'circle' | 'public') {
    startTransition(async () => {
      await updateGoalVisibility(goalId, vis)
      router.refresh()
    })
  }

  function handleUpdateNotes(goalId: string, text: string) {
    startTransition(async () => {
      await updateGoalNotes(goalId, text)
      setEditingNotes(false)
      router.refresh()
    })
  }

  function handleAddEntry(goalId: string, type: string, content: Record<string, unknown>) {
    setEntryError(null)
    startTransition(async () => {
      const result = await addGoalEntry(goalId, type, content)
      if (result && 'error' in result) {
        setEntryError(result.error as string)
        return
      }
      setAddingEntry(false)
      setEntryDraft({})
      router.refresh()
    })
  }

  function handleRemoveEntry(entryId: string, goalId: string) {
    startTransition(async () => {
      await removeGoalEntry(entryId, goalId)
      router.refresh()
    })
  }

  function handleUpdateEntry(entryId: string, goalId: string, content: Record<string, unknown>) {
    startTransition(async () => {
      await updateGoalEntry(entryId, goalId, content)
      setEditDestId(null)
      router.refresh()
    })
  }

  function handleUpdateDeadline(goalId: string, date: string) {
    startTransition(async () => {
      await updateGoalDeadline(goalId, date || null)
      setEditingDeadline(false)
      router.refresh()
    })
  }

  function handleUpdateMeta(goalId: string) {
    const trimmed = metaTitleDraft.trim()
    if (!trimmed) return
    startTransition(async () => {
      await updateGoalMeta(goalId, trimmed, metaCategoryDraft || null)
      setEditingMeta(false)
      router.refresh()
    })
  }

  return (
    <>
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 32px' }} className="view-panel">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>YOUR GOALS</p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            What you&apos;re<br />building.
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 300, marginTop: 6 }}>
            {active.length} active · {complete.length} complete
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setView(v => v === 'list' ? 'calendar' : 'list')}
            style={{
              width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
              background: view === 'calendar' ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
              border: view === 'calendar' ? '1px solid rgba(212,175,55,0.35)' : '1px solid rgba(255,255,255,0.08)',
              color: view === 'calendar' ? '#D4AF37' : 'rgba(255,255,255,0.42)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
          <button onClick={openCreateBlank} className="btn-gold" style={{ width: 'auto', padding: '10px 18px', fontSize: 11 }}>+ NEW GOAL</button>
        </div>
      </div>

      {/* Templates shortcut */}
      <button
        onClick={openCreate}
        style={{ width: '100%', marginBottom: 20, padding: '13px 16px', borderRadius: 14, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontFamily: 'Satoshi,sans-serif', transition: 'background 0.15s' }}
      >
        <span style={{ fontSize: 22, lineHeight: 1 }}>✦</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', marginBottom: 2 }}>Browse Goal Templates</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>Start from a proven playbook — milestones included.</p>
        </div>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>›</span>
      </button>

      {/* Category filter pills */}
      {activeCategories.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 20, paddingBottom: 2 }}>
          <button onClick={() => setCatFilter(null)} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s', background: catFilter === null ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: catFilter === null ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)', color: catFilter === null ? '#D4AF37' : 'rgba(255,255,255,0.42)' }}>All</button>
          {activeCategories.map(cat => {
            const c = cc(cat); const sel = catFilter === cat
            return (
              <button key={cat} onClick={() => setCatFilter(sel ? null : cat)} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s', textTransform: 'capitalize', background: sel ? `${c.accent}18` : 'rgba(255,255,255,0.04)', border: sel ? `1px solid ${c.accent}44` : '1px solid rgba(255,255,255,0.08)', color: sel ? c.accent : 'rgba(255,255,255,0.42)' }}>{cat}</button>
            )
          })}
        </div>
      )}

      {view === 'calendar' ? (
        <GoalCalendar goals={filteredCalGoals} />
      ) : (
        <>
          {/* Active goals */}
          {filteredActive.length === 0 ? (
            <div style={{ borderRadius: 18, background: 'linear-gradient(135deg,rgba(212,175,55,0.1) 0%,rgba(212,175,55,0.04) 100%)', border: '1px solid rgba(212,175,55,0.25)', padding: '32px 24px', textAlign: 'center', marginBottom: 20 }}>
              <p style={{ fontSize: 36, marginBottom: 14 }}>🎯</p>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', marginBottom: 8 }}>{catFilter ? `No ${catFilter} goals` : 'No goals yet'}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', fontWeight: 300, marginBottom: 20 }}>{catFilter ? 'Try a different category or add a new goal.' : 'Add your first commitment to start tracking your progress.'}</p>
              <button onClick={openCreate} className="btn-gold" style={{ width: 'auto', padding: '12px 24px' }}>ADD YOUR FIRST GOAL</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {filteredActive.map(g => {
                const openModal = () => { setLogGoalId(g.id); setLogTab('milestones'); setEditingMs(false); setAddingEntry(false); setEntryDraft({}) }
                if (g.goal_type === 'letter')  return <LetterCard  key={g.id} goal={g} onCelebrate={setCeremony} />
                if (g.goal_type === 'reading') return <ReadingCard key={g.id} goal={g} books={booksByGoal[g.id] ?? []} onLog={() => { setLogGoalId(g.id); setLogTab('milestones'); setEditingMs(false); setAddingBook(false); setMarkDoneBookId(null) }} />
                if (g.goal_type === 'habit')   return <HabitCard   key={g.id} goal={g} entries={entriesByGoal[g.id] ?? []} onLog={openModal} />
                if (g.goal_type === 'savings') return <SavingsCard key={g.id} goal={g} entries={entriesByGoal[g.id] ?? []} onLog={openModal} onAdd={() => { setLogGoalId(g.id); setLogTab('milestones'); setEditingMs(false); setAddingEntry(true); setEntryDraft({}); setEntryError(null) }} />
                if (g.goal_type === 'travel')  return <TravelCard  key={g.id} goal={g} entries={entriesByGoal[g.id] ?? []} onLog={openModal} />
                return <GoalCard key={g.id} goal={g} milestones={milestonesByGoal[g.id] ?? []} onLog={() => { setLogGoalId(g.id); setLogTab('milestones'); setEditingMs(false) }} onDelete={() => setConfirmDeleteId(g.id)} />
              })}
            </div>
          )}

          {/* Completed goals */}
          {complete.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.50)', marginBottom: 10 }}>COMPLETED</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {complete.map(g => (
                  <div key={g.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.08))', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.58)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</p>
                      {g.completed_date && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Completed {g.completed_date}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleRestart(g.id)} disabled={isPending}
                        style={{ fontSize: 10, fontWeight: 700, padding: '5px 11px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                        Restart →
                      </button>
                      <button onClick={() => setConfirmDeleteId(g.id)} disabled={isPending}
                        style={{ fontSize: 10, fontWeight: 700, padding: '5px 11px', borderRadius: 8, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>

    <Modal>
    {/* ── GOAL DETAIL MODAL ── */}
      {logGoal && (() => {
        const c = cc(logGoal.category)
        const progress = logGoal.progress ?? 0
        const isReading  = logGoal.goal_type === 'reading'
        const isHabit    = logGoal.goal_type === 'habit'
        const isSavings  = logGoal.goal_type === 'savings'
        const isTravel   = logGoal.goal_type === 'travel'
        const accent = isReading ? '#38bdf8' : isHabit ? '#4ade80' : isSavings ? '#D4AF37' : isTravel ? '#84cc16' : c.accent
        const ms = milestonesByGoal[logGoal.id] ?? []
        const doneCount = ms.filter(m => m.done).length
        const booksTotal = isReading ? (parseInt(logGoal.why_it_matters ?? '') || 12) : 0
        const books = booksByGoal[logGoal.id] ?? []
        const goalEntries = entriesByGoal[logGoal.id] ?? []

        return (
          <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }} onClick={() => { setLogGoalId(null); setEditingNotes(false); setEditingDeadline(false); setEditingMeta(false) }} />
            <div style={{ position: 'fixed', zIndex: 50, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 480, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: '22px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingMeta ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          value={metaTitleDraft}
                          onChange={e => setMetaTitleDraft(e.target.value)}
                          className="cc-input"
                          style={{ fontSize: 15, fontWeight: 700, padding: '10px 14px' }}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleUpdateMeta(logGoal.id); if (e.key === 'Escape') setEditingMeta(false) }}
                        />
                        <select
                          value={metaCategoryDraft}
                          onChange={e => setMetaCategoryDraft(e.target.value)}
                          className="cc-input"
                          style={{ fontSize: 13 }}
                        >
                          <option value="" style={{ background: '#0D0D0D' }}>No category</option>
                          {CATEGORIES.map(cat => <option key={cat} value={cat} style={{ background: '#0D0D0D' }}>{categoryLabel(cat)}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" onClick={() => setEditingMeta(false)}
                            style={{ flex: 1, padding: '7px 0', borderRadius: 9, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                            Cancel
                          </button>
                          <button type="button" onClick={() => handleUpdateMeta(logGoal.id)} disabled={isPending}
                            style={{ flex: 2, padding: '7px 0', borderRadius: 9, background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                            {isPending ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.25, flex: 1, minWidth: 0 }}>{logGoal.title}</h2>
                          <button type="button" onClick={() => { setMetaTitleDraft(logGoal.title); setMetaCategoryDraft(logGoal.category ?? ''); setEditingMeta(true) }}
                            style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', flexShrink: 0, marginTop: 3 }}>
                            ✎
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          {logGoal.category && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: isReading ? 'rgba(56,189,248,0.09)' : c.bg, border: `1px solid ${isReading ? 'rgba(56,189,248,0.18)' : c.border}`, padding: '2px 9px', borderRadius: 6 }}>
                              {categoryLabel(logGoal.category)}
                            </span>
                          )}
                          {logGoal.deadline && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>Due {logGoal.deadline}</span>}
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${accent}18`, border: `2px solid ${accent}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: accent, lineHeight: 1 }}>{progress}%</span>
                    </div>
                    <button onClick={() => { setLogGoalId(null); setEditingNotes(false); setEditingDeadline(false); setEditingMeta(false) }} style={{ fontSize: 22, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
                  {(['milestones', 'notes', 'details'] as const).filter(tab => !((isReading || isHabit || isSavings || isTravel) && tab === 'notes')).map(tab => {
                    const label = tab === 'milestones'
                      ? isReading  ? '📚 Books'
                      : isHabit   ? '🔄 Tracker'
                      : isSavings ? '💰 Savings'
                      : isTravel  ? '✈️ Trips'
                      : 'Milestones'
                      : tab === 'notes' ? 'Notes' : 'Details'
                    return (
                      <button key={tab} type="button" onClick={() => { setLogTab(tab); setEditingNotes(false) }}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', border: 'none',
                          background: logTab === tab ? `${accent}18` : 'transparent',
                          color: logTab === tab ? accent : 'rgba(255,255,255,0.42)' }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

                {logTab === 'milestones' && (
                  <>
                    {isReading ? (
                      <>
                        {/* ── CURRENTLY READING ── */}
                        {(() => {
                          const readingBook = books.find(b => b.status === 'reading')
                          const legacyTitle = !books.length && logGoal.next_action ? logGoal.next_action : null
                          if (readingBook) return (
                            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', marginBottom: 16 }}>
                              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#38bdf8', marginBottom: 10 }}>CURRENTLY READING</p>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                {readingBook.cover_url
                                  ? <img src={readingBook.cover_url} alt="" style={{ width: 48, height: 68, objectFit: 'cover', borderRadius: 5, flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }} />
                                  : <div style={{ width: 48, height: 68, background: SPINE_COLORS[0], borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📖</div>
                                }
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.3, marginBottom: 3 }}>{readingBook.title}</p>
                                  {readingBook.author && <p style={{ fontSize: 11, color: '#38bdf8', fontWeight: 300, marginBottom: 12 }}>{readingBook.author}</p>}
                                  {markDoneBookId === readingBook.id ? (
                                    <div>
                                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#D4AF37', marginBottom: 8 }}>RATE THIS BOOK</p>
                                      <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
                                        {[1,2,3,4,5].map(s => (
                                          <button key={s} type="button" onClick={() => setMarkDoneRating(s)}
                                            style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: s <= markDoneRating ? '#D4AF37' : 'rgba(255,255,255,0.18)', padding: '0 1px', lineHeight: 1 }}>★</button>
                                        ))}
                                      </div>
                                      <input type="date" value={markDoneDate} onChange={e => setMarkDoneDate(e.target.value)} className="cc-input" style={{ fontSize: 12, colorScheme: 'dark', marginBottom: 10 }} />
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="button" onClick={() => { setMarkDoneBookId(null); setMarkDoneRating(0) }}
                                          style={{ flex: 1, padding: '8px 0', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                                          Cancel
                                        </button>
                                        <button type="button" onClick={() => handleMarkBookDone(readingBook.id, logGoal.id, markDoneRating, markDoneDate)} disabled={isPending}
                                          style={{ flex: 2, padding: '8px 0', borderRadius: 9, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                                          {isPending ? 'Saving…' : 'Mark as Done ✓'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => { setMarkDoneBookId(readingBook.id); setMarkDoneRating(0); setMarkDoneDate(new Date().toISOString().slice(0,10)) }}
                                      style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: 'rgba(56,189,248,0.09)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}>
                                      Finished this book?
                                    </button>
                                  )}
                                </div>
                                <button type="button" onClick={() => handleRemoveBook(readingBook.id, logGoal.id)} disabled={isPending}
                                  style={{ fontSize: 18, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                              </div>
                            </div>
                          )
                          if (legacyTitle) return (
                            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', marginBottom: 16 }}>
                              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#38bdf8', marginBottom: 6 }}>CURRENTLY READING</p>
                              <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF' }}>{legacyTitle}</p>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', marginTop: 4 }}>Add books below to track your full list</p>
                            </div>
                          )
                          return (
                            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)', marginBottom: 16, textAlign: 'center' }}>
                              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)' }}>Not reading anything right now</p>
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 4, fontWeight: 300 }}>Add a book and start reading</p>
                            </div>
                          )
                        })()}

                        {/* ── READ ── */}
                        {books.filter(b => b.status === 'read').length > 0 && (
                          <>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>
                              READ — {books.filter(b => b.status === 'read').length} of {booksTotal}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                              {[...books.filter(b => b.status === 'read')].reverse().map(book => (
                                <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  {book.cover_url
                                    ? <img src={book.cover_url} alt="" style={{ width: 30, height: 42, objectFit: 'cover', borderRadius: 4, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
                                    : <div style={{ width: 30, height: 42, borderRadius: 4, background: 'rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📚</div>
                                  }
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                                    {book.author && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', marginTop: 1 }}>{book.author}</p>}
                                  </div>
                                  <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                    {[1,2,3,4,5].map(s => (
                                      <span key={s} style={{ fontSize: 11, color: s <= (book.rating ?? 0) ? '#D4AF37' : 'rgba(255,255,255,0.18)' }}>★</span>
                                    ))}
                                  </div>
                                  {book.date_finished && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{book.date_finished}</span>}
                                  <button type="button" onClick={() => handleUnmarkBookDone(book.id, logGoal.id)} disabled={isPending} title="Undo — move back to queue"
                                    style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}>
                                    ↩
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* ── TO READ ── */}
                        {books.filter(b => b.status === 'queue').length > 0 && (
                          <>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 8 }}>
                              TO READ — {books.filter(b => b.status === 'queue').length} queued
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
                              {books.filter(b => b.status === 'queue').map((book, i, arr) => (
                                <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                  <div style={{ width: 24, height: 34, borderRadius: 3, background: 'rgba(255,255,255,0.04)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, opacity: 0.6 }}>📚</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.58)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                                    {book.author && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{book.author}</p>}
                                  </div>
                                  <button type="button" onClick={() => handleSetBookReading(book.id, logGoal.id, book.title)} disabled={isPending}
                                    style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: 'rgba(56,189,248,0.07)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.15)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    Start Reading
                                  </button>
                                  <button type="button" onClick={() => handleRemoveBook(book.id, logGoal.id)} disabled={isPending}
                                    style={{ fontSize: 16, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* ── ADD BOOK ── */}
                        {addingBook ? (
                          <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 12 }}>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>WHAT BOOK ARE YOU ADDING?</p>
                            <BookSearch onSelect={setPendingBook} />
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                              <button type="button" onClick={() => { setAddingBook(false); setPendingBook(null) }}
                                style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                                Cancel
                              </button>
                              <button type="button" onClick={() => pendingBook && handleAddBook(logGoal.id, pendingBook)} disabled={!pendingBook || isPending}
                                style={{ flex: 2, padding: '9px 0', borderRadius: 10, background: pendingBook ? 'rgba(56,189,248,0.09)' : 'rgba(255,255,255,0.03)', border: pendingBook ? '1px solid rgba(56,189,248,0.2)' : '1px solid rgba(255,255,255,0.06)', color: pendingBook ? '#38bdf8' : 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700, cursor: pendingBook ? 'pointer' : 'default', fontFamily: 'Satoshi,sans-serif' }}>
                                {isPending ? 'Adding…' : 'Add to List'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setAddingBook(true)}
                            style={{ width: '100%', fontSize: 12, fontWeight: 700, padding: '10px 0', borderRadius: 11, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(56,189,248,0.15)', color: '#38bdf8', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 12 }}>
                            + Add a Book
                          </button>
                        )}

                        {/* progress summary */}
                        <div style={{ padding: '10px 14px', borderRadius: 11, background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>Books read</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#38bdf8' }}>{books.filter(b => b.status === 'read').length} / {booksTotal}</span>
                        </div>
                      </>
                    ) : isHabit ? (
                      <HabitTrackerPanel goal={logGoal} entries={goalEntries} onAddEntry={handleAddEntry} onRemoveEntry={handleRemoveEntry} addingEntry={addingEntry} setAddingEntry={setAddingEntry} entryDraft={entryDraft} setEntryDraft={setEntryDraft} isPending={isPending} accent={accent} />
                    ) : isSavings ? (
                      <SavingsPanelModal goal={logGoal} entries={goalEntries} onAddEntry={handleAddEntry} onRemoveEntry={handleRemoveEntry} addingEntry={addingEntry} setAddingEntry={setAddingEntry} entryDraft={entryDraft} setEntryDraft={setEntryDraft} isPending={isPending} accent={accent} entryError={entryError} />
                    ) : isTravel ? (
                      <TravelPanelModal goal={logGoal} entries={goalEntries} onAddEntry={handleAddEntry} onRemoveEntry={handleRemoveEntry} onUpdateEntry={handleUpdateEntry} addingEntry={addingEntry} setAddingEntry={setAddingEntry} entryDraft={entryDraft} setEntryDraft={setEntryDraft} editDestId={editDestId} setEditDestId={setEditDestId} isPending={isPending} accent={accent} />
                    ) : ms.length > 0 || editingMs ? (
                      <>
                        {/* Edit / Save header */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                          {editingMs ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button type="button" onClick={() => setEditingMs(false)} disabled={isPending}
                                style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.42)', transition: 'all 0.15s' }}>
                                Cancel
                              </button>
                              <button type="button" onClick={() => handleSaveMilestones(logGoal.id)} disabled={isPending}
                                style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, transition: 'all 0.15s' }}>
                                {isPending ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => { setDraftMs(ms.map(m => ({ id: m.id, text: m.text }))); setEditingMs(true) }}
                              style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)', transition: 'all 0.15s' }}>
                              Edit
                            </button>
                          )}
                        </div>

                        {editingMs ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {draftMs.map((m, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  value={m.text}
                                  onChange={e => { const u = [...draftMs]; u[i] = { ...u[i], text: e.target.value }; setDraftMs(u) }}
                                  className="cc-input"
                                  style={{ flex: 1, fontSize: 13 }}
                                  placeholder={`Step ${i + 1}…`}
                                />
                                <button type="button" onClick={() => setDraftMs(draftMs.filter((_, j) => j !== i))}
                                  style={{ padding: '0 11px', height: 40, borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>×</button>
                              </div>
                            ))}
                            {draftMs.length < 10 && (
                              <button type="button" onClick={() => setDraftMs([...draftMs, { text: '' }])}
                                style={{ fontSize: 11, fontWeight: 700, padding: '9px 0', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginTop: 2 }}>
                                + Add Step
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {ms.map(m => (
                              <button key={m.id} type="button" onClick={() => handleToggleMilestone(m.id, !m.done, logGoal.id, m.text)} disabled={isPending}
                                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: m.done ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)', border: m.done ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s' }}>
                                <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: m.done ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.12)', background: m.done ? 'rgba(34,197,94,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                  {m.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <span style={{ fontSize: 13, color: m.done ? 'rgba(255,255,255,0.42)' : '#EFEFEF', textDecoration: m.done ? 'line-through' : 'none', flex: 1, lineHeight: 1.4 }}>{m.text}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setDraftMs([{ text: '' }]); setEditingMs(true) }}
                          style={{ width: '100%', fontSize: 12, fontWeight: 700, padding: '10px 0', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.50)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 18 }}>
                          + Add Milestones
                        </button>
                        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 8 }}>UPDATE PROGRESS</p>
                        <div className="progress-track" style={{ height: 5, marginBottom: 14 }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg,${accent}88,${accent})`, borderRadius: 999 }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                          {[10,25,50,75,100].map(p => (
                            <button key={p} onClick={() => handleProgress(logGoal.id, p)} disabled={isPending}
                              style={{ padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: progress===p ? c.bg : 'rgba(255,255,255,0.04)', color: progress===p ? c.text : 'rgba(255,255,255,0.42)', border: progress===p ? `1px solid ${c.border}` : '1px solid rgba(255,255,255,0.08)', transition: 'all 0.15s' }}>
                              {p}%
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Progress summary */}
                    {ms.length > 0 && (
                      <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>Progress</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 15, fontWeight: 900, color: accent }}>{progress}%</span>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', marginTop: 1 }}>{doneCount} of {ms.length} complete</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {logTab === 'notes' && (() => {
                  const daysSince = Math.floor((Date.now() - new Date(logGoal.created_at).getTime()) / 86400000)
                  const isReadingGoal = logGoal.goal_type === 'reading'

                  if (editingNotes) return (
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>YOUR WHY</p>
                      <textarea
                        value={notesDraft}
                        onChange={e => setNotesDraft(e.target.value)}
                        rows={6}
                        placeholder="What's driving this goal? What will it mean when you achieve it?"
                        autoFocus
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1.5px solid ${accent}40`, borderRadius: 14, padding: '14px 16px', fontSize: 14, color: '#EFEFEF', fontFamily: 'Georgia,serif', outline: 'none', resize: 'none', lineHeight: 1.75, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                        onFocus={e => (e.target.style.borderColor = `${accent}80`)}
                        onBlur={e => (e.target.style.borderColor = `${accent}40`)}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button type="button" onClick={() => setEditingNotes(false)} disabled={isPending}
                          style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                          Cancel
                        </button>
                        <button type="button" onClick={() => handleUpdateNotes(logGoal.id, notesDraft)} disabled={isPending}
                          style={{ flex: 2, padding: '10px 0', borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                          {isPending ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )

                  if (logGoal.why_it_matters && !isReadingGoal) return (
                    <div>
                      {/* Decorative quote block */}
                      <div style={{ position: 'relative', padding: '28px 20px 20px', borderRadius: 18, background: `linear-gradient(135deg,${accent}08 0%,rgba(0,0,0,0) 60%)`, border: `1px solid ${accent}18`, marginBottom: 18, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -12, left: 10, fontSize: 100, lineHeight: 1, color: accent, opacity: 0.08, fontFamily: 'Georgia,serif', userSelect: 'none', pointerEvents: 'none' }}>&ldquo;</div>
                        <p style={{ fontSize: 15, color: '#D0D0D0', fontWeight: 300, lineHeight: 1.85, fontFamily: 'Georgia,serif', letterSpacing: '0.01em', position: 'relative', zIndex: 1 }}>
                          {logGoal.why_it_matters}
                        </p>
                        <button type="button" onClick={() => { setNotesDraft(logGoal.why_it_matters ?? ''); setEditingNotes(true) }}
                          style={{ marginTop: 16, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '5px 12px', borderRadius: 7, background: 'transparent', border: `1px solid ${accent}28`, color: accent, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', opacity: 0.7, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
                          ✎ EDIT
                        </button>
                      </div>

                      {/* Metadata strip */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 1 }}>DAY</p>
                          <p style={{ fontSize: 15, fontWeight: 900, color: accent, lineHeight: 1 }}>{daysSince}</p>
                        </div>
                        {logGoal.deadline && (
                          <div style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 1 }}>DUE</p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.58)', lineHeight: 1 }}>{logGoal.deadline}</p>
                          </div>
                        )}
                        <div style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 1 }}>PROGRESS</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: accent, lineHeight: 1 }}>{logGoal.progress ?? 0}%</p>
                        </div>
                      </div>
                    </div>
                  )

                  /* Empty state */
                  return (
                    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${accent}10`, border: `1px solid ${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 26 }}>✍️</div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>What&apos;s driving this?</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 300, lineHeight: 1.7, marginBottom: 22, maxWidth: 260, margin: '0 auto 22px' }}>
                        Write your &ldquo;why&rdquo; — the deeper reason behind this commitment. It&apos;s what you come back to when things get hard.
                      </p>
                      <button type="button" onClick={() => { setNotesDraft(''); setEditingNotes(true) }}
                        style={{ padding: '10px 22px', borderRadius: 11, background: `${accent}14`, border: `1px solid ${accent}30`, color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                        + Add your why
                      </button>
                    </div>
                  )
                })()}

                {logTab === 'details' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      ['Goal Type', logGoal.goal_type ?? 'standard'],
                      ['Status', logGoal.status ?? 'active'],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: 12, color: '#EFEFEF', textTransform: 'capitalize' }}>{value}</span>
                      </div>
                    ))}

                    {/* Editable deadline */}
                    <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {editingDeadline ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>Deadline</span>
                          <input
                            type="date"
                            value={deadlineDraft}
                            onChange={e => setDeadlineDraft(e.target.value)}
                            className="cc-input"
                            style={{ fontSize: 13, colorScheme: 'dark' }}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={() => setEditingDeadline(false)} disabled={isPending}
                              style={{ flex: 1, padding: '8px 0', borderRadius: 9, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                              Cancel
                            </button>
                            {deadlineDraft && (
                              <button type="button" onClick={() => handleUpdateDeadline(logGoal.id, '')} disabled={isPending}
                                style={{ flex: 1, padding: '8px 0', borderRadius: 9, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                                Remove
                              </button>
                            )}
                            <button type="button" onClick={() => handleUpdateDeadline(logGoal.id, deadlineDraft)} disabled={isPending}
                              style={{ flex: 2, padding: '8px 0', borderRadius: 9, background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                              {isPending ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>Deadline</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 12, color: '#EFEFEF' }}>{logGoal.deadline ?? '—'}</span>
                            <button type="button" onClick={() => { setDeadlineDraft(logGoal.deadline ?? ''); setEditingDeadline(true) }}
                              style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                              Edit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Editable visibility */}
                    <div style={{ paddingTop: 16 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>VISIBILITY</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        {(['private', 'circle', 'public'] as const).map(v => {
                          const active = (logGoal.visibility ?? 'circle') === v
                          return (
                            <button key={v} type="button" onClick={() => handleUpdateVisibility(logGoal.id, v)} disabled={isPending}
                              style={{ padding: '9px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s',
                                background: active ? `${accent}18` : 'rgba(255,255,255,0.03)',
                                color: active ? accent : 'rgba(255,255,255,0.42)',
                                border: active ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.07)' }}>
                              {VIS_LABEL[v]}
                            </button>
                          )
                        })}
                      </div>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8, fontWeight: 300 }}>{VIS_DESC[logGoal.visibility ?? 'circle']}</p>
                    </div>

                    {/* Danger zone */}
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <button type="button" onClick={() => { setLogGoalId(null); setConfirmDeleteId(logGoal.id) }}
                        style={{ width: '100%', padding: '11px', borderRadius: 11, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
                        Delete Goal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 22px 22px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {logGoal.status === 'active' ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => handleComplete(logGoal.id)} disabled={isPending}
                      style={{ flex: 1, padding: '13px', borderRadius: 14, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
                      {isPending ? '…' : '✓ COMPLETE'}
                    </button>
                    <button onClick={() => { setLogGoalId(null); setEditingNotes(false); setEditingDeadline(false); setEditingMeta(false) }}
                      style={{ flex: 1, padding: 15, borderRadius: 14, background: `linear-gradient(135deg,${accent}22,${accent}10)`, border: `1px solid ${accent}44`, color: accent, fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
                      CLOSE
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setLogGoalId(null); setEditingNotes(false); setEditingDeadline(false); setEditingMeta(false) }}
                    style={{ width: '100%', padding: 15, borderRadius: 14, background: `linear-gradient(135deg,${accent}22,${accent}10)`, border: `1px solid ${accent}44`, color: accent, fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
                    CLOSE
                  </button>
                )}
              </div>

            </div>
          </>
        )
      })()}

      {/* ── DELETE CONFIRMATION ── */}
      {confirmDeleteId && (() => {
        const target = goals.find(g => g.id === confirmDeleteId)
        return (
          <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 59, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }} onClick={() => setConfirmDeleteId(null)} />
            <div style={{ position: 'fixed', zIndex: 60, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 32px)', maxWidth: 360, borderRadius: 22, background: '#111', border: '1px solid rgba(248,113,113,0.2)', padding: '28px 24px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 22 }}>🗑</div>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.01em', marginBottom: 8 }}>Delete this goal?</h3>
              {target && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300, marginBottom: 6, lineHeight: 1.5 }}>&ldquo;{target.title}&rdquo;</p>}
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', fontWeight: 300, marginBottom: 24 }}>This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setConfirmDeleteId(null)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  Cancel
                </button>
                <button type="button" onClick={() => handleDelete(confirmDeleteId)} disabled={isPending}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  {isPending ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── CREATE GOAL DRAWER ── */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={closeCreate} />
          {/* Drawer panel */}
          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, height: '100%', overflowY: 'auto', background: '#0E0E0E', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '28px 24px 32px', flex: 1 }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {createView === 'form' && (
                  <button type="button" onClick={() => setCreateView('templates')} style={{ fontSize: 20, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0 }}>←</button>
                )}
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em' }}>
                  {createView === 'templates' ? 'Pick a Template' : 'New Commitment'}
                </h2>
              </div>
              <button type="button" onClick={closeCreate} style={{ fontSize: 24, color: 'rgba(255,255,255,0.50)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
            </div>

            {createView === 'templates' && (
              <GoalTemplatePicker
                onSelect={selectTemplate}
                onSkip={() => { setGoalType('standard'); setTmplTitle(''); setTmplCategory(''); setTmplDeadline(''); setMilestoneInputs(['']); setTmplKey(k => k + 1); setCreateView('form') }}
              />
            )}

            {createView === 'form' && (<>
            {/* Type selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
                {(['standard','reading','letter'] as const).filter(t => !(t === 'reading' && hasActiveReadingGoal)).map(t => {
                  const sel = goalType === t
                  const cfg = { standard: { e: '🎯', l: 'Standard', c: '#D4AF37' }, reading: { e: '📚', l: 'Reading', c: '#38bdf8' }, letter: { e: '✉️', l: 'Letter', c: '#d946ef' } }[t]
                  return (
                    <button key={t} type="button" onClick={() => { setGoalType(t); setError('') }}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 9, fontFamily: 'Satoshi,sans-serif', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center', fontSize: 11, fontWeight: 700, border: 'none', background: sel ? `${cfg.c}18` : 'transparent', color: sel ? cfg.c : 'rgba(255,255,255,0.42)' }}>
                      {cfg.e} {cfg.l}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
                {(['habit','savings','travel'] as const).map(t => {
                  const sel = goalType === t
                  const cfg = { habit: { e: '🔄', l: 'Habit', c: '#4ade80' }, savings: { e: '💰', l: 'Savings', c: '#D4AF37' }, travel: { e: '✈️', l: 'Travel', c: '#84cc16' } }[t]
                  return (
                    <button key={t} type="button" onClick={() => { setGoalType(t); setError('') }}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 9, fontFamily: 'Satoshi,sans-serif', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center', fontSize: 11, fontWeight: 700, border: 'none', background: sel ? `${cfg.c}18` : 'transparent', color: sel ? cfg.c : 'rgba(255,255,255,0.42)' }}>
                      {cfg.e} {cfg.l}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Form — hidden inputs carry goal_type + visibility into FormData */}
            <form autoComplete="off" onSubmit={handleCreate} data-goal-form key={tmplKey} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="hidden" name="goal_type" value={goalType} onChange={() => {}} />
              <input type="hidden" name="visibility" value={visibility} onChange={() => {}} />

              {/* ── STANDARD ── */}
              {goalType === 'standard' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>COMMITMENT</label>
                    <input name="title" required placeholder="What will you accomplish?" className="cc-input" defaultValue={tmplTitle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>CATEGORY</label>
                    <select name="category" className="cc-input" style={{ fontSize: 14 }} defaultValue={tmplCategory}>
                      <option value="" style={{ background: '#0D0D0D' }}>Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#0D0D0D' }}>{categoryLabel(c)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>TARGET DATE</label>
                    <input name="deadline" type="date" className="cc-input" style={{ fontSize: 14, colorScheme: 'dark' }} defaultValue={tmplDeadline} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)' }}>MILESTONES</label>
                      <button
                        type="button"
                        disabled={aiGenerating}
                        onClick={async () => {
                          const form = document.querySelector('form[data-goal-form]') as HTMLFormElement
                          const title = (form?.querySelector('[name="title"]') as HTMLInputElement)?.value ?? ''
                          const category = (form?.querySelector('[name="category"]') as HTMLSelectElement)?.value ?? ''
                          const deadline = (form?.querySelector('[name="deadline"]') as HTMLInputElement)?.value ?? ''
                          if (!title.trim()) { setAiError('Enter a goal title first'); return }
                          setAiError(''); setAiGenerating(true)
                          const { milestones, error } = await generateMilestones(title, category, deadline)
                          setAiGenerating(false)
                          if (error) { setAiError(error); return }
                          setMilestoneInputs(milestones.length > 0 ? milestones : [''])
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: aiGenerating ? 'rgba(212,175,55,0.06)' : 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', fontSize: 11, fontWeight: 700, cursor: aiGenerating ? 'default' : 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.2s' }}
                      >
                        {aiGenerating ? (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                            Generating…
                          </>
                        ) : (
                          <>✦ Generate with AI</>
                        )}
                      </button>
                    </div>
                    {aiError && <p style={{ fontSize: 11, color: '#f87171', marginBottom: 8 }}>{aiError}</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {milestoneInputs.map((m, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.35)', width: 18, flexShrink: 0, textAlign: 'center' }}>{i + 1}</span>
                          <input
                            name="milestone"
                            value={m}
                            onChange={e => { const u = [...milestoneInputs]; u[i] = e.target.value; setMilestoneInputs(u) }}
                            placeholder={`Step ${i + 1}…`}
                            className="cc-input"
                            style={{ flex: 1 }}
                          />
                          {milestoneInputs.length > 1 && (
                            <button type="button" onClick={() => setMilestoneInputs(milestoneInputs.filter((_, j) => j !== i))}
                              style={{ padding: '0 10px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', cursor: 'pointer', fontSize: 16, lineHeight: 1, height: 38, flexShrink: 0 }}>×</button>
                          )}
                        </div>
                      ))}
                      {milestoneInputs.length < 6 && (
                        <button type="button" onClick={() => setMilestoneInputs([...milestoneInputs, ''])}
                          style={{ fontSize: 11, fontWeight: 700, padding: '8px 0', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
                          + Add Step
                        </button>
                      )}
                    </div>
                  </div>
                  <VisibilityPicker visibility={visibility} onChange={setVisibility} />
                </>
              )}

              {/* ── READING ── */}
              {goalType === 'reading' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>GOAL TITLE</label>
                    <input name="title" required placeholder="e.g. Read 24 Books This Year" className="cc-input" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>HOW MANY BOOKS?</label>
                      <input name="why" required type="number" min="1" max="365" placeholder="12" className="cc-input" style={{ fontSize: 15 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>TARGET DATE</label>
                      <input name="deadline" type="date" className="cc-input" style={{ fontSize: 14, colorScheme: 'dark' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
                      CURRENTLY READING <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                    </label>
                    <BookSearch />
                  </div>
                  <VisibilityPicker visibility={visibility} onChange={setVisibility} />
                </>
              )}

              {/* ── LETTER TO SELF ── */}
              {goalType === 'letter' && (
                <>
                  <input type="hidden" name="title" defaultValue="Letter to Self" />
                  <div style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', fontWeight: 300, lineHeight: 1.65 }}>
                      Write a letter to your future self. Set the date you want it to unlock. You won&apos;t be able to read it until that date arrives — not even if you come back and click on it.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>UNLOCK DATE</label>
                    <input name="deadline" type="date" required className="cc-input" style={{ fontSize: 14, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>YOUR LETTER</label>
                    <textarea name="why" rows={8} placeholder={'Dear Future Me,\n\nI\'m writing this today, and I want you to know…'}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, fontSize: 13, color: '#EFEFEF', fontFamily: 'Georgia,serif', outline: 'none', resize: 'none', lineHeight: 1.8, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(212,175,55,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 6, fontWeight: 300 }}>Once sealed, you can&apos;t edit this letter. Write freely.</p>
                  </div>
                </>
              )}

              {/* ── HABIT GOAL ── */}
              {goalType === 'habit' && (
                <>
                  <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>🔄</span>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', fontWeight: 300, lineHeight: 1.65 }}>
                      Build a habit by logging it daily. Each time you tap &ldquo;Log Today&rdquo; it adds to your streak and progress. No milestones — just consistency.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>HABIT</label>
                    <input name="title" required placeholder="e.g. Run 5K, Read 30 minutes, Meditate…" className="cc-input" defaultValue={tmplTitle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>CATEGORY</label>
                    <select name="category" className="cc-input" style={{ fontSize: 14 }} defaultValue={tmplCategory}>
                      <option value="" style={{ background: '#0D0D0D' }}>Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#0D0D0D' }}>{categoryLabel(c)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>FREQUENCY</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
                      {[['daily','Every Day'],['weekdays','Weekdays'],['5x','5× / Week'],['3x','3× / Week']].map(([v, l]) => (
                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                          <input type="radio" name="next_action" value={v} defaultChecked={v === 'daily'} style={{ accentColor: '#4ade80' }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#EFEFEF' }}>{l}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>TARGET DATE <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input name="deadline" type="date" className="cc-input" style={{ fontSize: 14, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>WHY THIS HABIT? <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <textarea name="why" rows={3} placeholder="What will this habit change for you?" className="cc-input" style={{ resize: 'none', fontSize: 13 }} />
                  </div>
                  <VisibilityPicker visibility={visibility} onChange={setVisibility} />
                </>
              )}

              {/* ── SAVINGS GOAL ── */}
              {goalType === 'savings' && (
                <>
                  <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>💰</span>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', fontWeight: 300, lineHeight: 1.65 }}>
                      Track money saved toward a target. Log contributions to watch your progress bar fill up with real dollar amounts.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>WHAT ARE YOU SAVING FOR?</label>
                    <input name="title" required placeholder="e.g. Emergency Fund, Dream Vacation, New Car…" className="cc-input" defaultValue={tmplTitle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>TARGET AMOUNT ($)</label>
                    <input name="next_action" required type="number" min="1" placeholder="10000" className="cc-input" style={{ fontSize: 16, fontWeight: 700 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>CATEGORY</label>
                    <select name="category" className="cc-input" style={{ fontSize: 14 }} defaultValue="finance">
                      {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#0D0D0D' }}>{categoryLabel(c)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>TARGET DATE <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input name="deadline" type="date" className="cc-input" style={{ fontSize: 14, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>WHY <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <textarea name="why" rows={2} placeholder="What will this money make possible?" className="cc-input" style={{ resize: 'none', fontSize: 13 }} />
                  </div>
                  <VisibilityPicker visibility={visibility} onChange={setVisibility} />
                </>
              )}

              {/* ── TRAVEL GOAL ── */}
              {goalType === 'travel' && (
                <>
                  <div style={{ background: 'rgba(132,204,22,0.05)', border: '1px solid rgba(132,204,22,0.15)', borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>✈️</span>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', fontWeight: 300, lineHeight: 1.65 }}>
                      Build a destination bucket list. Add places as Dream → Booked → Done. Progress tracks how many you&apos;ve actually visited.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>BUCKET LIST NAME</label>
                    <input name="title" required placeholder="e.g. 2026 Adventure Year, European Dream, Bucket List…" className="cc-input" />
                  </div>
                  <input type="hidden" name="category" value="adventure" />
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>TARGET DATE <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input name="deadline" type="date" className="cc-input" style={{ fontSize: 14, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>WHY <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <textarea name="why" rows={2} placeholder="What does travel mean to you?" className="cc-input" style={{ resize: 'none', fontSize: 13 }} />
                  </div>
                  <VisibilityPicker visibility={visibility} onChange={setVisibility} />
                </>
              )}

              {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={closeCreate} className="btn-ghost" style={{ width: 'auto', paddingLeft: 18, paddingRight: 18 }}>Cancel</button>
                <button type="submit" disabled={isPending} className="btn-gold">
                  {isPending ? 'SAVING…'
                    : goalType === 'letter'  ? '🔒 SEAL & SAVE'
                    : goalType === 'reading' ? 'START READING GOAL'
                    : goalType === 'habit'   ? '🔄 START HABIT'
                    : goalType === 'savings' ? '💰 CREATE SAVINGS GOAL'
                    : goalType === 'travel'  ? '✈️ CREATE BUCKET LIST'
                    : 'ADD COMMITMENT'}
                </button>
              </div>
            </form>
            </>)}
            </div>
          </div>
        </div>
      )}

      {/* Milestone toast */}
      {milestoneToast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 3000, pointerEvents: 'none',
          background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(74,222,128,0.35)',
          borderRadius: 40, padding: '12px 22px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(74,222,128,0.1)',
          animation: 'milestoneToastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
          maxWidth: 'calc(100vw - 48px)',
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>✓</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#4ade80', letterSpacing: '0.04em', lineHeight: 1, marginBottom: 2 }}>MILESTONE COMPLETE</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{milestoneToast}</p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#D4AF37', flexShrink: 0 }}>+10 XP</span>
        </div>
      )}

      {/* Goal Completion Ceremony */}
      {ceremony && (
        <CeremonyModal
          data={ceremony}
          onClose={() => { setCeremony(null); router.refresh() }}
        />
      )}
    </Modal>
    </>
  )
}

/* ── VISIBILITY PICKER ── */
function VisibilityPicker({ visibility, onChange }: { visibility: string; onChange: (v: 'private' | 'circle' | 'public') => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 10 }}>WHO CAN SEE THIS</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <button type="button" onClick={() => onChange('private')} className={`vis-btn${visibility === 'private' ? ' active-private' : ''}`}>🔒 Private</button>
        <button type="button" onClick={() => onChange('circle')}  className={`vis-btn${visibility === 'circle'  ? ' active-circle'  : ''}`}>👥 Circle</button>
        <button type="button" onClick={() => onChange('public')}  className={`vis-btn${visibility === 'public'  ? ' active-public'  : ''}`}>🌍 Public</button>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 8, fontWeight: 300 }}>{VIS_DESC[visibility]}</p>
    </div>
  )
}

/* ── DEADLINE URGENCY PILL ── */
function DeadlinePill({ deadline }: { deadline: string | null }) {
  if (!deadline) return null
  const daysLeft = Math.ceil((new Date(deadline + 'T12:00:00').getTime() - Date.now()) / 86400000)
  if (daysLeft > 7) return null
  const overdue   = daysLeft < 0
  const critical  = !overdue && daysLeft <= 3
  const color  = overdue || critical ? '#f87171' : '#f59e0b'
  const bg     = overdue || critical ? 'rgba(248,113,113,0.1)' : 'rgba(245,158,11,0.1)'
  const border = overdue || critical ? 'rgba(248,113,113,0.3)' : 'rgba(245,158,11,0.3)'
  const label  = overdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 6, color, background: bg, border: `1px solid ${border}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
      {overdue ? '!' : '⏳'} {label}
    </span>
  )
}

/* ── STANDARD GOAL CARD ── */
function GoalCard({ goal, milestones = [], onLog, onDelete }: { goal: Goal; milestones?: GoalMilestone[]; onLog: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  const c = cc(goal.category)
  const progress = goal.progress ?? 0
  const dotsFilled = Math.round(progress / 10)
  const msDone = milestones.filter(m => m.done).length
  const msTotal = milestones.length

  return (
    <div className="card lift" style={{ padding: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer', borderLeft: `3px solid ${c.accent}`, background: `linear-gradient(120deg,${c.bg} 0%,#111111 40%)` }} onClick={onLog} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button type="button" onClick={e => { e.stopPropagation(); onDelete() }} style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, width: 26, height: 26, borderRadius: '50%', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, lineHeight: 1, opacity: hovered ? 1 : 0, transform: `scale(${hovered ? 1 : 0.75})`, transition: 'opacity 0.15s, transform 0.15s', pointerEvents: hovered ? 'auto' : 'none' }}>×</button>
      <div style={{ position: 'absolute', top: -30, left: -20, width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(40px)', opacity: 0.6, background: c.accent }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, position: 'relative', zIndex: 1 }}>
        <ProgressRing progress={progress} accent={c.accent} text={c.text} label={`${progress}%`} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 8 }}>{goal.title}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {goal.category && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '3px 9px', borderRadius: 6, color: c.text, background: c.bg, border: `1px solid ${c.border}` }}>{categoryLabel(goal.category)}</span>}
            {goal.visibility && <span className={`vis-badge vis-${goal.visibility}`}>{VIS_LABEL[goal.visibility]}</span>}
            {msTotal > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: msDone === msTotal ? '#4ade80' : 'rgba(255,255,255,0.55)', background: msDone === msTotal ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)', border: msDone === msTotal ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>
                {msDone}/{msTotal} milestones
              </span>
            )}
            <DeadlinePill deadline={goal.deadline} />
          </div>
          {goal.next_action && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 300 }}>Next: <span style={{ color: '#EFEFEF', fontWeight: 600 }}>{goal.next_action}</span></p>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 16, position: 'relative', zIndex: 1 }}>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${c.accent}, ${c.accent}99)`, borderRadius: 4, transition: 'width 0.6s ease', boxShadow: progress > 0 ? `0 0 8px ${c.accent}60` : 'none' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>{progress}% complete</span>
          <button type="button" onClick={e => { e.stopPropagation(); onLog() }} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', background: c.bg, color: c.accent, border: `1px solid ${c.border}`, transition: 'all 0.15s' }}>
            Log Progress
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── READING GOAL CARD ── */
function ReadingCard({ goal, books, onLog }: { goal: Goal; books: GoalBook[]; onLog: () => void }) {
  const progress = goal.progress ?? 0
  const booksTotal = parseInt(goal.why_it_matters ?? '') || 12
  const readBooks  = books.filter(b => b.status === 'read')
  const booksDone  = books.length > 0 ? readBooks.length : Math.round(progress / 100 * booksTotal)
  const booksLeft  = booksTotal - booksDone
  const currentBook = books.find(b => b.status === 'reading')

  const spines = Array.from({ length: booksDone }, (_, i) => ({
    color: SPINE_COLORS[i % SPINE_COLORS.length],
    height: 14 + (i * 7 % 9),
  }))

  return (
    <div className="card lift" style={{ padding: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer', borderLeft: '3px solid #38bdf8', background: 'linear-gradient(120deg,rgba(56,189,248,0.06) 0%,#111111 40%)' }} onClick={onLog}>
      <div style={{ position: 'absolute', top: -30, left: -20, width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(40px)', opacity: 0.5, background: '#38bdf8' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
        <div style={{ width: 68, height: 68, position: 'relative', flexShrink: 0 }}>
          <svg width="68" height="68" viewBox="0 0 68 68">
            <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
            <circle cx="34" cy="34" r="28" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round"
              strokeDasharray="175.9" strokeDashoffset={175.9 * (1 - progress / 100)}
              transform="rotate(-90 34 34)" style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 5px #38bdf8)' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: '#38bdf8', lineHeight: 1 }}>{booksDone}</p>
            <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.42)', fontWeight: 600, letterSpacing: '0.05em' }}>BOOKS</p>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 6 }}>{goal.title}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {goal.category && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: '#38bdf8', background: 'rgba(56,189,248,0.09)', border: '1px solid rgba(56,189,248,0.18)' }}>{categoryLabel(goal.category)}</span>}
            {goal.visibility && <span className={`vis-badge vis-${goal.visibility}`}>{VIS_LABEL[goal.visibility]}</span>}
            <DeadlinePill deadline={goal.deadline} />
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 36, overflow: 'hidden' }}>
            {readBooks.length > 0
              ? readBooks.slice(0, 18).map((b, i) => (
                  b.cover_url
                    ? <img key={b.id} src={b.cover_url} alt="" style={{ width: 24, height: 34, objectFit: 'cover', borderRadius: '2px 2px 0 0', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }} />
                    : <div key={b.id} style={{ width: 8, height: 14 + (i * 7 % 9), borderRadius: '2px 2px 0 0', flexShrink: 0, background: SPINE_COLORS[i % SPINE_COLORS.length], opacity: 0.85 }} />
                ))
              : spines.map((s, i) => (
                  <div key={i} style={{ width: 8, height: s.height, borderRadius: '2px 2px 0 0', flexShrink: 0, background: s.color, opacity: 0.85 }} />
                ))
            }
            {booksDone === 0 && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 300, lineHeight: '36px' }}>No books read yet</p>}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div>
          {(currentBook?.title ?? goal.next_action)
            ? <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 300 }}>Reading: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{currentBook?.title ?? goal.next_action}</span></p>
            : <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>Not currently reading</p>
          }
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{booksLeft} book{booksLeft !== 1 ? 's' : ''} left · {booksTotal} total</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button type="button" onClick={e => { e.stopPropagation(); onLog() }} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', background: 'rgba(56,189,248,0.09)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.18)', transition: 'all 0.15s' }}>
            My Books
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── LETTER TO SELF CARD ── */
function LetterCard({ goal, onCelebrate }: { goal: Goal; onCelebrate?: (data: CeremonyData) => void }) {
  const revealDate = goal.deadline ? new Date(goal.deadline + 'T12:00:00') : null
  const daysLeft   = revealDate ? Math.max(0, Math.ceil((revealDate.getTime() - Date.now()) / 86400000)) : null
  const unlocked   = daysLeft !== null && daysLeft === 0
  const [open, setOpen] = useState(false)
  const [textVisible, setTextVisible] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const [response, setResponse] = useState('')
  const [, startTransition] = useTransition()
  const router = useRouter()
  const seenKey = `letter-seen-${goal.id}`

  function handleOpen() {
    setOpen(true)
    const firstOpen = !localStorage.getItem(seenKey)
    if (firstOpen) {
      localStorage.setItem(seenKey, '1')
      setTimeout(() => {
        confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 }, colors: ['#d946ef', '#f0abfc', '#a78bfa', '#7c3aed', '#ffffff'] })
        setTimeout(() => confetti({ particleCount: 60, spread: 140, origin: { y: 0.35 }, colors: ['#d946ef', '#f0abfc', '#ffffff'] }), 400)
      }, 300)
    }
    setTimeout(() => setTextVisible(true), 600)
  }

  function handleClose() {
    setOpen(false)
    setTextVisible(false)
    setShowResponse(false)
  }

  function handleDoneReading() {
    handleClose()
    startTransition(async () => {
      const result = await completeGoal(goal.id)
      router.refresh()
      if (result?.success) {
        onCelebrate?.({
          goalTitle: result.goalTitle,
          xpGained: result.xpGained,
          newXP: result.newXP,
          newLevel: result.newLevel,
          leveledUp: result.leveledUp,
          earnedAchievements: result.earnedAchievements,
        })
      }
    })
  }

  return (
    <>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#080808', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0', flexShrink: 0 }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#d946ef', opacity: textVisible ? 1 : 0, transition: 'opacity 0.8s ease 0.4s' }}>LETTER TO SELF</p>
            <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.50)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Satoshi,sans-serif' }}>×</button>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', maxWidth: 600, width: '100%', margin: '0 auto' }}>
            {/* Date written for */}
            {revealDate && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginBottom: 32, opacity: textVisible ? 1 : 0, transition: 'opacity 0.8s ease 0.6s' }}>
                Sealed on {revealDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}

            {/* Letter text */}
            <div style={{ flex: 1, opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 1.2s ease 0.8s, transform 1.2s ease 0.8s' }}>
              <p style={{ fontSize: 18, color: '#E8E8E8', fontFamily: 'Georgia,serif', lineHeight: 2.0, whiteSpace: 'pre-wrap', fontWeight: 400 }}>
                {goal.why_it_matters ?? ''}
              </p>
            </div>

            {/* Actions */}
            <div style={{ marginTop: 48, opacity: textVisible ? 1 : 0, transition: 'opacity 0.8s ease 1.6s', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!showResponse ? (
                <button onClick={() => setShowResponse(true)} style={{ width: '100%', padding: '16px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(217,70,239,0.25),rgba(124,58,237,0.2))', border: '1px solid rgba(217,70,239,0.4)', color: '#f0abfc', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.02em' }}>
                  ✍️ Write a Response
                </button>
              ) : (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#d946ef', marginBottom: 10 }}>YOUR RESPONSE TO PAST YOU</p>
                  <textarea value={response} onChange={e => setResponse(e.target.value)} placeholder="What do you want to say back to the person who wrote this?" rows={5} style={{ width: '100%', borderRadius: 12, background: 'rgba(217,70,239,0.06)', border: '1px solid rgba(217,70,239,0.2)', color: '#E8E8E8', fontSize: 14, padding: '14px 16px', resize: 'none', outline: 'none', fontFamily: 'Georgia,serif', lineHeight: 1.8, boxSizing: 'border-box', marginBottom: 10 }} />
                </div>
              )}
              <button onClick={handleDoneReading} style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.58)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                ✓ Done — Mark as complete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="letter-card">
        <div style={{ height: 3, background: 'linear-gradient(90deg,#d946ef,#7c3aed)' }} />
        <div className="letter-sealed">
          <div className="letter-wax">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f0abfc" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.01em', marginBottom: 6 }}>Letter to Self</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', fontWeight: 300, marginBottom: 16 }}>Written and sealed · Private</p>
          {revealDate ? (
            <div style={{ background: 'rgba(217,70,239,0.07)', border: '1px solid rgba(217,70,239,0.2)', borderRadius: 12, padding: '12px 20px', marginBottom: 16, width: '100%' }}>
              {unlocked ? (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#22c55e', marginBottom: 4 }}>✓ UNLOCKED TODAY</p>
                  <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF' }}>Your letter is ready to read</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#d946ef', marginBottom: 4 }}>OPENS IN</p>
                  <p style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em' }}>{daysLeft} days</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', marginTop: 2 }}>
                    {revealDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div style={{ background: 'rgba(217,70,239,0.07)', border: '1px solid rgba(217,70,239,0.2)', borderRadius: 12, padding: '12px 20px', marginBottom: 16, width: '100%' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#d946ef', marginBottom: 4 }}>NO UNLOCK DATE SET</p>
            </div>
          )}
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', marginBottom: 14 }}>&ldquo;You&apos;ll know on that day whether you became who you said you would.&rdquo;</p>
          {unlocked && (
            <button onClick={handleOpen} style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(217,70,239,0.25),rgba(124,58,237,0.2))', border: '1px solid rgba(217,70,239,0.4)', color: '#f0abfc', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.04em', boxShadow: '0 0 24px rgba(217,70,239,0.2)' }}>
              ✉️ OPEN YOUR LETTER
            </button>
          )}
        </div>
      </div>
    </>
  )
}

/* ── BOOK SEARCH ── */
type BookResult = { id: string; title: string; author: string; cover: string | null; year: string }

function BookSearch({ onSelect }: { onSelect?: (book: BookResult | null) => void } = {}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookResult[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [selected, setSelected] = useState<BookResult | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function search(q: string) {
    if (q.trim().length < 2) { setResults([]); setDone(false); return }
    setLoading(true); setDone(false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function mapItunes(item: any): BookResult {
      return {
        id: String(item.trackId),
        title: item.trackName ?? '',
        author: item.artistName ?? '',
        cover: item.artworkUrl100?.replace('100x100bb', '300x300bb') ?? null,
        year: item.releaseDate ? String(new Date(item.releaseDate).getFullYear()) : '',
      }
    }

    Promise.allSettled([
      // Server-side proxy (tries Open Library then iTunes server-side)
      fetch(`/api/books?q=${encodeURIComponent(q)}`).then(r => r.json() as Promise<BookResult[]>),
      // Direct iTunes from browser — CORS-friendly, works regardless of server network
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=ebook&limit=7&country=us`)
        .then(r => r.json())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((d: any): BookResult[] => (d.results ?? []).map(mapItunes).filter((b: BookResult) => b.title)),
    ]).then(([srv, direct]) => {
      const a = srv.status === 'fulfilled' && Array.isArray(srv.value) ? srv.value as BookResult[] : []
      const b = direct.status === 'fulfilled' ? direct.value as BookResult[] : []
      setResults(a.length > 0 ? a : b)
    }).finally(() => { setLoading(false); setDone(true) })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v); setSelected(null); setDone(false)
    if (onSelect) onSelect(null)
    if (timer.current) clearTimeout(timer.current)
    if (v.trim().length < 2) { setResults([]); return }
    timer.current = setTimeout(() => search(v), 350)
  }

  function pick(book: BookResult) {
    setSelected(book); setResults([])
    if (onSelect) onSelect(book)
  }

  function clear() {
    setSelected(null); setQuery(''); setResults([]); setDone(false)
    if (onSelect) onSelect(null)
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const showResults = !selected && results.length > 0 && !loading
  const showEmpty   = !selected && done && !loading && results.length === 0 && query.trim().length >= 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Search input */}
      {!selected && (
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search by title or author…"
          className="cc-input"
          autoComplete="off"
        />
      )}

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[1, 0.7, 0.45].map((op, i) => (
            <div key={i} className="animate-pulse"
              style={{ height: 68, borderRadius: 12, background: `rgba(56,189,248,${op * 0.04})`, border: `1px solid rgba(56,189,248,${op * 0.08})` }} />
          ))}
        </div>
      )}

      {/* Results list — fully inline, no absolute/fixed positioning */}
      {showResults && (
        <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', background: '#0f0f0f' }}>
          {results.map((book, i) => (
            <button key={book.id} type="button" onClick={() => pick(book)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'none', border: 'none', borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', textAlign: 'left', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              {book.cover
                ? <img src={book.cover} alt="" style={{ width: 42, height: 60, objectFit: 'cover', borderRadius: 6, flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.7)' }} />
                : <div style={{ width: 42, height: 60, borderRadius: 6, background: 'linear-gradient(135deg,rgba(56,189,248,0.12),rgba(56,189,248,0.04))', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid rgba(56,189,248,0.1)' }}>📚</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                <p style={{ fontSize: 11, color: '#38bdf8', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>
                {book.year && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 300 }}>{book.year}</p>}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {showEmpty && (
        <div style={{ padding: '20px 16px', textAlign: 'center', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', marginBottom: 4 }}>No books found for &ldquo;{query}&rdquo;</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: 300 }}>Try a different title or author name</p>
        </div>
      )}

      {/* Selected book — large card */}
      {selected && (
        <div style={{ display: 'flex', gap: 18, padding: '18px 16px', borderRadius: 16, background: 'linear-gradient(135deg,rgba(56,189,248,0.07),rgba(56,189,248,0.02))', border: '1px solid rgba(56,189,248,0.25)' }}>
          {selected.cover
            ? <img src={selected.cover} alt="" style={{ width: 64, height: 90, objectFit: 'cover', borderRadius: 8, flexShrink: 0, boxShadow: '0 10px 28px rgba(0,0,0,0.7)' }} />
            : <div style={{ width: 64, height: 90, borderRadius: 8, background: 'linear-gradient(135deg,rgba(56,189,248,0.2),rgba(56,189,248,0.06))', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '1px solid rgba(56,189,248,0.2)' }}>📚</div>
          }
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#38bdf8', marginBottom: 8 }}>SELECTED</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.3, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</p>
            <p style={{ fontSize: 12, color: '#38bdf8', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.author}</p>
            {selected.year && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{selected.year}</p>}
            <button type="button" onClick={clear}
              style={{ marginTop: 12, alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.50)' }}>
              Change book
            </button>
          </div>
          {!onSelect && (
            <>
              <input type="hidden" name="next_action"    value={selected.title}      onChange={() => {}} />
              <input type="hidden" name="book_author"    value={selected.author}     onChange={() => {}} />
              <input type="hidden" name="book_cover_url" value={selected.cover ?? ''} onChange={() => {}} />
            </>
          )}
        </div>
      )}

    </div>
  )
}

// ── HABIT GOAL CARD ────────────────────────────────────────────────────────
function HabitCard({ goal, entries, onLog }: { goal: Goal; entries: GoalEntry[]; onLog: () => void }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const logDates = new Set(entries.map(e => String((e.content as { date?: string }).date ?? '')))
  const loggedToday = logDates.has(todayStr)
  const progress = goal.progress ?? 0

  // Last 7 days dots
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0]
    return { date: d, logged: logDates.has(d) }
  })

  // Current streak
  let streak = 0
  for (let i = 0; i < 90; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    if (logDates.has(d)) streak++
    else break
  }

  const freq = goal.next_action ?? 'daily'
  const freqLabel = freq === 'daily' ? 'Daily' : freq === 'weekdays' ? 'Weekdays' : freq === '5x' ? '5× / week' : '3× / week'

  return (
    <div className="card lift" style={{ padding: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer', borderLeft: '3px solid #4ade80', background: 'linear-gradient(120deg,rgba(74,222,128,0.07) 0%,#111111 40%)' }} onClick={onLog}>
      <div style={{ position: 'absolute', top: -30, left: -20, width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(40px)', opacity: 0.5, background: '#4ade80' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
        <div style={{ width: 68, height: 68, position: 'relative', flexShrink: 0 }}>
          <svg width="68" height="68" viewBox="0 0 68 68">
            <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
            <circle cx="34" cy="34" r="28" fill="none" stroke="#4ade80" strokeWidth="5" strokeLinecap="round"
              strokeDasharray="175.9" strokeDashoffset={175.9 * (1 - progress / 100)}
              transform="rotate(-90 34 34)" style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 5px #4ade80)' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{loggedToday ? '✅' : '🔄'}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 6 }}>{goal.title}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {goal.category && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: '#4ade80', background: 'rgba(74,222,128,0.09)', border: '1px solid rgba(74,222,128,0.18)' }}>{categoryLabel(goal.category)}</span>}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: 'rgba(255,255,255,0.58)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>{freqLabel}</span>
            {streak > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, color: '#fb923c', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}>🔥 {streak} day streak</span>
            )}
          </div>
          {/* Last 7 days */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {last7.map((d, i) => (
              <div key={i} style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: d.logged ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.04)', border: d.logged ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.2s', flexShrink: 0 }}>
                {d.logged && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
            ))}
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginLeft: 4, fontWeight: 600 }}>LAST 7 DAYS</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{progress}% consistency · {entries.length} total logs</p>
        <button type="button" onClick={e => { e.stopPropagation(); onLog() }} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', background: loggedToday ? 'rgba(74,222,128,0.05)' : 'rgba(74,222,128,0.15)', color: loggedToday ? 'rgba(255,255,255,0.35)' : '#4ade80', border: loggedToday ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(74,222,128,0.3)', transition: 'all 0.15s' }}>
          {loggedToday ? '✓ Logged' : 'Log Today'}
        </button>
      </div>
    </div>
  )
}

// ── SAVINGS GOAL CARD ───────────────────────────────────────────────────────
function SavingsCard({ goal, entries, onLog, onAdd }: { goal: Goal; entries: GoalEntry[]; onLog: () => void; onAdd: () => void }) {
  const target = parseFloat(goal.next_action ?? '0') || 0
  const saved = entries.reduce((s, e) => s + (parseFloat(String((e.content as { amount?: unknown }).amount ?? '0')) || 0), 0)
  const progress = goal.progress ?? 0
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(n)}`

  return (
    <div className="card lift" style={{ padding: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer', borderLeft: '3px solid #D4AF37', background: 'linear-gradient(120deg,rgba(212,175,55,0.07) 0%,#111111 40%)' }} onClick={onLog}>
      <div style={{ position: 'absolute', top: -30, left: -20, width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(40px)', opacity: 0.4, background: '#D4AF37' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 68, height: 68, borderRadius: 18, background: 'rgba(212,175,55,0.1)', border: '1.5px solid rgba(212,175,55,0.3)', flexShrink: 0 }}>
          <p style={{ fontSize: progress >= 100 ? 13 : 15, fontWeight: 900, color: '#D4AF37', lineHeight: 1 }}>{fmt(saved)}</p>
          <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.42)', fontWeight: 700, letterSpacing: '0.06em', marginTop: 3 }}>SAVED</p>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 6 }}>{goal.title}</p>
          {goal.category && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: '#D4AF37', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', display: 'inline-block', marginBottom: 10 }}>{categoryLabel(goal.category)}</span>}
          {/* Progress bar with amounts */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#D4AF37' }}>{fmt(saved)}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>of {target > 0 ? fmt(target) : '—'}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#D4AF37,#fbbf24)', transition: 'width 0.8s ease', boxShadow: '0 0 8px rgba(212,175,55,0.5)' }} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{entries.length} contribution{entries.length !== 1 ? 's' : ''} · {progress}% there</p>
        <button type="button" onClick={e => { e.stopPropagation(); onAdd() }} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)', transition: 'all 0.15s' }}>
          + Add Savings
        </button>
      </div>
    </div>
  )
}

// ── TRAVEL GOAL CARD ────────────────────────────────────────────────────────
function TravelCard({ goal, entries, onLog }: { goal: Goal; entries: GoalEntry[]; onLog: () => void }) {
  const dests = entries.filter(e => !['habit_log','contribution'].includes(e.type))
  const done = dests.filter(e => (e.content as { status?: string }).status === 'done')
  const booked = dests.filter(e => (e.content as { status?: string }).status === 'booked')
  const flags = dests.slice(0, 8).map(e => String((e.content as { flag?: string }).flag ?? ''))
  const progress = goal.progress ?? 0

  return (
    <div className="card lift" style={{ padding: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer', borderLeft: '3px solid #84cc16', background: 'linear-gradient(120deg,rgba(132,204,22,0.07) 0%,#111111 40%)' }} onClick={onLog}>
      <div style={{ position: 'absolute', top: -30, left: -20, width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(40px)', opacity: 0.5, background: '#84cc16' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 68, height: 68, borderRadius: 18, background: 'rgba(132,204,22,0.1)', border: '1.5px solid rgba(132,204,22,0.3)', flexShrink: 0 }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#a3e635', lineHeight: 1 }}>{done.length}</p>
          <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.42)', fontWeight: 700, letterSpacing: '0.06em', marginTop: 3 }}>VISITED</p>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 6 }}>{goal.title}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {done.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>✓ {done.length} visited</span>}
            {booked.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: '#38bdf8', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>✈ {booked.length} booked</span>}
            {dests.length > 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{dests.length} destinations</span>}
          </div>
          {/* Flag strip */}
          {flags.some(Boolean) ? (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {flags.map((f, i) => f ? <span key={i} style={{ fontSize: 20, lineHeight: 1 }}>{f}</span> : null)}
              {dests.length > 8 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', alignSelf: 'center' }}>+{dests.length - 8}</span>}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 300 }}>No destinations yet — tap to add your first</p>
          )}
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ height: 4, width: 120, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: '#84cc16', transition: 'width 0.8s' }} />
          </div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', marginTop: 4 }}>{progress}% of bucket list done</p>
        </div>
        <button type="button" onClick={e => { e.stopPropagation(); onLog() }} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', background: 'rgba(132,204,22,0.12)', color: '#a3e635', border: '1px solid rgba(132,204,22,0.25)', transition: 'all 0.15s' }}>
          + Add Destination
        </button>
      </div>
    </div>
  )
}

// ── HABIT TRACKER PANEL (modal) ─────────────────────────────────────────────
type EntryPanelProps = {
  goal: Goal
  entries: GoalEntry[]
  onAddEntry: (goalId: string, type: string, content: Record<string, unknown>) => void
  onRemoveEntry: (entryId: string, goalId: string) => void
  addingEntry: boolean
  setAddingEntry: (v: boolean) => void
  entryDraft: Record<string, string>
  setEntryDraft: (v: Record<string, string>) => void
  isPending: boolean
  accent: string
  entryError?: string | null
}

function HabitTrackerPanel({ goal, entries, onAddEntry, onRemoveEntry, addingEntry, setAddingEntry, entryDraft, setEntryDraft, isPending, accent }: EntryPanelProps) {
  const todayStr = new Date().toISOString().split('T')[0]
  const logDates = new Set(entries.map(e => String((e.content as { date?: string }).date ?? '')))
  const loggedToday = logDates.has(todayStr)

  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    if (logDates.has(d)) streak++
    else break
  }
  let bestStreak = 0, cur = 0
  const sortedDates = [...logDates].sort()
  for (let i = 0; i < sortedDates.length; i++) {
    const prev = sortedDates[i - 1]
    const diff = prev ? (new Date(sortedDates[i]).getTime() - new Date(prev).getTime()) / 86400000 : 1
    cur = diff <= 1.5 ? cur + 1 : 1
    bestStreak = Math.max(bestStreak, cur)
  }

  // 30-day heat map
  const today = new Date()
  const heat30 = Array.from({ length: 35 }, (_, i) => {
    const offset = i - (i % 7) + (today.getDay() - (34 - i) % 7 + 7) % 7
    const d = new Date(Date.now() - (34 - i) * 86400000)
    const key = d.toISOString().split('T')[0]
    return { key, day: d.getDate(), logged: logDates.has(key), future: d > today }
  })

  return (
    <div>
      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'STREAK', value: `${streak}`, sub: 'days' },
          { label: 'BEST', value: `${bestStreak}`, sub: 'days' },
          { label: 'TOTAL', value: `${entries.length}`, sub: 'logs' },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 14, background: `${accent}0a`, border: `1px solid ${accent}20`, padding: '12px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: accent, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Log today button */}
      {loggedToday ? (
        <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', textAlign: 'center', marginBottom: 18 }}>
          <p style={{ fontSize: 22, marginBottom: 4 }}>✅</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#4ade80' }}>Logged today!</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>Come back tomorrow to keep the streak going</p>
        </div>
      ) : (
        <div style={{ marginBottom: 18 }}>
          {addingEntry ? (
            <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', padding: '16px' }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>NOTE (OPTIONAL)</p>
              <input value={entryDraft.note ?? ''} onChange={e => setEntryDraft({ ...entryDraft, note: e.target.value })} placeholder="How did it go?" className="cc-input" style={{ fontSize: 13, marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setAddingEntry(false); setEntryDraft({}) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Cancel</button>
                <button onClick={() => onAddEntry(goal.id, 'habit_log', { date: todayStr, note: entryDraft.note ?? '' })} disabled={isPending}
                  style={{ flex: 2, padding: '10px', borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  {isPending ? 'Saving…' : '✓ Confirm Log'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingEntry(true)} style={{ width: '100%', padding: '18px', borderRadius: 16, background: `${accent}12`, border: `2px solid ${accent}30`, color: accent, fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.04em', boxShadow: `0 0 24px ${accent}15` }}>
              🔄 LOG TODAY
            </button>
          )}
        </div>
      )}

      {/* 35-day heat map */}
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>LAST 35 DAYS</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 20 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.22)', paddingBottom: 4 }}>{d}</div>)}
        {heat30.map((cell, i) => (
          <div key={i} style={{ aspectRatio: '1', borderRadius: 6, background: cell.future ? 'transparent' : cell.logged ? `${accent}30` : 'rgba(255,255,255,0.04)', border: cell.logged ? `1px solid ${accent}50` : cell.future ? 'none' : '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            {cell.logged && <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
        ))}
      </div>

      {/* Recent logs */}
      {entries.length > 0 && (
        <>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>RECENT LOGS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...entries].reverse().slice(0, 10).map(e => {
              const c = e.content as { date?: string; note?: string }
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: `${accent}18`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF' }}>{c.date ?? '—'}</p>
                    {c.note && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>{c.note}</p>}
                  </div>
                  <button onClick={() => onRemoveEntry(e.id, goal.id)} disabled={isPending} style={{ fontSize: 14, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }}
                    onMouseEnter={el => (el.currentTarget.style.color = '#f87171')}
                    onMouseLeave={el => (el.currentTarget.style.color = 'rgba(255,255,255,0.18)')}>×</button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── SAVINGS PANEL (modal) ───────────────────────────────────────────────────
function SavingsPanelModal({ goal, entries, onAddEntry, onRemoveEntry, addingEntry, setAddingEntry, entryDraft, setEntryDraft, isPending, accent, entryError }: EntryPanelProps) {
  const target = parseFloat(goal.next_action ?? '0') || 0
  const saved = entries.reduce((s, e) => s + (parseFloat(String((e.content as { amount?: unknown }).amount ?? '0')) || 0), 0)
  const progress = goal.progress ?? 0
  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const remaining = Math.max(0, target - saved)

  return (
    <div>
      {/* Big display */}
      <div style={{ borderRadius: 20, background: `linear-gradient(135deg,${accent}0d,${accent}06)`, border: `1px solid ${accent}22`, padding: '24px 22px', marginBottom: 18 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: accent, marginBottom: 12 }}>SAVINGS PROGRESS</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}>
          <p style={{ fontSize: 36, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.03em', lineHeight: 1 }}>{fmt(saved)}</p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', paddingBottom: 4 }}>of {target > 0 ? fmt(target) : '—'}</p>
        </div>
        {/* Thermometer progress bar */}
        <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg,${accent},${accent}cc)`, transition: 'width 0.8s', boxShadow: `0 0 10px ${accent}40` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: accent }}>{progress}%</span>
          {remaining > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{fmt(remaining)} to go</span>}
          {remaining === 0 && <span style={{ fontSize: 11, fontWeight: 800, color: '#4ade80' }}>🎉 Goal reached!</span>}
        </div>
      </div>

      {/* Add contribution */}
      {addingEntry ? (
        <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', padding: '16px', marginBottom: 18 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: accent, marginBottom: 12 }}>LOG CONTRIBUTION</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>AMOUNT ($)</p>
              <input type="number" min="0.01" step="0.01" value={entryDraft.amount ?? ''} onChange={e => setEntryDraft({ ...entryDraft, amount: e.target.value })} placeholder="500" className="cc-input" style={{ fontSize: 16, fontWeight: 700 }} />
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>DATE</p>
              <input type="date" value={entryDraft.date ?? new Date().toISOString().split('T')[0]} onChange={e => setEntryDraft({ ...entryDraft, date: e.target.value })} className="cc-input" style={{ fontSize: 13, colorScheme: 'dark' }} />
            </div>
          </div>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>NOTE (OPTIONAL)</p>
          <input value={entryDraft.note ?? ''} onChange={e => setEntryDraft({ ...entryDraft, note: e.target.value })} placeholder="e.g. Freelance project, Tax refund…" className="cc-input" style={{ fontSize: 13, marginBottom: 12 }} />
          {entryError && (
            <p style={{ fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
              {entryError.includes('goal_entries') ? '⚠️ Run the goal_entries.sql migration in Supabase first.' : `Error: ${entryError}`}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setAddingEntry(false); setEntryDraft({}) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Cancel</button>
            <button onClick={() => {
              const amt = parseFloat(entryDraft.amount ?? '0')
              if (!amt) return
              onAddEntry(goal.id, 'contribution', { amount: amt, note: entryDraft.note ?? '', date: entryDraft.date ?? new Date().toISOString().split('T')[0] })
            }} disabled={isPending || !entryDraft.amount} style={{ flex: 2, padding: '10px', borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
              {isPending ? 'Saving…' : '💰 Log Contribution'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingEntry(true)} style={{ width: '100%', padding: '14px', borderRadius: 14, background: `${accent}12`, border: `1px solid ${accent}30`, color: accent, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 18, letterSpacing: '0.04em' }}>
          + LOG CONTRIBUTION
        </button>
      )}

      {/* History */}
      {entries.length > 0 && (
        <>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>CONTRIBUTION HISTORY</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...entries].reverse().map(e => {
              const c = e.content as { amount?: unknown; note?: string; date?: string }
              const amt = parseFloat(String(c.amount ?? '0')) || 0
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: `${accent}12`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>💰</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: accent }}>{fmt(amt)}</p>
                    {c.note && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', fontWeight: 300 }}>{c.note}</p>}
                    {c.date && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{c.date}</p>}
                  </div>
                  <button onClick={() => onRemoveEntry(e.id, goal.id)} disabled={isPending} style={{ fontSize: 14, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }}
                    onMouseEnter={el => (el.currentTarget.style.color = '#f87171')}
                    onMouseLeave={el => (el.currentTarget.style.color = 'rgba(255,255,255,0.18)')}>×</button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── TRAVEL PANEL (modal) ────────────────────────────────────────────────────
type TravelPanelProps = EntryPanelProps & {
  onUpdateEntry: (entryId: string, goalId: string, content: Record<string, unknown>) => void
  editDestId: string | null
  setEditDestId: (v: string | null) => void
}

const DEST_STATUSES = [
  { key: 'dream',  label: 'Dream',  color: '#a78bfa', emoji: '✨' },
  { key: 'booked', label: 'Booked', color: '#38bdf8', emoji: '✈️' },
  { key: 'done',   label: 'Done',   color: '#4ade80', emoji: '✓'  },
]
const POPULAR_FLAGS = ['🇯🇵','🇫🇷','🇮🇹','🇬🇷','🇧🇷','🇲🇽','🇹🇭','🇵🇹','🇨🇷','🇿🇦','🇮🇳','🇳🇿','🇦🇺','🇵🇪','🇪🇸','🇮🇸','🇳🇴','🇰🇷','🇦🇷','🇩🇴']

function TravelPanelModal({ goal, entries, onAddEntry, onRemoveEntry, onUpdateEntry, addingEntry, setAddingEntry, entryDraft, setEntryDraft, editDestId, setEditDestId, isPending, accent }: TravelPanelProps) {
  const dests = entries
  const done   = dests.filter(e => (e.content as { status?: string }).status === 'done')
  const booked = dests.filter(e => (e.content as { status?: string }).status === 'booked')
  const dream  = dests.filter(e => (e.content as { status?: string }).status === 'dream')

  const groups = [
    { label: 'Done', items: done,   accent: '#4ade80' },
    { label: 'Booked', items: booked, accent: '#38bdf8' },
    { label: 'Dream', items: dream,  accent: '#a78bfa' },
  ]

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
        {[{ l: 'DREAM', n: dream.length, c: '#a78bfa', e: '✨' }, { l: 'BOOKED', n: booked.length, c: '#38bdf8', e: '✈️' }, { l: 'DONE', n: done.length, c: '#4ade80', e: '✓' }].map(s => (
          <div key={s.l} style={{ borderRadius: 14, background: `${s.c}0a`, border: `1px solid ${s.c}20`, padding: '12px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 4 }}>{s.l}</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.n}</p>
          </div>
        ))}
      </div>

      {/* Add destination */}
      {addingEntry ? (
        <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', padding: '16px', marginBottom: 18 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: accent, marginBottom: 12 }}>ADD DESTINATION</p>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>FLAG</p>
              <input value={entryDraft.flag ?? ''} onChange={e => setEntryDraft({ ...entryDraft, flag: e.target.value })} placeholder="🌍" className="cc-input" style={{ fontSize: 22, textAlign: 'center', padding: '8px 6px' }} maxLength={4} />
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>DESTINATION</p>
              <input value={entryDraft.name ?? ''} onChange={e => setEntryDraft({ ...entryDraft, name: e.target.value })} placeholder="Tokyo, Japan" className="cc-input" style={{ fontSize: 13 }} />
            </div>
          </div>
          {/* Flag picker */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {POPULAR_FLAGS.map(f => (
              <button key={f} type="button" onClick={() => setEntryDraft({ ...entryDraft, flag: f })}
                style={{ fontSize: 20, background: entryDraft.flag === f ? 'rgba(255,255,255,0.1)' : 'transparent', border: entryDraft.flag === f ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent', borderRadius: 8, padding: '4px 6px', cursor: 'pointer', lineHeight: 1 }}>
                {f}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>STATUS</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {DEST_STATUSES.map(s => (
              <button key={s.key} type="button" onClick={() => setEntryDraft({ ...entryDraft, status: s.key })}
                style={{ flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', background: entryDraft.status === s.key ? `${s.color}18` : 'rgba(255,255,255,0.03)', color: entryDraft.status === s.key ? s.color : 'rgba(255,255,255,0.42)', border: entryDraft.status === s.key ? `1px solid ${s.color}44` : '1px solid rgba(255,255,255,0.07)' }}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
          <input value={entryDraft.notes ?? ''} onChange={e => setEntryDraft({ ...entryDraft, notes: e.target.value })} placeholder="Notes (optional)…" className="cc-input" style={{ fontSize: 13, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setAddingEntry(false); setEntryDraft({}) }} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Cancel</button>
            <button onClick={() => {
              if (!entryDraft.name?.trim()) return
              onAddEntry(goal.id, 'destination', { name: entryDraft.name.trim(), flag: entryDraft.flag ?? '🌍', status: entryDraft.status ?? 'dream', notes: entryDraft.notes ?? '' })
            }} disabled={isPending || !entryDraft.name} style={{ flex: 2, padding: '10px', borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
              {isPending ? 'Saving…' : '✈️ Add Destination'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAddingEntry(true); setEntryDraft({ status: 'dream' }) }} style={{ width: '100%', padding: '13px', borderRadius: 14, background: `${accent}12`, border: `1px solid ${accent}30`, color: accent, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 18, letterSpacing: '0.04em' }}>
          + ADD DESTINATION
        </button>
      )}

      {/* Destination list grouped by status */}
      {dests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.filter(g => g.items.length > 0).map(group => (
            <div key={group.label}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{group.label.toUpperCase()} ({group.items.length})</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map(e => {
                  const c = e.content as { name?: string; flag?: string; status?: string; notes?: string }
                  const st = DEST_STATUSES.find(s => s.key === c.status) ?? DEST_STATUSES[0]
                  return (
                    <div key={e.id} style={{ borderRadius: 14, overflow: 'hidden', background: '#0d0d0d', border: `1px solid ${st.color}18` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                        <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{c.flag ?? '🌍'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.2 }}>{c.name}</p>
                          {c.notes && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 300, marginTop: 2 }}>{c.notes}</p>}
                        </div>
                        {/* Status cycle buttons */}
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {DEST_STATUSES.filter(s => s.key !== c.status).map(s => (
                            <button key={s.key} onClick={() => onUpdateEntry(e.id, goal.id, { ...c, status: s.key })} disabled={isPending}
                              style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 7, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: `${s.color}10`, color: s.color, border: `1px solid ${s.color}25`, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                              → {s.label}
                            </button>
                          ))}
                          <button onClick={() => onRemoveEntry(e.id, goal.id)} disabled={isPending}
                            style={{ fontSize: 14, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }}
                            onMouseEnter={el => (el.currentTarget.style.color = '#f87171')}
                            onMouseLeave={el => (el.currentTarget.style.color = 'rgba(255,255,255,0.18)')}>×</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {dests.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🌍</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No destinations yet</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 300 }}>Start building your bucket list above.</p>
        </div>
      )}
    </div>
  )
}

/* ── SHARED PROGRESS RING ── */
function ProgressRing({ progress, accent, text, label }: { progress: number; accent: string; text: string; label: string }) {
  return (
    <div style={{ width: 68, height: 68, position: 'relative', flexShrink: 0 }}>
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
        <circle cx="34" cy="34" r="28" fill="none" strokeWidth="5"
          stroke={accent} strokeLinecap="round"
          strokeDasharray="175.9" strokeDashoffset={175.9 * (1 - progress / 100)}
          transform="rotate(-90 34 34)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${accent})` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: text }}>{label}</p>
      </div>
    </div>
  )
}
