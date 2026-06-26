'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createGoal, updateGoalProgress, completeGoal } from './actions'
import { CATEGORIES } from '@/lib/categories'
import type { Goal } from '@/lib/types/database'

const CATEGORY_COLOR: Record<string, { accent: string; bg: string; border: string; text: string }> = {
  health:        { accent: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   text: '#4ade80' },
  finance:       { accent: '#D4AF37', bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.22)', text: '#D4AF37' },
  career:        { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)',  text: '#a78bfa' },
  learning:      { accent: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.2)',  text: '#7dd3fc' },
  creative:      { accent: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  text: '#fb923c' },
  relationships: { accent: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)', text: '#f9a8d4' },
}

function catColor(category: string | null) {
  return CATEGORY_COLOR[category ?? ''] ?? { accent: '#D4AF37', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.22)', text: '#D4AF37' }
}

export function GoalsClient({ goals }: { goals: Goal[] }) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  const active = goals.filter(g => g.status === 'active')
  const complete = goals.filter(g => g.status === 'complete')

  function handleSubmit(formData: FormData) {
    setError('')
    startTransition(async () => {
      const result = await createGoal(formData)
      if (result.error) { setError(result.error); return }
      setShowForm(false)
      router.refresh()
    })
  }

  function handleProgress(goalId: string, progress: number) {
    startTransition(async () => {
      await updateGoalProgress(goalId, progress)
      router.refresh()
    })
  }

  function handleComplete(goalId: string) {
    startTransition(async () => {
      await completeGoal(goalId)
      router.refresh()
    })
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }} className="view-panel">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>YOUR GOALS</p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            What you&apos;re<br />building.
          </h1>
          <p style={{ fontSize: 12, color: '#555', fontWeight: 300, marginTop: 6 }}>
            {active.length} active · {complete.length} complete
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-gold" style={{ width: 'auto', padding: '10px 18px', fontSize: 11 }}>+ NEW GOAL</button>
      </div>

      {/* Active goals */}
      {active.length === 0 ? (
        <div style={{ borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(135deg,rgba(212,175,55,0.1) 0%,rgba(212,175,55,0.04) 100%)', border: '1px solid rgba(212,175,55,0.25)', padding: '32px 24px', textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 36, marginBottom: 14 }}>🎯</p>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', marginBottom: 8 }}>No goals yet</h3>
          <p style={{ fontSize: 13, color: '#666', fontWeight: 300, marginBottom: 20 }}>Add your first goal to start tracking your progress.</p>
          <button onClick={() => setShowForm(true)} className="btn-gold" style={{ width: 'auto', padding: '12px 24px' }}>ADD YOUR FIRST GOAL</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {active.map(goal => <GoalCard key={goal.id} goal={goal} onProgress={handleProgress} onComplete={handleComplete} />)}
        </div>
      )}

      {/* Completed goals */}
      {complete.length > 0 && (
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', marginBottom: 12 }}>COMPLETED</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {complete.map(goal => {
              const c = catColor(goal.category)
              return (
                <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(34,197,94,0.12)', background: 'rgba(34,197,94,0.04)', opacity: 0.7 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</p>
                    {goal.completed_date && <p style={{ fontSize: 10, color: '#555', marginTop: 2 }}>Completed {goal.completed_date}</p>}
                  </div>
                  {goal.category && (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 6, background: c.bg, color: c.text, border: `1px solid ${c.border}`, flexShrink: 0 }}>
                      {goal.category.toUpperCase()}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} className="md:items-center md:p-4">
          <div style={{ width: '100%', maxWidth: 520, borderRadius: '24px 24px 0 0', background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: 24, maxHeight: '90vh', overflowY: 'auto' }} className="md:rounded-3xl">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 4 }}>NEW GOAL</p>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF' }}>Set your intention</h2>
              </div>
              <button onClick={() => setShowForm(false)} style={{ fontSize: 24, color: '#555', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
            </div>

            <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>WHAT&apos;S YOUR GOAL?</label>
                <input name="title" required placeholder="e.g. Run a half marathon" className="cc-input" style={{ fontSize: 15 }} />
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>CATEGORY</label>
                <select name="category" className="cc-input" style={{ fontSize: 14 }}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>WHY DOES THIS MATTER?</label>
                <textarea name="why" rows={3} placeholder="What will achieving this change for you?" className="cc-input" />
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>FIRST NEXT ACTION</label>
                <input name="next_action" placeholder="e.g. Sign up for a local 5k" className="cc-input" style={{ fontSize: 14 }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>DEADLINE</label>
                  <input name="deadline" type="date" className="cc-input" style={{ fontSize: 14 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>VISIBILITY</label>
                  <select name="visibility" className="cc-input" style={{ fontSize: 14 }}>
                    <option value="circle">👥 Circle</option>
                    <option value="private">🔒 Private</option>
                    <option value="public">🌍 Public</option>
                  </select>
                </div>
              </div>
              {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
              <button type="submit" disabled={isPending} className="btn-gold" style={{ marginTop: 8 }}>
                {isPending ? 'SAVING...' : 'ADD GOAL'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function GoalCard({ goal, onProgress, onComplete }: {
  goal: Goal
  onProgress: (id: string, p: number) => void
  onComplete: (id: string) => void
}) {
  const [showDetail, setShowDetail] = useState(false)
  const c = catColor(goal.category)
  const progress = goal.progress ?? 0

  return (
    <>
      <div onClick={() => setShowDetail(true)} className="card lift" style={{ padding: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer', borderLeft: `3px solid ${c.accent}`, background: `linear-gradient(120deg,${c.bg} 0%,#111111 40%)` }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: -30, left: -20, width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(40px)', opacity: 0.5, background: c.accent }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {goal.category && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 6, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                    {goal.category.toUpperCase()}
                  </span>
                )}
                {goal.visibility && (
                  <span className={`vis-${goal.visibility}`} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>
                    {goal.visibility === 'circle' ? '👥 Circle' : goal.visibility === 'private' ? '🔒 Private' : '🌍 Public'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 4 }}>{goal.title}</p>
              {goal.next_action && (
                <p style={{ fontSize: 12, color: '#888', fontWeight: 300, marginBottom: 10 }}>→ {goal.next_action}</p>
              )}
            </div>
            {/* Progress ring */}
            <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
                <circle cx="26" cy="26" r="21" fill="none" stroke={c.accent} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray="131.9" strokeDashoffset={131.9 * (1 - progress / 100)}
                  transform="rotate(-90 26 26)" style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 4px ${c.accent})` }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: c.text }}>{progress}%</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-track" style={{ height: 4, marginTop: 6 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${c.accent}99, ${c.accent})`, borderRadius: 999, transition: 'width 0.7s ease' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            {goal.deadline ? (
              <p style={{ fontSize: 10, color: '#555', fontWeight: 300 }}>Due {goal.deadline}</p>
            ) : <span />}
            <span style={{ fontSize: 10, color: '#444' }}>Tap to update →</span>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {showDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} className="md:items-center md:p-4" onClick={() => setShowDetail(false)}>
          <div style={{ width: '100%', maxWidth: 520, borderRadius: '24px 24px 0 0', background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: 24, maxHeight: '90vh', overflowY: 'auto', borderTop: `3px solid ${c.accent}` }} className="md:rounded-3xl" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                {goal.category && (
                  <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 6, background: c.bg, color: c.text, border: `1px solid ${c.border}`, marginBottom: 8 }}>
                    {goal.category.toUpperCase()}
                  </span>
                )}
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em' }}>{goal.title}</h2>
              </div>
              <button onClick={() => setShowDetail(false)} style={{ fontSize: 24, color: '#555', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>

            {goal.why_it_matters && (
              <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#555', marginBottom: 8 }}>WHY IT MATTERS</p>
                <p style={{ fontSize: 13, color: '#AAA', fontWeight: 300, lineHeight: 1.65 }}>{goal.why_it_matters}</p>
              </div>
            )}

            {goal.next_action && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#555', marginBottom: 8 }}>NEXT ACTION</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#EFEFEF' }}>→ {goal.next_action}</p>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#555' }}>PROGRESS</p>
                <span style={{ fontSize: 14, fontWeight: 900, color: c.text }}>{progress}%</span>
              </div>
              <div className="progress-track" style={{ height: 6, marginBottom: 16 }}>
                <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${c.accent}99, ${c.accent})`, borderRadius: 999 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[25, 50, 75, 100].map(p => (
                  <button key={p} onClick={() => { onProgress(goal.id, p); setShowDetail(false) }}
                    style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: progress === p ? c.bg : 'rgba(255,255,255,0.04)', color: progress === p ? c.text : '#555', border: progress === p ? `1px solid ${c.border}` : '1px solid rgba(255,255,255,0.08)', transition: 'all 0.15s' }}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {goal.deadline && <p style={{ fontSize: 11, color: '#555', marginBottom: 20 }}>Deadline: {goal.deadline}</p>}

            <button onClick={() => { onComplete(goal.id); setShowDetail(false) }}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: `1px solid ${c.border}`, color: c.text, background: c.bg, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
              MARK AS COMPLETE ✓
            </button>
          </div>
        </div>
      )}
    </>
  )
}
