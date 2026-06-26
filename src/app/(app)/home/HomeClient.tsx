'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Goal } from '@/lib/types/database'

const CATEGORY_ACCENT: Record<string, string> = {
  health: '#22c55e', finance: '#D4AF37', career: '#8b5cf6',
  learning: '#38bdf8', creative: '#f97316', relationships: '#f472b6',
}

function categoryAccent(cat: string | null) {
  return CATEGORY_ACCENT[cat ?? ''] ?? '#D4AF37'
}

const MOODS = ['😔', '😕', '😐', '😊', '🔥']

interface Props {
  greeting: string
  todayLabel: string
  firstName: string
  streak: number
  goals: Goal[]
  isNewUser: boolean
}

export function HomeClient({ greeting, todayLabel, firstName, streak, goals, isNewUser }: Props) {
  const [mood, setMood] = useState(0)
  const [win, setWin] = useState('')
  const [intention, setIntention] = useState('')
  const [checkinDone, setCheckinDone] = useState(false)
  const [goalDone, setGoalDone] = useState<Record<string, boolean>>({})

  function submitCheckin() {
    if (!win.trim()) return
    setCheckinDone(true)
  }

  const activeGoals = goals.slice(0, 3)
  const allDone = activeGoals.length > 0 && activeGoals.every(g => goalDone[g.id])

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 0 20px' }} className="view-panel">

      {/* ─── HERO HEADER ─── */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '28px 20px 20px', marginBottom: 4 }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: -60, left: -40, width: 280, height: 200, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(212,175,55,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Date row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#555' }}>{todayLabel}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/assess" style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/></svg>
              </Link>
            </div>
          </div>

          {/* Greeting */}
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ fontSize: 34, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10 }}>
              Good {greeting},<br />{firstName}.
            </h1>
            {/* Streak pill */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <span className="num-glow-fire" style={{ fontSize: 16 }}>🔥</span>
              <span className="shimmer-gold" style={{ fontSize: 14, fontWeight: 900 }}>{streak}-week streak</span>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="status-pill" style={{
              flex: 1,
              ...(checkinDone
                ? { background: 'rgba(34,197,94,0.07)', borderColor: 'rgba(34,197,94,0.22)', color: '#4ade80' }
                : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: '#555' })
            }}>
              <span style={{ fontSize: 11 }}>{checkinDone ? '✓' : '○'}</span>
              <span>{checkinDone ? 'Checked in' : 'Check in'}</span>
            </div>
            <Link href="/assess" className="status-pill" style={{ flex: 1, background: 'rgba(212,175,55,0.06)', borderColor: 'rgba(212,175,55,0.2)', color: '#D4AF37', cursor: 'pointer', textDecoration: 'none' }}>
              <span style={{ fontSize: 10 }}>·</span>
              <span>Assess</span>
              <span className="pulse-gold" style={{ width: 5, height: 5, borderRadius: '50%', background: '#D4AF37', flexShrink: 0 }} />
            </Link>
            <div className="status-pill" style={{ flex: 1, background: 'rgba(167,139,250,0.06)', borderColor: 'rgba(167,139,250,0.18)', color: '#a78bfa' }}>
              <span style={{ fontSize: 10 }}>👥</span>
              <span>Circle</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* ─── NEW USER CTA ─── */}
        {isNewUser && (
          <div style={{ marginBottom: 20, borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(135deg,rgba(212,175,55,0.1) 0%,rgba(212,175,55,0.04) 100%)', border: '1px solid rgba(212,175,55,0.25)' }}>
            <div style={{ padding: '22px 22px 18px' }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 10 }}>YOUR FIRST STEP</p>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 8 }}>What&apos;s the one thing you want to make real?</h3>
              <p style={{ fontSize: 13, color: '#666', fontWeight: 300, lineHeight: 1.6, marginBottom: 18 }}>Your Circle is here. Your streak starts today. All you need is a goal to work toward.</p>
              <Link href="/goals" className="btn-gold" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '12px', fontSize: 12, letterSpacing: '0.06em' }}>ADD YOUR FIRST GOAL →</Link>
            </div>
          </div>
        )}

        {/* ─── DAILY CHECK-IN ─── */}
        {checkinDone ? (
          <div style={{ marginBottom: 20, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(34,197,94,0.14)' }}>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(34,197,94,0.06)' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>Day confirmed 🔥</p>
                <p style={{ fontSize: 11, color: '#555', marginTop: 1 }}>Win: {win}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="streak-card" style={{ marginBottom: 20, padding: '20px 22px' }}>
            <div style={{ position: 'absolute', top: -30, right: -10, width: 140, height: 140, borderRadius: '50%', background: 'rgba(212,175,55,0.06)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#666', marginBottom: 4 }}>DAILY CHECK-IN</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF' }}>How are you showing up today?</p>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🔥</div>
              </div>

              {/* Mood */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#666', letterSpacing: '0.08em', marginBottom: 10 }}>TODAY&apos;S ENERGY</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {MOODS.map((emoji, i) => (
                    <button key={i} onClick={() => setMood(i + 1)} style={{ flex: 1, padding: '10px 4px', borderRadius: 12, border: '1px solid', cursor: 'pointer', fontSize: 20, lineHeight: 1, transition: 'all 0.15s', background: mood === i + 1 ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.04)', borderColor: mood === i + 1 ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.07)', transform: mood === i + 1 ? 'scale(1.12)' : 'scale(1)' }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Win */}
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#666', letterSpacing: '0.08em', marginBottom: 8 }}>TODAY&apos;S WIN (even a small one)</p>
                <input value={win} onChange={e => setWin(e.target.value)} placeholder="I sent that email I've been avoiding…" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '11px 14px', fontSize: 13, color: '#EFEFEF', fontFamily: 'Satoshi,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Intention */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#666', letterSpacing: '0.08em', marginBottom: 8 }}>TODAY&apos;S INTENTION</p>
                <input value={intention} onChange={e => setIntention(e.target.value)} placeholder="Focus on the proposal, not the inbox…" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '11px 14px', fontSize: 13, color: '#EFEFEF', fontFamily: 'Satoshi,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <button onClick={submitCheckin} style={{ width: '100%', padding: 13, borderRadius: 14, background: 'linear-gradient(135deg,#D4AF37,#9A7010)', border: 'none', cursor: win.trim() ? 'pointer' : 'default', fontSize: 14, fontWeight: 800, color: '#000', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.01em', transition: 'opacity 0.15s', opacity: win.trim() ? 1 : 0.45 }}>
                Confirm Today ✓
              </button>
            </div>
          </div>
        )}

        {/* ─── STREAK CARD ─── */}
        <div className="streak-card lift" style={{ marginBottom: 20, padding: '24px 22px 22px' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(212,175,55,0.07)', filter: 'blur(55px)', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 14 }}>REFLECTION STREAK</p>
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span className="gold-text num-glow-gold" style={{ fontSize: 56, fontWeight: 900, lineHeight: 0.85 }}>{streak}</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#555' }}>Sundays</span>
              </div>
              <p style={{ fontSize: 13, color: '#777', fontWeight: 300, lineHeight: 1.5 }}>in a row without missing your reflection.<br />Your Circle has watched every one.</p>
            </div>

            {/* Chain visualization */}
            <div style={{ margin: '20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, overflow: 'hidden' }}>
                {Array.from({ length: Math.min(streak, 11) }).map((_, i) => (
                  <div key={i} style={{ flexShrink: 0, width: 22, height: 28, borderRadius: '4px 4px 3px 3px', background: 'linear-gradient(160deg,#C9A227,#8A6808)', boxShadow: '0 2px 8px rgba(212,175,55,0.35),inset 2px 0 0 rgba(0,0,0,0.25)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'rgba(0,0,0,0.22)', borderRadius: '4px 0 0 3px' }} />
                    <div style={{ position: 'absolute', left: 7, right: 3, top: 8, height: 1.5, background: 'rgba(0,0,0,0.25)', borderRadius: 1 }} />
                    <div style={{ position: 'absolute', left: 7, right: 3, top: 13, height: 1.5, background: 'rgba(0,0,0,0.25)', borderRadius: 1 }} />
                    <div style={{ position: 'absolute', left: 7, right: 6, top: 18, height: 1.5, background: 'rgba(0,0,0,0.25)', borderRadius: 1 }} />
                  </div>
                ))}
                {streak > 0 && <div style={{ flexShrink: 0, width: 4, height: 2, background: 'rgba(212,175,55,0.25)', marginBottom: 13 }} />}
                {/* Pending week */}
                <div className="pulse-gold" style={{ flexShrink: 0, width: 22, height: 28, borderRadius: '4px 4px 3px 3px', border: '2px dashed rgba(212,175,55,0.45)', background: 'rgba(212,175,55,0.05)', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: '3px 0 0 2px', background: 'rgba(212,175,55,0.1)' }} />
                </div>
              </div>
              <p style={{ fontSize: 10, color: '#444', fontWeight: 300, marginTop: 8 }}>{streak} journals written · this week pending</p>
            </div>

            {/* CTA */}
            <div style={{ borderRadius: 14, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.18)', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>⚠️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', marginBottom: 3 }}>Weekly Reflection Due</p>
                  <p style={{ fontSize: 11, color: '#666', fontWeight: 300, lineHeight: 1.5 }}>Miss it and this chain resets to zero. <span style={{ color: '#D4AF37', fontWeight: 600 }}>Your Circle will notice.</span></p>
                </div>
              </div>
              <Link href="/assess" style={{ display: 'block', width: '100%', marginTop: 14, padding: 13, borderRadius: 12, background: 'linear-gradient(135deg,#D4AF37,#9A7010)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#000', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.02em', textAlign: 'center', textDecoration: 'none' }}>
                Complete This Week&apos;s Reflection →
              </Link>
            </div>
          </div>
        </div>

        {/* ─── DO TODAY ─── */}
        {goals.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37' }}>DO TODAY</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: allDone ? '#22c55e' : '#555' }}>
                {activeGoals.filter(g => goalDone[g.id]).length} / {activeGoals.length} confirmed
              </p>
            </div>

            {allDone ? (
              <div style={{ borderRadius: 16, padding: 22, background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(34,197,94,0.03))', border: '1px solid rgba(34,197,94,0.18)', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔥</div>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#4ade80', letterSpacing: '-0.01em', marginBottom: 4 }}>All done today.</p>
                <p style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>Your Circle will see this. Keep the streak alive.</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {activeGoals.map((goal, i) => (
                  <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: i < activeGoals.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    {/* Category color bar */}
                    <div style={{ width: 3, alignSelf: 'stretch', flexShrink: 0, borderRadius: '3px 0 0 3px', background: categoryAccent(goal.category), opacity: goalDone[goal.id] ? 0.2 : 0.7 }} />
                    <div style={{ padding: '15px 14px', display: 'flex', alignItems: 'center', gap: 13, flex: 1, minWidth: 0 }}>
                      {/* Checkbox */}
                      <div className={`cc-checkbox${goalDone[goal.id] ? ' checked' : ''}`} onClick={() => setGoalDone(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))}>
                        {goalDone[goal.id] && <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0, opacity: goalDone[goal.id] ? 0.3 : 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{goal.next_action ?? goal.title}</p>
                        {goal.next_action && <p style={{ fontSize: 11, color: '#555', fontWeight: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.title}</p>}
                      </div>
                      {/* Progress ring */}
                      {!goalDone[goal.id] && (
                        <div style={{ flexShrink: 0, position: 'relative', width: 32, height: 32 }}>
                          <svg width="32" height="32" viewBox="0 0 32 32" style={{ position: 'absolute', top: 0, left: 0 }}>
                            <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
                            <circle cx="16" cy="16" r="12" fill="none" strokeWidth="3" stroke={categoryAccent(goal.category)} strokeLinecap="round" strokeDasharray="75.4" strokeDashoffset={75.4 * (1 - (goal.progress ?? 0) / 100)} transform="rotate(-90 16 16)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 7, fontWeight: 900, color: '#666' }}>{goal.progress}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {goals.length > 3 && (
              <Link href="/goals" style={{ display: 'block', textAlign: 'center', fontSize: 11, color: '#555', marginTop: 12 }}>
                +{goals.length - 3} more goals →
              </Link>
            )}
          </div>
        )}

        {/* ─── QUICK LINKS ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { href: '/circle', emoji: '👥', label: 'Circle', sub: 'See what\'s happening' },
            { href: '/journal', emoji: '📖', label: 'Journal', sub: 'Reflect & reframe' },
            { href: '/goals', emoji: '🎯', label: 'Goals', sub: `${goals.length} active` },
            { href: '/assess', emoji: '📋', label: 'Assess', sub: '5 questions · ~10 min' },
          ].map(q => (
            <Link key={q.href} href={q.href} className="card" style={{ padding: 16, display: 'block', textDecoration: 'none', transition: 'all 0.18s' }}>
              <p style={{ fontSize: 24, marginBottom: 8 }}>{q.emoji}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF' }}>{q.label}</p>
              <p style={{ fontSize: 11, color: '#555', marginTop: 2, fontWeight: 300 }}>{q.sub}</p>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
