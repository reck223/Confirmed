'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

type Goal = { id: string; title: string; category: string | null; progress: number }
type Phase = 'setup' | 'prep' | 'active' | 'break' | 'debrief'
type HitResult = 'yes' | 'partial' | 'no'
type CycleReview = {
  cycleNum: number; intention: string; targetHit: HitResult | null
  distractions: number; notes: string; improvement: string
}

const CAT_INFO: Record<string, { accent: string; bg: string; border: string; emoji: string }> = {
  health:        { accent: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   emoji: '💪' },
  career:        { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)',  emoji: '🚀' },
  business:      { accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  emoji: '💼' },
  finance:       { accent: '#D4AF37', bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.2)',  emoji: '💰' },
  learning:      { accent: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.2)',  emoji: '📚' },
  creative:      { accent: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  emoji: '🎨' },
  relationships: { accent: '#f43f5e', bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)',   emoji: '❤️' },
  personal:      { accent: '#14b8a6', bg: 'rgba(20,184,166,0.08)',  border: 'rgba(20,184,166,0.2)',  emoji: '🌱' },
  adventure:     { accent: '#84cc16', bg: 'rgba(132,204,22,0.08)',  border: 'rgba(132,204,22,0.2)',  emoji: '🌍' },
  spiritual:     { accent: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)', emoji: '✨' },
  mindset:       { accent: '#D4AF37', bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.2)',  emoji: '🧠' },
}
const DEFAULT_CAT = { accent: '#D4AF37', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.2)', emoji: '🎯' }
function getCat(c: string | null) { return CAT_INFO[c ?? ''] ?? DEFAULT_CAT }

const DURATIONS = [
  { secs: 25 * 60, label: '25 min', sub: 'Deep Work' },
  { secs: 50 * 60, label: '50 min', sub: 'Flow State' },
  { secs: 90 * 60, label: '90 min', sub: 'Stretch' },
]
const BREAK_SECS = 5 * 60
const R = 110
const CIRC = 2 * Math.PI * R

const ENERGY_OPTS = ['😴', '🔋', '⚡', '🔥', '🚀']
const MORALE_OPTS = ['😞', '😐', '🙂', '😄', '🤩']

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
function fmtFocused(secs: number) {
  const m = Math.round(secs / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

const TA: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12, padding: '12px 14px',
  color: '#EFEFEF', fontSize: 14, lineHeight: 1.6,
  fontFamily: 'Satoshi,sans-serif', resize: 'none',
  outline: 'none', boxSizing: 'border-box',
}

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 9, fontWeight: 800,
  letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', marginBottom: 10,
}

