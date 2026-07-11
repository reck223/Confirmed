'use client'
import { useState, useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { createHabit, deleteHabit, toggleHabit } from './actions'

type Habit   = { id: string; name: string; icon: string; color: string; streak: number }
type HeatDay = { date: string; done: number; total: number }
type Props   = { habits: Habit[]; days: string[]; today: string; doneSet: string[]; heatmapDays: HeatDay[] }

const ICONS  = ['🏃','💪','📚','💧','🧘','🥗','😴','✍️','🎯','💊','🚫','🌿','🎨','🎵','🙏','💰','📵','🧹','🛁','🌅']
const COLORS = ['#4ade80','#38bdf8','#a78bfa','#f472b6','#fb923c','#fbbf24','#f87171','#34d399','#60a5fa','#c084fc']

function dayLabel(d: string, today: string) {
  if (d === today) return 'Today'
  const diff = Math.round((new Date(today).getTime() - new Date(d).getTime()) / 86400000)
  if (diff === 1) return 'Yest'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

export function HabitsClient({ habits: initHabits, days, today, doneSet: initDone, heatmapDays }: Props) {
  const [doneSet, setDoneSet] = useState(() => new Set(initDone))
  const [habits, setHabits]   = useState(initHabits)
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName]       = useState('')
  const [icon, setIcon]       = useState('✅')
  const [color, setColor]     = useState('#4ade80')
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [, startT] = useTransition()

  const todayDone  = habits.filter(h => doneSet.has(`${h.id}|${today}`)).length
  const todayTotal = habits.length
  const pct        = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0

  function toggle(habitId: string, date: string) {
    if (date !== today) return // only toggle today
    const key = `${habitId}|${date}`
    const isDone = doneSet.has(key)
    setDoneSet(prev => {
      const next = new Set(prev)
      isDone ? next.delete(key) : next.add(key)
      return next
    })
    // update streak optimistically
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h
      return { ...h, streak: isDone ? Math.max(0, h.streak - 1) : h.streak + 1 }
    }))
    startT(async () => { await toggleHabit(habitId, date, isDone) })
  }

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    const newH = { id: crypto.randomUUID(), name: name.trim(), icon, color, streak: 0 }
    setHabits(prev => [...prev, newH])
    setShowAdd(false); setName(''); setIcon('✅'); setColor('#4ade80')
    await createHabit(name.trim(), icon, color)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    setHabits(prev => prev.filter(h => h.id !== id))
    await deleteHabit(id)
    setDeleting(null)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop    { 0%{transform:scale(1)} 50%{transform:scale(1.35)} 100%{transform:scale(1)} }
        .habit-dot { cursor:pointer; transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1); }
        .habit-dot:active { transform:scale(0.85)!important; }
      `}</style>

      {/* Back */}
      <div style={{ paddingTop: 4, paddingBottom: 20, animation: 'fadeUp 0.3s ease both' }}>
        <Link href="/tools" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>← Tools</Link>
      </div>

      {/* Header + ring */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, animation: 'fadeUp 0.35s 0.05s ease both' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 4 }}>Habits</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            {todayTotal ? `${todayDone} of ${todayTotal} done today` : 'Add your first habit below'}
          </p>
        </div>

        {/* Completion ring */}
        {todayTotal > 0 && (
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
              <circle cx="32" cy="32" r="26" fill="none"
                stroke={pct === 100 ? '#4ade80' : '#D4AF37'}
                strokeWidth="5" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 26}
                strokeDashoffset={2 * Math.PI * 26 * (1 - pct / 100)}
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: pct === 100 ? '#4ade80' : '#EFEFEF' }}>{pct}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Day headers */}
      {habits.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${days.length}, 36px)`, gap: 6, alignItems: 'center', marginBottom: 8, paddingRight: 2 }}>
          <div />
          {days.map(d => (
            <div key={d} style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: d === today ? '#D4AF37' : 'rgba(255,255,255,0.18)' }}>
                {dayLabel(d, today).toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Habit rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {habits.map((h, idx) => (
          <div key={h.id} style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${days.length}, 36px)`, gap: 6, alignItems: 'center', borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px 12px 16px', animation: `fadeUp 0.35s ${idx * 0.04}s ease both` }}>
            {/* Habit info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 20 }}>{h.icon}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{h.name}</p>
                {h.streak > 0 && (
                  <p style={{ fontSize: 10, color: h.color, fontWeight: 700 }}>🔥 {h.streak}-day streak</p>
                )}
              </div>
            </div>

            {/* Day dots */}
            {days.map(d => {
              const done = doneSet.has(`${h.id}|${d}`)
              const isToday = d === today
              return (
                <div
                  key={d}
                  className={isToday ? 'habit-dot' : ''}
                  onClick={() => toggle(h.id, d)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', margin: '0 auto',
                    background: done ? h.color : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${done ? h.color : isToday ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: done ? `0 0 10px ${h.color}55` : 'none',
                    cursor: isToday ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s ease, box-shadow 0.2s ease',
                    animation: done && isToday ? 'pop 0.3s ease' : 'none',
                  }}
                >
                  {done && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Add habit button */}
      <button
        onClick={() => setShowAdd(true)}
        style={{ width: '100%', padding: '15px 0', borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.28)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Satoshi,sans-serif' }}
      >
        <span style={{ fontSize: 18 }}>+</span> Add Habit
      </button>

      {/* ── CONSISTENCY HEATMAP ── */}
      {heatmapDays.length > 0 && habits.length > 0 && (() => {
        // Group 84 days into 12 columns of 7 (oldest week first, Mon–Sun rows)
        // heatmapDays[0] is 83 days ago (oldest), [83] is today
        // We need to pad the oldest week so it aligns Mon=0 … Sun=6
        const todayJs    = new Date(today + 'T12:00:00').getDay() // 0=Sun
        const todayRow   = (todayJs + 6) % 7                       // 0=Mon…6=Sun
        // total cells = 12 weeks * 7 = 84, but we need a start offset
        // The last column ends on today (row=todayRow), so the grid has
        // (84 + todayRow) cells across 12 columns if today isn't Sunday.
        // Simplest: just render a flat grid where index 0 is oldest day.
        const totalWeeks = 12
        const cells: (HeatDay | null)[] = Array(totalWeeks * 7).fill(null)
        // fill from the end: last cell = today
        const end = totalWeeks * 7 - 1 - (6 - todayRow)
        heatmapDays.forEach((d, i) => { const pos = end - (83 - i); if (pos >= 0 && pos < totalWeeks * 7) cells[pos] = d })

        const cellColor = (d: HeatDay | null) => {
          if (!d || d.total === 0) return '#111'
          const pct = d.done / d.total
          if (pct === 0) return '#161616'
          if (pct < 0.34) return 'rgba(74,222,128,0.2)'
          if (pct < 0.67) return 'rgba(74,222,128,0.5)'
          return '#4ade80'
        }

        const DAY_LABELS = ['M','T','W','T','F','S','S']
        const totalDone   = heatmapDays.filter(d => d.done === d.total && d.total > 0).length
        const activeDays  = heatmapDays.filter(d => d.done > 0).length

        return (
          <div style={{ marginBottom: 32, animation: 'fadeUp 0.4s 0.15s ease both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.22)', marginBottom: 4 }}>CONSISTENCY — 12 WEEKS</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{activeDays} active days · {totalDone} perfect days</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: '#161616', border: '1px solid #222' }} />
                <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(74,222,128,0.2)' }} />
                <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(74,222,128,0.5)' }} />
                <div style={{ width: 10, height: 10, borderRadius: 3, background: '#4ade80' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {/* Day labels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 1, flexShrink: 0 }}>
                {DAY_LABELS.map((l, i) => (
                  <div key={i} style={{ width: 10, height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 7, fontWeight: 800, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.05em' }}>{l}</span>
                  </div>
                ))}
              </div>
              {/* Grid: 12 columns × 7 rows */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${totalWeeks}, 1fr)`, gridTemplateRows: 'repeat(7, 10px)', gap: 3, flex: 1 }}>
                {cells.map((d, i) => {
                  const isToday = d?.date === today
                  return (
                    <div
                      key={i}
                      title={d ? `${d.date}: ${d.done}/${d.total}` : ''}
                      style={{
                        width: '100%', height: 10, borderRadius: 3,
                        background: cellColor(d),
                        border: isToday ? '1px solid rgba(74,222,128,0.6)' : 'none',
                        boxShadow: isToday ? '0 0 6px rgba(74,222,128,0.4)' : 'none',
                        transition: 'background 0.2s',
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete row — shown as long-press hint (simplified: trash icon per row on hover) */}
      {habits.length > 0 && (
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', marginBottom: 4 }}>MANAGE HABITS</p>
          {habits.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)' }}>{h.icon} {h.name}</span>
              <button
                onClick={() => handleDelete(h.id)}
                disabled={deleting === h.id}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', cursor: 'pointer', fontSize: 16, padding: 4 }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add habit modal */}
      {showAdd && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px 16px' }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF' }}>New Habit</p>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Name */}
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Habit name…"
              style={{ width: '100%', padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 15, fontWeight: 600, marginBottom: 20, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none' }}
            />

            {/* Icon picker */}
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>ICON</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)} style={{ width: 40, height: 40, borderRadius: 12, background: icon === ic ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${icon === ic ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.07)'}`, fontSize: 20, cursor: 'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>

            {/* Color picker */}
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>COLOR</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${color === c ? '#fff' : 'transparent'}`, cursor: 'pointer', boxShadow: color === c ? `0 0 12px ${c}` : 'none', transition: 'all 0.2s ease' }} />
              ))}
            </div>

            <button
              onClick={handleAdd}
              disabled={!name.trim() || saving}
              style={{ width: '100%', padding: '15px 0', borderRadius: 16, background: name.trim() ? `linear-gradient(135deg, ${color}, ${color}aa)` : 'rgba(255,255,255,0.05)', border: 'none', fontSize: 14, fontWeight: 800, color: name.trim() ? '#0A0A0A' : 'rgba(255,255,255,0.28)', cursor: name.trim() ? 'pointer' : 'not-allowed', letterSpacing: '0.04em', fontFamily: 'Satoshi,sans-serif' }}
            >
              {saving ? 'SAVING…' : 'ADD HABIT'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
