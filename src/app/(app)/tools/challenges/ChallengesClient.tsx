'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createChallenge, deleteChallenge, toggleChallengeLog } from './actions'
import ShareToFeedSheet from '@/components/ShareToFeedSheet'

type CLog = { log_date: string; note: string | null }
type Challenge = {
  id: string; title: string; description: string | null; category: string | null
  goal_id: string | null; duration_days: number; start_date: string
  logs: CLog[]; streak: number; daysLogged: number
}
type Goal = { id: string; title: string }

const CATS = ['health','career','business','finance','learning','creative','relationships','personal','adventure','spiritual']
const CAT_META: Record<string, { color: string; bg: string; border: string; emoji: string }> = {
  health:        { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)',   emoji: '💪' },
  career:        { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.25)',  emoji: '🚀' },
  business:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)',  emoji: '💼' },
  finance:       { color: '#D4AF37', bg: 'rgba(212,175,55,0.12)',  border: 'rgba(212,175,55,0.25)',  emoji: '💰' },
  learning:      { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.25)',  emoji: '📚' },
  creative:      { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.25)',  emoji: '🎨' },
  relationships: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.25)',   emoji: '❤️' },
  personal:      { color: '#14b8a6', bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.25)',  emoji: '⭐' },
  adventure:     { color: '#84cc16', bg: 'rgba(132,204,22,0.12)',  border: 'rgba(132,204,22,0.25)',  emoji: '🌍' },
  spiritual:     { color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)', emoji: '🧘' },
}
const DEFAULT_META = { color: '#EFEFEF', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', emoji: '🎯' }
function catMeta(cat: string | null) { return CAT_META[cat ?? ''] ?? DEFAULT_META }

function buildCalendar(startDate: string, durationDays: number, logSet: Set<string>, today: string) {
  const cells: { date: string; state: 'logged' | 'missed' | 'future' | 'pending' }[] = []
  const start = new Date(startDate + 'T12:00:00')
  const end   = new Date(start); end.setDate(start.getDate() + durationDays - 1)
  const endDate = end.toISOString().split('T')[0]
  const showFrom = today > endDate ? startDate : (() => {
    const f = new Date(today + 'T12:00:00'); f.setDate(f.getDate() - 29)
    const fs = f.toISOString().split('T')[0]
    return fs > startDate ? fs : startDate
  })()
  const cur = new Date(showFrom + 'T12:00:00')
  const last = new Date((today > endDate ? endDate : today) + 'T12:00:00')
  while (cur <= last) {
    const ds = cur.toISOString().split('T')[0]
    const state = logSet.has(ds) ? 'logged' : ds === today ? 'pending' : ds > today ? 'future' : 'missed'
    cells.push({ date: ds, state })
    cur.setDate(cur.getDate() + 1)
  }
  return cells
}

const BASE: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
  color: '#EFEFEF', fontSize: 14, fontFamily: 'Satoshi,sans-serif', outline: 'none',
}
const TA: React.CSSProperties  = { ...BASE, resize: 'none' }
const INP: React.CSSProperties = { ...BASE }
const LBL: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }

export function ChallengesClient({
  challenges: init,
  goals,
  today,
}: {
  challenges: (Challenge)[]
  goals: Goal[]
  today: string
}) {
  const [challenges, setChallenges] = useState(init)
  const [view, setView] = useState<'list' | 'create'>('list')
  const [, startT] = useTransition()

  // form
  const [title, setTitle]         = useState('')
  const [desc, setDesc]           = useState('')
  const [cat, setCat]             = useState('health')
  const [dur, setDur]             = useState(30)
  const [startDate, setStartDate] = useState(today)
  const [goalId, setGoalId]       = useState('')
  const [creating, setCreating]   = useState(false)

  // per-challenge optimistic state
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [toggling, setToggling]   = useState<string | null>(null)
  const [shareCaption, setShareCaption] = useState<string | null>(null)

  function resetForm() {
    setTitle(''); setDesc(''); setCat('health'); setDur(30); setStartDate(today); setGoalId('')
  }

  function handleCreate() {
    if (!title.trim()) return
    setCreating(true)
    startT(async () => {
      await createChallenge(title.trim(), desc.trim(), cat, dur, startDate, goalId || null)
      resetForm(); setView('list'); setCreating(false)
    })
  }

  function handleDelete(id: string) {
    setDeleting(id)
    startT(async () => {
      await deleteChallenge(id)
      setChallenges(prev => prev.filter(c => c.id !== id))
      setDeleting(null)
    })
  }

  function handleToggle(challengeId: string, date: string, isLogged: boolean) {
    setToggling(challengeId)
    startT(async () => {
      await toggleChallengeLog(challengeId, date, isLogged)
      setChallenges(prev => prev.map(c => {
        if (c.id !== challengeId) return c
        const logs = isLogged
          ? c.logs.filter(l => l.log_date !== date)
          : [...c.logs, { log_date: date, note: null }]
        const logSet = new Set(logs.map(l => l.log_date))
        let streak = 0
        const base = new Date(today)
        for (let i = 0; i < 90; i++) {
          const d = new Date(base); d.setDate(base.getDate() - i)
          const ds = d.toISOString().split('T')[0]
          if (ds < c.start_date) break
          if (logSet.has(ds)) streak++
          else break
        }
        const updated = { ...c, logs, streak, daysLogged: logs.length }
        // Trigger share prompt on milestone days when logging (not un-logging)
        if (!isLogged) {
          const milestones = [7, 14, 21, 30, updated.duration_days]
          if (milestones.includes(updated.daysLogged)) {
            const emoji = CAT_META[c.category ?? 'health']?.emoji ?? '🔥'
            setShareCaption(`${emoji} Day ${updated.daysLogged} of my ${c.title} challenge — ${updated.daysLogged === c.duration_days ? "I completed the full challenge! 🏆" : `${c.duration_days - updated.daysLogged} days to go. The chain stays unbroken. 🔥`}`)
          }
        }
        return updated
      }))
      setToggling(null)
    })
  }

  const meta = catMeta(cat)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
      `}</style>

      {/* Header */}
      <div style={{ paddingTop: 4, paddingBottom: 20, animation: 'fadeUp 0.3s ease both' }}>
        <Link href="/tools" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>← Tools</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, animation: 'fadeUp 0.35s 0.05s ease both' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 4 }}>Challenges</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{challenges.length} active challenge{challenges.length !== 1 ? 's' : ''}</p>
        </div>
        {view === 'list' ? (
          <button onClick={() => setView('create')} style={{ padding: '11px 18px', borderRadius: 16, background: 'linear-gradient(135deg,#D4AF37,#f97316)', border: 'none', fontSize: 13, fontWeight: 900, color: '#080808', cursor: 'pointer', letterSpacing: '0.03em', fontFamily: 'Satoshi,sans-serif' }}>
            + New
          </button>
        ) : (
          <button onClick={() => { setView('list'); resetForm() }} style={{ padding: '11px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
            Cancel
          </button>
        )}
      </div>

      {/* Create Form */}
      {view === 'create' && (
        <div style={{ borderRadius: 24, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 20px', marginBottom: 24, animation: 'fadeUp 0.3s ease both' }}>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF', marginBottom: 20 }}>New Challenge</p>

          <p style={LBL}>TITLE</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Cold showers every day" style={{ ...INP, marginBottom: 16 }} />

          <p style={LBL}>DESCRIPTION (optional)</p>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Why this challenge matters…" rows={2} style={{ ...TA, marginBottom: 16 }} />

          <p style={LBL}>CATEGORY</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {CATS.map(c => {
              const m = CAT_META[c]
              const active = cat === c
              return (
                <button key={c} onClick={() => setCat(c)} style={{ padding: '6px 12px', borderRadius: 10, background: active ? m.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? m.border : 'rgba(255,255,255,0.07)'}`, fontSize: 11, fontWeight: 700, color: active ? m.color : 'rgba(255,255,255,0.35)', cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'Satoshi,sans-serif' }}>
                  {m.emoji} {c}
                </button>
              )
            })}
          </div>

          <p style={LBL}>DURATION</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[30, 60, 90].map(d => (
              <button key={d} onClick={() => setDur(d)} style={{ padding: '12px 0', borderRadius: 12, background: dur === d ? meta.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${dur === d ? meta.border : 'rgba(255,255,255,0.07)'}`, fontSize: 14, fontWeight: 800, color: dur === d ? meta.color : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                {d}<span style={{ fontSize: 10, fontWeight: 600 }}> days</span>
              </button>
            ))}
          </div>

          <p style={LBL}>START DATE</p>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...INP, marginBottom: 16, colorScheme: 'dark' }} />

          {goals.length > 0 && (
            <>
              <p style={LBL}>LINK TO GOAL (optional)</p>
              <select value={goalId} onChange={e => setGoalId(e.target.value)} style={{ ...INP, marginBottom: 16, appearance: 'none' }}>
                <option value="">— No goal —</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </>
          )}

          <button onClick={handleCreate} disabled={!title.trim() || creating} style={{ width: '100%', padding: '15px 0', borderRadius: 16, background: title.trim() ? `linear-gradient(135deg,${meta.color},${meta.color}99)` : 'rgba(255,255,255,0.04)', border: 'none', fontSize: 15, fontWeight: 900, color: title.trim() ? '#080808' : 'rgba(255,255,255,0.2)', cursor: title.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.03em' }}>
            {creating ? 'CREATING…' : `START ${dur}-DAY CHALLENGE`}
          </button>
        </div>
      )}

      {/* Empty state */}
      {view === 'list' && challenges.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'fadeUp 0.4s 0.1s ease both' }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>🏆</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#EFEFEF', marginBottom: 8 }}>No challenges yet</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, marginBottom: 24 }}>Pick one thing to do every day for 30, 60, or 90 days.</p>
          <button onClick={() => setView('create')} style={{ padding: '13px 28px', borderRadius: 16, background: 'linear-gradient(135deg,#D4AF37,#f97316)', border: 'none', fontSize: 13, fontWeight: 800, color: '#080808', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
            Create Your First Challenge
          </button>
        </div>
      )}

      {/* Challenge cards */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {challenges.map((c, i) => {
            const m = catMeta(c.category)
            const logSet = new Set(c.logs.map(l => l.log_date))
            const todayLogged = logSet.has(today)
            const cells = buildCalendar(c.start_date, c.duration_days, logSet, today)
            const elapsed = Math.max(0, Math.floor((new Date(today + 'T12:00:00').getTime() - new Date(c.start_date + 'T12:00:00').getTime()) / 86400000) + 1)
            const dayNum  = Math.min(elapsed, c.duration_days)
            const pct     = Math.round((c.daysLogged / c.duration_days) * 100)
            const endDate = new Date(c.start_date + 'T12:00:00'); endDate.setDate(endDate.getDate() + c.duration_days - 1)
            const endStr  = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const done    = dayNum >= c.duration_days

            return (
              <div key={c.id} style={{ borderRadius: 22, background: '#0d0d0d', border: `1px solid ${m.border}`, overflow: 'hidden', animation: `fadeUp 0.35s ${i*0.06}s ease both` }}>
                {/* Top accent */}
                <div style={{ height: 3, background: `linear-gradient(90deg,${m.color},${m.color}55)` }} />

                <div style={{ padding: '16px 18px 20px' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: m.bg, color: m.color, border: `1px solid ${m.border}`, textTransform: 'capitalize', letterSpacing: '0.04em' }}>
                          {m.emoji} {c.category ?? 'general'}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{c.duration_days}d</span>
                        {done && <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>✓ Complete</span>}
                      </div>
                      <p style={{ fontSize: 17, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{c.title}</p>
                      {c.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4, lineHeight: 1.5 }}>{c.description}</p>}
                    </div>
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.18)', cursor: 'pointer', fontSize: 15, padding: '2px 4px', flexShrink: 0, marginLeft: 8 }}>🗑</button>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', marginBottom: 2 }}>PROGRESS</p>
                      <p style={{ fontSize: 15, fontWeight: 900, color: '#EFEFEF' }}>{c.daysLogged}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>/{c.duration_days} days</span></p>
                    </div>
                    {c.streak > 0 && (
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', marginBottom: 2 }}>STREAK</p>
                        <p style={{ fontSize: 15, fontWeight: 900, color: '#f97316' }}>🔥 {c.streak}</p>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', marginBottom: 2 }}>DAY</p>
                      <p style={{ fontSize: 15, fontWeight: 900, color: '#EFEFEF' }}>{dayNum}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>/{c.duration_days}</span></p>
                    </div>
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', marginBottom: 2 }}>ENDS</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>{endStr}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginBottom: 14, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: `linear-gradient(90deg,${m.color},${m.color}aa)`, transition: 'width 0.5s ease' }} />
                  </div>

                  {/* Calendar strip */}
                  {cells.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 16 }}>
                      {cells.map(cell => (
                        <div key={cell.date} title={cell.date} style={{
                          width: 10, height: 10, borderRadius: 3,
                          background: cell.state === 'logged'  ? m.color
                                    : cell.state === 'pending' ? 'rgba(255,255,255,0.12)'
                                    : cell.state === 'missed'  ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(255,255,255,0.02)',
                          border: cell.state === 'pending' ? '1px solid rgba(255,255,255,0.15)' : 'none',
                        }} />
                      ))}
                    </div>
                  )}

                  {/* Goal link */}
                  {c.goal_id && (
                    <div style={{ marginBottom: 12 }}>
                      <Link href={`/goals?goal=${c.goal_id}`} style={{ fontSize: 11, color: m.color, fontWeight: 700, textDecoration: 'none', opacity: 0.8 }}>→ Linked to goal</Link>
                    </div>
                  )}

                  {/* Check-in button */}
                  {!done && (
                    <button
                      onClick={() => handleToggle(c.id, today, todayLogged)}
                      disabled={toggling === c.id}
                      style={{
                        width: '100%', padding: '13px 0', borderRadius: 14,
                        fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif',
                        letterSpacing: '0.03em',
                        background: todayLogged ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg,${m.color},${m.color}aa)`,
                        color: todayLogged ? 'rgba(255,255,255,0.4)' : '#080808',
                        border: todayLogged ? '1px solid rgba(255,255,255,0.08)' : 'none',
                        transition: 'all 0.2s ease',
                        animation: toggling === c.id ? 'pulse 0.6s infinite' : 'none',
                      }}
                    >
                      {toggling === c.id ? '…' : todayLogged ? '✓ Checked in today' : '+ Check In Today'}
                    </button>
                  )}
                  {done && (
                    <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#D4AF37' }}>
                      🏆 Challenge Complete! {c.daysLogged}/{c.duration_days} days logged
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {shareCaption !== null && <ShareToFeedSheet defaultCaption={shareCaption} onClose={() => setShareCaption(null)} />}
    </div>
  )
}