export function FocusClient({ goals }: { goals: Goal[] }) {
  const [phase, setPhase] = useState<Phase>('setup')

  // Setup
  const [selectedGoal, setSelectedGoal] = useState<Goal | 'free' | null>(null)
  const [sessionIntention, setSessionIntention] = useState('')
  const [cycleDuration, setCycleDuration] = useState(25 * 60)
  const [totalCycles, setTotalCycles] = useState(2)

  // Prep (per cycle)
  const [cycleIntention, setCycleIntention] = useState('')
  const [howToStart, setHowToStart] = useState('')
  const [hazards, setHazards] = useState('')
  const [energy, setEnergy] = useState<number | null>(null)
  const [morale, setMorale] = useState<number | null>(null)

  // Active
  const [currentCycle, setCurrentCycle] = useState(1)
  const [timeLeft, setTimeLeft] = useState(cycleDuration)
  const [running, setRunning] = useState(false)
  const [distractions, setDistractions] = useState(0)
  const [distractionFlash, setDistractionFlash] = useState(false)
  const [totalFocusSecs, setTotalFocusSecs] = useState(0)
  const cycleCompleteRef = useRef(false)

  // Break
  const [breakTimeLeft, setBreakTimeLeft] = useState(BREAK_SECS)
  const [targetHit, setTargetHit] = useState<HitResult | null>(null)
  const [cycleNotes, setCycleNotes] = useState('')
  const [cycleImprovement, setCycleImprovement] = useState('')
  const breakCompleteRef = useRef(false)

  // Session data
  const [reviews, setReviews] = useState<CycleReview[]>([])

  // Debrief
  const [accomplished, setAccomplished] = useState('')
  const [insight, setInsight] = useState('')
  const [endEnergy, setEndEnergy] = useState<number | null>(null)

  // Main timer
  useEffect(() => {
    if (!running || phase !== 'active') return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          cycleCompleteRef.current = true
          clearInterval(id)
          return 0
        }
        setTotalFocusSecs(s => s + 1)
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, phase])

  // Cycle complete handler
  useEffect(() => {
    if (timeLeft !== 0 || !cycleCompleteRef.current || phase !== 'active') return
    cycleCompleteRef.current = false
    setRunning(false)
    if (currentCycle >= totalCycles) {
      setPhase('debrief')
    } else {
      setBreakTimeLeft(BREAK_SECS)
      setTargetHit(null)
      setCycleNotes('')
      setCycleImprovement('')
      setPhase('break')
    }
  }, [timeLeft, phase, currentCycle, totalCycles])

  // Break timer
  useEffect(() => {
    if (phase !== 'break') return
    const id = setInterval(() => {
      setBreakTimeLeft(prev => {
        if (prev <= 1) {
          breakCompleteRef.current = true
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  // Break auto-advance
  const proceedToNextCycle = useCallback(() => {
    breakCompleteRef.current = false
    const review: CycleReview = {
      cycleNum: currentCycle, intention: cycleIntention,
      targetHit, distractions, notes: cycleNotes, improvement: cycleImprovement,
    }
    setReviews(prev => [...prev, review])
    setCurrentCycle(n => n + 1)
    setCycleIntention(sessionIntention)
    setHowToStart(''); setHazards(''); setEnergy(null); setMorale(null); setDistractions(0)
    setPhase('prep')
  }, [currentCycle, cycleIntention, targetHit, distractions, cycleNotes, cycleImprovement, sessionIntention])

  useEffect(() => {
    if (breakTimeLeft !== 0 || !breakCompleteRef.current || phase !== 'break') return
    proceedToNextCycle()
  }, [breakTimeLeft, phase, proceedToNextCycle])

  // Document title
  useEffect(() => {
    if (phase === 'active' && running) {
      document.title = `${fmt(timeLeft)} · Cycle ${currentCycle}`
    } else {
      document.title = 'Focus Session'
    }
    return () => { document.title = 'Confirmed Creations' }
  }, [timeLeft, running, phase, currentCycle])

  // Actions
  function startSession() {
    setCycleIntention(sessionIntention)
    setCurrentCycle(1)
    setPhase('prep')
  }

  function startCycle() {
    setTimeLeft(cycleDuration)
    setDistractions(0)
    setRunning(true)
    setPhase('active')
  }

  function endSessionEarly() {
    setRunning(false)
    setPhase('debrief')
  }

  function addDistraction() {
    setDistractions(d => d + 1)
    setDistractionFlash(true)
    setTimeout(() => setDistractionFlash(false), 700)
  }

  function skipCycle() {
    setRunning(false)
    cycleCompleteRef.current = true
    setTimeLeft(0)
  }

  function resetAll() {
    setRunning(false)
    setPhase('setup')
    setSelectedGoal(null)
    setSessionIntention('')
    setCurrentCycle(1)
    setTotalFocusSecs(0)
    setReviews([])
  }

  // Derived
  const goal = selectedGoal === 'free' ? null : selectedGoal
  const goalCat = getCat(goal?.category ?? null)
  const focusProgress = cycleDuration > 0 ? timeLeft / cycleDuration : 0
  const dashOffset = CIRC * (1 - focusProgress)
  const totalDistractions = reviews.reduce((s, r) => s + r.distractions, 0) + distractions
  const canStart = selectedGoal !== null && sessionIntention.trim().length > 0

  // ── SETUP PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }}>
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
          .fc-goal-btn { transition: all 0.16s ease; }
          .fc-goal-btn:hover { transform: translateY(-2px); }
          .fc-sel-btn { transition: all 0.16s ease; }
          .fc-sel-btn:hover { transform: translateY(-1px); }
          .fc-sel-btn:focus-visible { outline: 2px solid rgba(255,255,255,0.4); outline-offset: 2px; }
        `}</style>

        {/* Back */}
        <div style={{ paddingTop: 4, paddingBottom: 28, animation: 'fadeUp 0.3s ease both' }}>
          <Link href="/tools" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ← Tools
          </Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32, animation: 'fadeUp 0.35s 0.04s ease both' }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#D4AF37', marginBottom: 10 }}>FOCUS SESSION</p>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 10 }}>
            What are you<br />building today?
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 300, lineHeight: 1.65 }}>
            Set your intention, pick your goal, and lock in.
          </p>
        </div>

        {/* Session intention */}
        <div style={{ marginBottom: 32, animation: 'fadeUp 0.4s 0.07s ease both' }}>
          <label style={LABEL}>SESSION INTENTION *</label>
          <div style={{ position: 'relative' }}>
            <textarea
              value={sessionIntention}
              onChange={e => setSessionIntention(e.target.value)}
              placeholder="e.g. Finish the first draft of my pitch deck..."
              rows={2}
              style={{ ...TA, paddingLeft: 44 }}
              autoFocus
            />
            <span style={{ position: 'absolute', left: 13, top: 13, fontSize: 18, pointerEvents: 'none', lineHeight: 1 }}>✍️</span>
          </div>
        </div>

        {/* Goal picker */}
        <div style={{ marginBottom: 32, animation: 'fadeUp 0.44s 0.09s ease both' }}>
          <label style={LABEL}>CONNECT TO A GOAL *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {/* Free focus */}
            <button
              className="fc-goal-btn"
              onClick={() => setSelectedGoal('free')}
              style={{
                width: '100%', padding: '13px 16px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                background: selectedGoal === 'free' ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${selectedGoal === 'free' ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.07)'}`,
                fontFamily: 'Satoshi,sans-serif', display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: selectedGoal === 'free' ? '0 0 18px rgba(212,175,55,0.07)' : 'none',
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0, color: '#D4AF37' }}>✦</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: selectedGoal === 'free' ? '#D4AF37' : '#EFEFEF', marginBottom: 2 }}>Free Focus</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontWeight: 300 }}>General deep work · no specific goal</p>
              </div>
              {selectedGoal === 'free' && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.8 7L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
            </button>

            {/* Active goals */}
            {goals.map(g => {
              const c = getCat(g.category)
              const sel = selectedGoal !== 'free' && (selectedGoal as Goal | null)?.id === g.id
              return (
                <button
                  key={g.id}
                  className="fc-goal-btn"
                  onClick={() => setSelectedGoal(g)}
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                    background: sel ? c.bg : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${sel ? c.border : 'rgba(255,255,255,0.07)'}`,
                    fontFamily: 'Satoshi,sans-serif', display: 'flex', alignItems: 'center', gap: 12,
                    position: 'relative', overflow: 'hidden',
                    boxShadow: sel ? `0 0 20px ${c.accent}0C` : 'none',
                  }}
                >
                  {sel && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: c.accent, borderRadius: '0 2px 2px 0' }} />}
                  <span style={{ fontSize: 18, flexShrink: 0, marginLeft: sel ? 6 : 0, transition: 'margin 0.16s' }}>{c.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: sel ? c.accent : '#EFEFEF', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${g.progress}%`, height: '100%', background: sel ? c.accent : 'rgba(255,255,255,0.18)', borderRadius: 2, transition: 'background 0.2s' }} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: sel ? c.accent : 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{g.progress}%</span>
                    </div>
                  </div>
                  {sel && (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.8 7L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </button>
              )
            })}

            {goals.length === 0 && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', padding: '8px 4px', lineHeight: 1.6 }}>
                No active goals yet — <Link href="/goals" style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 600 }}>add one on the Goals page</Link> to connect it here.
              </p>
            )}
          </div>
        </div>

        {/* Session config */}
        <div style={{ animation: 'fadeUp 0.48s 0.11s ease both' }}>
          {/* Duration */}
          <label style={LABEL}>CYCLE DURATION</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 24 }}>
            {DURATIONS.map(d => {
              const sel = cycleDuration === d.secs
              return (
                <button key={d.secs} className="fc-sel-btn" onClick={() => setCycleDuration(d.secs)} style={{
                  padding: '13px 8px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'center',
                  background: sel ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.025)',
                  outline: `1.5px solid ${sel ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  fontFamily: 'Satoshi,sans-serif',
                }}>
                  <p style={{ fontSize: 15, fontWeight: 900, color: sel ? '#38bdf8' : '#EFEFEF', marginBottom: 3, letterSpacing: '-0.01em' }}>{d.label}</p>
                  <p style={{ fontSize: 8, fontWeight: 700, color: sel ? 'rgba(56,189,248,0.65)' : 'rgba(255,255,255,0.32)', letterSpacing: '0.07em' }}>{d.sub.toUpperCase()}</p>
                </button>
              )
            })}
          </div>

          {/* Cycles */}
          <label style={LABEL}>NUMBER OF CYCLES</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 36 }}>
            {[1, 2, 3, 4].map(n => {
              const sel = totalCycles === n
              const mins = Math.round((n * cycleDuration) / 60)
              return (
                <button key={n} className="fc-sel-btn" onClick={() => setTotalCycles(n)} style={{
                  padding: '13px 8px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'center',
                  background: sel ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.025)',
                  outline: `1.5px solid ${sel ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  fontFamily: 'Satoshi,sans-serif',
                }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: sel ? '#a78bfa' : '#EFEFEF', marginBottom: 2 }}>{n}</p>
                  <p style={{ fontSize: 8, fontWeight: 700, color: sel ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.32)', letterSpacing: '0.04em' }}>{mins}m</p>
                </button>
              )
            })}
          </div>

          {/* Summary strip */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { l: 'GOAL', v: selectedGoal === 'free' ? 'Free Focus' : goal?.title ?? '—' },
              { l: 'CYCLE', v: DURATIONS.find(d => d.secs === cycleDuration)?.label ?? '' },
              { l: 'CYCLES', v: `×${totalCycles}` },
              { l: 'TOTAL', v: fmtFocused(totalCycles * cycleDuration) },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none', padding: '0 4px' }}>
                <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.32)', marginBottom: 4 }}>{s.l}</p>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.v}</p>
              </div>
            ))}
          </div>

          <button
            onClick={startSession}
            disabled={!canStart}
            className="btn-gold"
            style={{ fontSize: 13, letterSpacing: '0.07em', opacity: canStart ? 1 : 0.3, transition: 'opacity 0.2s' }}
          >
            SET INTENTIONS →
          </button>
        </div>
      </div>
    )
  }

  // ── PREP PHASE ───────────────────────────────────────────────────────────────
  if (phase === 'prep') {
    const isFirst = currentCycle === 1
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 28, animation: 'fadeUp 0.3s ease both' }}>
          <button
            onClick={() => isFirst ? setPhase('setup') : setPhase('break')}
            style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            ← Back
          </button>
          {goal && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: goalCat.bg, border: `1px solid ${goalCat.border}` }}>
              <span style={{ fontSize: 12 }}>{goalCat.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: goalCat.accent, letterSpacing: '0.03em', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</span>
            </div>
          )}
        </div>

        {/* Cycle progress */}
        <div style={{ marginBottom: 28, animation: 'fadeUp 0.35s 0.04s ease both' }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
            {Array.from({ length: totalCycles }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < currentCycle - 1 ? '#4ade80' : i === currentCycle - 1 ? '#D4AF37' : 'rgba(255,255,255,0.07)', transition: 'background 0.3s' }} />
            ))}
          </div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 8 }}>CYCLE {currentCycle} OF {totalCycles} · PREP</p>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {isFirst ? 'Lock in your intention.' : 'Ready for round ' + currentCycle + '?'}
          </h2>
        </div>

        {/* Cycle intention */}
        <div style={{ marginBottom: 18, animation: 'fadeUp 0.4s 0.07s ease both' }}>
          <label style={LABEL}>WHAT WILL YOU ACCOMPLISH THIS CYCLE? *</label>
          <textarea
            value={cycleIntention}
            onChange={e => setCycleIntention(e.target.value)}
            placeholder="Be specific — what's the one thing you'll finish or push forward?"
            rows={3}
            style={TA}
            autoFocus
          />
        </div>

        {/* How to start */}
        <div style={{ marginBottom: 18, animation: 'fadeUp 0.43s 0.09s ease both' }}>
          <label style={LABEL}>HOW WILL YOU BEGIN? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>OPTIONAL</span></label>
          <textarea
            value={howToStart}
            onChange={e => setHowToStart(e.target.value)}
            placeholder="First action you'll take in the next 60 seconds..."
            rows={2}
            style={TA}
          />
        </div>

        {/* Hazards */}
        <div style={{ marginBottom: 26, animation: 'fadeUp 0.46s 0.1s ease both' }}>
          <label style={LABEL}>ANY HAZARDS? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>OPTIONAL</span></label>
          <textarea
            value={hazards}
            onChange={e => setHazards(e.target.value)}
            placeholder="Potential distractions or blockers to watch for..."
            rows={2}
            style={TA}
          />
        </div>

        {/* Readiness */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32, animation: 'fadeUp 0.49s 0.11s ease both' }}>
          {[
            { label: 'ENERGY', opts: ENERGY_OPTS, val: energy, set: setEnergy, activeColor: '#38bdf8', activeBg: 'rgba(56,189,248,0.15)', activeBorder: 'rgba(56,189,248,0.45)' },
            { label: 'MORALE', opts: MORALE_OPTS, val: morale, set: setMorale, activeColor: '#a78bfa', activeBg: 'rgba(167,139,250,0.15)', activeBorder: 'rgba(167,139,250,0.45)' },
          ].map(({ label, opts, val, set, activeBg, activeBorder }) => (
            <div key={label}>
              <label style={LABEL}>{label}</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {opts.map((e, i) => (
                  <button key={i} onClick={() => set(i + 1)} style={{
                    flex: 1, padding: '8px 2px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 16, lineHeight: 1, fontFamily: 'Satoshi,sans-serif',
                    background: val === i + 1 ? activeBg : 'rgba(255,255,255,0.03)',
                    outline: `1.5px solid ${val === i + 1 ? activeBorder : 'rgba(255,255,255,0.06)'}`,
                    transform: val === i + 1 ? 'translateY(-2px) scale(1.08)' : 'none',
                    transition: 'all 0.14s ease',
                  }}>{e}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ animation: 'fadeUp 0.52s 0.13s ease both' }}>
          <button
            onClick={startCycle}
            disabled={!cycleIntention.trim()}
            className="btn-gold"
            style={{ fontSize: 13, letterSpacing: '0.07em', opacity: cycleIntention.trim() ? 1 : 0.3, transition: 'opacity 0.2s' }}
          >
            {isFirst ? 'LOCK IN →' : `BEGIN CYCLE ${currentCycle} →`}
          </button>
        </div>
      </div>
    )
  }

  // ── ACTIVE PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'active') {
    const urgent = timeLeft <= 60 && timeLeft > 0
    const focusColor = urgent ? '#f87171' : '#38bdf8'
    const focusGlow = urgent ? 'rgba(248,113,113,0.3)' : 'rgba(56,189,248,0.3)'

    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 60px', fontFamily: 'Satoshi,sans-serif', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @keyframes ringPulse { 0%,100% { opacity:0.6 } 50% { opacity:1 } }
          @keyframes distractPop { 0%,100% { transform:scale(1) } 40% { transform:scale(1.22) } }
          @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        `}</style>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {Array.from({ length: totalCycles }, (_, i) => (
                <div key={i} style={{
                  width: i === currentCycle - 1 ? 20 : 8, height: 8, borderRadius: 4,
                  background: i < currentCycle - 1 ? '#4ade80' : i === currentCycle - 1 ? '#D4AF37' : 'rgba(255,255,255,0.08)',
                  transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              ))}
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.06em' }}>CYCLE {currentCycle}/{totalCycles}</span>
          </div>
          <button onClick={endSessionEarly} style={{ background: 'none', border: 'none', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.06em' }}>
            END SESSION
          </button>
        </div>

        {/* Goal + intention */}
        <div style={{ textAlign: 'center', marginBottom: 4, padding: '0 16px' }}>
          {goal && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: goalCat.bg, border: `1px solid ${goalCat.border}`, marginBottom: 10 }}>
              <span style={{ fontSize: 11 }}>{goalCat.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: goalCat.accent }}>{goal.title}</span>
            </div>
          )}
          {cycleIntention && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', fontWeight: 300, lineHeight: 1.55, maxWidth: 300, margin: '0 auto', fontStyle: 'italic' }}>
              &ldquo;{cycleIntention}&rdquo;
            </p>
          )}
        </div>

        {/* Timer ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', width: 280, height: 280, margin: '20px 0 32px' }}>
            <div style={{
              position: 'absolute', inset: 28, borderRadius: '50%',
              background: `radial-gradient(circle, ${focusColor}0D 0%, transparent 70%)`,
              filter: 'blur(18px)',
              animation: running ? 'ringPulse 2.8s ease-in-out infinite' : 'none',
            }} />
            <svg width="280" height="280" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
              <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="10" />
              <circle
                cx="140" cy="140" r={R}
                fill="none" stroke={focusColor}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={dashOffset}
                style={{
                  transition: 'stroke-dashoffset 0.95s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease',
                  filter: running ? `drop-shadow(0 0 ${urgent ? 18 : 8}px ${focusColor})` : 'none',
                }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                fontSize: 54, fontWeight: 900, letterSpacing: '-0.04em',
                fontVariantNumeric: 'tabular-nums', fontFamily: 'Satoshi,sans-serif',
                color: urgent ? '#f87171' : '#EFEFEF',
                textShadow: urgent ? '0 0 28px rgba(248,113,113,0.55)' : 'none',
                transition: 'color 0.5s, text-shadow 0.5s',
              }}>{fmt(timeLeft)}</span>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: focusColor, marginTop: 6 }}>
                {running ? (urgent ? 'FINISH STRONG' : 'LOCKED IN') : timeLeft === cycleDuration ? 'READY' : 'PAUSED'}
              </span>
            </div>
          </div>

          {/* Distraction counter */}
          <button
            onClick={addDistraction}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28,
              padding: '8px 18px', borderRadius: 20, cursor: 'pointer',
              background: distractions > 0 ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${distractions > 0 ? 'rgba(248,113,113,0.28)' : 'rgba(255,255,255,0.07)'}`,
              fontFamily: 'Satoshi,sans-serif',
              animation: distractionFlash ? 'distractPop 0.7s ease' : 'none',
              transition: 'background 0.3s, border-color 0.3s',
            }}
          >
            <span style={{ fontSize: 13 }}>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: distractions > 0 ? '#f87171' : 'rgba(255,255,255,0.32)' }}>
              {distractions === 0 ? 'Tap if you got distracted' : `${distractions} distraction${distractions !== 1 ? 's' : ''} logged`}
            </span>
          </button>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', maxWidth: 320 }}>
            <button
              onClick={() => { setRunning(false); setTimeLeft(cycleDuration); setDistractions(0) }}
              style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.32)', fontSize: 18 }}
            >↺</button>

            <button
              onClick={() => setRunning(r => !r)}
              style={{
                flex: 1, height: 64, borderRadius: 22,
                background: `linear-gradient(135deg, ${focusColor} 0%, ${focusColor}bb 100%)`,
                border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 900, letterSpacing: '0.09em', color: '#080808',
                boxShadow: `0 8px 32px ${focusGlow}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'Satoshi,sans-serif',
                transition: 'box-shadow 0.3s ease',
              }}
            >
              {running ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> PAUSE</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg> {timeLeft === cycleDuration ? 'START' : 'RESUME'}</>
              )}
            </button>

            <button
              onClick={skipCycle}
              style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.32)', fontSize: 13, fontWeight: 700 }}
            >⏭</button>
          </div>

          {/* Session stats */}
          <div style={{ display: 'flex', gap: 28, justifyContent: 'center', marginTop: 28 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmtFocused(totalFocusSecs)}</p>
              <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.32)', marginTop: 5 }}>TOTAL FOCUSED</p>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF', lineHeight: 1 }}>{currentCycle - 1}</p>
              <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.32)', marginTop: 5 }}>CYCLES DONE</p>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: distractions === 0 ? '#4ade80' : '#fbbf24', lineHeight: 1 }}>{distractions}</p>
              <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.32)', marginTop: 5 }}>DISTRACTIONS</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── BREAK PHASE ──────────────────────────────────────────────────────────────
  if (phase === 'break') {
    const nextCycle = currentCycle + 1
    const breakPct = breakTimeLeft / BREAK_SECS
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }}>
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
          @keyframes checkIn { 0% { transform:scale(0) rotate(-12deg); opacity:0 } 65% { transform:scale(1.18) rotate(3deg); opacity:1 } 100% { transform:scale(1) rotate(0); } }
        `}</style>

        {/* Completion celebration */}
        <div style={{ textAlign: 'center', paddingTop: 12, paddingBottom: 28, animation: 'fadeUp 0.35s ease both' }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%', margin: '0 auto 16px',
            background: 'radial-gradient(circle at 35% 35%, rgba(74,222,128,0.2), rgba(74,222,128,0.05))',
            border: '1.5px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 28px rgba(74,222,128,0.12)',
            animation: 'checkIn 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.08s both',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: '#4ade80', marginBottom: 6 }}>CYCLE {currentCycle} COMPLETE</p>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 14 }}>
            Solid. Keep the momentum.
          </h2>

          {/* Break countdown */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 999, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.14)' }}>
            <div style={{ width: 32, height: 4, borderRadius: 2, background: 'rgba(74,222,128,0.15)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${breakPct * 100}%`, background: '#4ade80', borderRadius: 2, transition: 'width 0.9s linear' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Break</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#4ade80', fontVariantNumeric: 'tabular-nums' }}>{fmt(breakTimeLeft)}</span>
          </div>
        </div>

        {/* Review card */}
        <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px', marginBottom: 14, animation: 'fadeUp 0.4s 0.06s ease both' }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #4ade80, rgba(74,222,128,0.25))', borderRadius: 1, marginBottom: 18 }} />
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.38)', marginBottom: 18 }}>CYCLE REVIEW</p>

          {/* Target hit */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 10 }}>Completed your cycle target?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {([
                { k: 'yes',     label: '✓ Yes',      c: '#4ade80', bg: 'rgba(74,222,128,0.1)',   bdr: 'rgba(74,222,128,0.4)' },
                { k: 'partial', label: '~ Partially', c: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  bdr: 'rgba(251,191,36,0.4)' },
                { k: 'no',      label: '✗ Not yet',  c: '#f87171', bg: 'rgba(248,113,113,0.1)', bdr: 'rgba(248,113,113,0.4)' },
              ] as const).map(opt => (
                <button key={opt.k} onClick={() => setTargetHit(opt.k)} style={{
                  padding: '10px 6px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, fontFamily: 'Satoshi,sans-serif',
                  background: targetHit === opt.k ? opt.bg : 'rgba(255,255,255,0.03)',
                  outline: `1.5px solid ${targetHit === opt.k ? opt.bdr : 'rgba(255,255,255,0.07)'}`,
                  color: targetHit === opt.k ? opt.c : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.14s',
                }}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 13 }}>
            <label style={{ ...LABEL, marginBottom: 8 }}>ANYTHING NOTEWORTHY?</label>
            <textarea value={cycleNotes} onChange={e => setCycleNotes(e.target.value)} placeholder="Insights, breakthroughs, blockers..." rows={2} style={{ ...TA, fontSize: 13 }} />
          </div>

          {/* Distractions */}
          {distractions > 0 && (
            <div style={{ marginBottom: 13, padding: '8px 12px', borderRadius: 10, background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>{distractions} distraction{distractions !== 1 ? 's' : ''} this cycle</span>
            </div>
          )}

          {/* Improve */}
          <div>
            <label style={{ ...LABEL, marginBottom: 8 }}>WHAT WOULD MAKE NEXT CYCLE BETTER?</label>
            <textarea value={cycleImprovement} onChange={e => setCycleImprovement(e.target.value)} placeholder="One small adjustment..." rows={2} style={{ ...TA, fontSize: 13 }} />
          </div>
        </div>

        {/* Next cycle preview */}
        <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.16)', marginBottom: 22, animation: 'fadeUp 0.45s 0.09s ease both' }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#D4AF37', marginBottom: 6 }}>NEXT · CYCLE {nextCycle} OF {totalCycles}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>You'll set a fresh intention for cycle {nextCycle} before it begins.</p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, animation: 'fadeUp 0.5s 0.11s ease both' }}>
          <button onClick={proceedToNextCycle} className="btn-gold" style={{ fontSize: 13, letterSpacing: '0.06em' }}>
            READY FOR CYCLE {nextCycle} →
          </button>
          <button
            onClick={proceedToNextCycle}
            style={{ background: 'none', border: 'none', fontSize: 12, color: 'rgba(255,255,255,0.32)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', padding: '8px', fontWeight: 600 }}
          >
            Skip break, start now
          </button>
        </div>
      </div>
    )
  }

  // ── DEBRIEF PHASE ────────────────────────────────────────────────────────────
  const totalMins = Math.round(totalFocusSecs / 60)
  const completedCycles = reviews.length + (phase === 'debrief' ? 1 : 0)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes trophyIn { 0% { transform:scale(0) rotate(-18deg); opacity:0 } 65% { transform:scale(1.18) rotate(4deg); opacity:1 } 100% { transform:scale(1) rotate(0); opacity:1 } }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
      `}</style>

      {/* Trophy moment */}
      <div style={{ textAlign: 'center', padding: '16px 0 28px', animation: 'fadeUp 0.4s ease both' }}>
        <div style={{ fontSize: 60, lineHeight: 1, marginBottom: 14, animation: 'trophyIn 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.1s both', display: 'inline-block', filter: 'drop-shadow(0 0 22px rgba(212,175,55,0.45))' }}>🏆</div>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#D4AF37', marginBottom: 8 }}>SESSION COMPLETE</p>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          You showed up.<br />That&apos;s what counts.
        </h2>
      </div>

      {/* Stats */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(212,175,55,0.02) 100%)',
        border: '1px solid rgba(212,175,55,0.18)', borderRadius: 20, padding: '20px',
        marginBottom: 18, animation: 'fadeUp 0.44s 0.07s ease both',
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
      }}>
        {[
          { v: String(currentCycle), l: 'CYCLES', c: '#4ade80' },
          { v: totalMins < 60 ? `${totalMins}m` : `${Math.floor(totalMins / 60)}h${totalMins % 60}m`, l: 'FOCUSED', c: '#38bdf8' },
          { v: String(totalDistractions), l: 'DISTRACTIONS', c: totalDistractions === 0 ? '#4ade80' : '#fbbf24' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none', padding: '4px 0' }}>
            <p style={{ fontSize: 30, fontWeight: 900, color: s.c, lineHeight: 1, marginBottom: 6, textShadow: `0 0 18px ${s.c}30`, fontVariantNumeric: 'tabular-nums' }}>{s.v}</p>
            <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* Goal pill */}
      {goal && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22, animation: 'fadeUp 0.47s 0.09s ease both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: goalCat.bg, border: `1px solid ${goalCat.border}` }}>
            <span>{goalCat.emoji}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: goalCat.accent }}>Worked on: {goal.title}</span>
          </div>
        </div>
      )}

      {/* Cycle review summary */}
      {reviews.length > 0 && (
        <div style={{ marginBottom: 22, display: 'flex', gap: 6, flexWrap: 'wrap', animation: 'fadeUp 0.5s 0.1s ease both' }}>
          {reviews.map(r => (
            <div key={r.cycleNum} style={{
              padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600,
              background: r.targetHit === 'yes' ? 'rgba(74,222,128,0.1)' : r.targetHit === 'partial' ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${r.targetHit === 'yes' ? 'rgba(74,222,128,0.25)' : r.targetHit === 'partial' ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.07)'}`,
              color: r.targetHit === 'yes' ? '#4ade80' : r.targetHit === 'partial' ? '#fbbf24' : 'rgba(255,255,255,0.45)',
            }}>
              Cycle {r.cycleNum} {r.targetHit === 'yes' ? '✓' : r.targetHit === 'partial' ? '~' : ''}
            </div>
          ))}
        </div>
      )}

      {/* Reflection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28, animation: 'fadeUp 0.52s 0.11s ease both' }}>
        <div>
          <label style={LABEL}>WHAT DID YOU ACCOMPLISH?</label>
          <textarea value={accomplished} onChange={e => setAccomplished(e.target.value)} placeholder="What moved forward? What got done?" rows={3} style={TA} />
        </div>
        <div>
          <label style={LABEL}>KEY INSIGHT OR LEARNING</label>
          <textarea value={insight} onChange={e => setInsight(e.target.value)} placeholder="One thing to carry into the next session..." rows={2} style={TA} />
        </div>
        <div>
          <label style={LABEL}>HOW&apos;S YOUR ENERGY NOW?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {ENERGY_OPTS.map((e, i) => (
              <button key={i} onClick={() => setEndEnergy(i + 1)} style={{
                flex: 1, padding: '10px 2px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontSize: 20, fontFamily: 'Satoshi,sans-serif',
                background: endEnergy === i + 1 ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)',
                outline: `1.5px solid ${endEnergy === i + 1 ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.06)'}`,
                transform: endEnergy === i + 1 ? 'scale(1.12)' : 'none',
                transition: 'all 0.14s',
              }}>{e}</button>
            ))}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, animation: 'fadeUp 0.55s 0.13s ease both' }}>
        {goal && (
          <Link
            href={`/goals?goal=${goal.id}`}
            style={{
              display: 'block', textAlign: 'center', padding: '15px',
              borderRadius: 14, fontFamily: 'Satoshi,sans-serif',
              background: `linear-gradient(135deg, ${goalCat.accent}22, ${goalCat.accent}0A)`,
              border: `1px solid ${goalCat.border}`,
              fontSize: 13, fontWeight: 800, color: goalCat.accent,
              textDecoration: 'none', letterSpacing: '0.05em',
            }}
          >
            LOG PROGRESS ON GOAL ↗
          </Link>
        )}
        <button
          onClick={resetAll}
          style={{ padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
        >
          Start Another Session
        </button>
        <Link href="/tools" style={{ display: 'block', textAlign: 'center', padding: '11px', fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textDecoration: 'none' }}>
          Done for now
        </Link>
      </div>
    </div>
  )
}
