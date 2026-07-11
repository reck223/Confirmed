'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

const MODES = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 } as const
type Mode = keyof typeof MODES
const MODE_LABELS: Record<Mode, string> = { focus: 'FOCUS', short: 'SHORT BREAK', long: 'LONG BREAK' }
const MODE_COLORS: Record<Mode, string> = { focus: '#38bdf8', short: '#4ade80', long: '#a78bfa' }
const MODE_GLOW:   Record<Mode, string> = { focus: 'rgba(56,189,248,0.35)', short: 'rgba(74,222,128,0.35)', long: 'rgba(167,139,250,0.35)' }

const R = 110
const CIRC = 2 * Math.PI * R

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function sessionToMode(n: number): Mode {
  if (n % 8 === 0) return 'long'
  if (n % 2 === 0) return 'short'
  return 'focus'
}

export default function FocusTimerPage() {
  const [mode, setMode]           = useState<Mode>('focus')
  const [timeLeft, setTimeLeft]   = useState(MODES.focus)
  const [running, setRunning]     = useState(false)
  const [sessions, setSessions]   = useState(0) // completed focus sessions
  const [totalSecs, setTotalSecs] = useState(0) // total focus seconds this session
  const [flash, setFlash]         = useState(false)
  const [weekSecs, setWeekSecs]   = useState(0)
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null)

  function getWeekStart() {
    const now = new Date()
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
    const mon = new Date(now); mon.setDate(now.getDate() - dow)
    return mon.toISOString().split('T')[0]
  }

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('focusTimer')
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved.weekStart === getWeekStart()) setWeekSecs(saved.weekSecs ?? 0)
    } catch { /* ignore */ }
  }, [])

  // Persist to localStorage whenever relevant state changes
  useEffect(() => {
    try {
      localStorage.setItem('focusTimer', JSON.stringify({ weekStart: getWeekStart(), weekSecs }))
    } catch { /* ignore */ }
  }, [weekSecs])

  const total = MODES[mode]
  const progress = timeLeft / total
  const offset   = CIRC * progress
  const color    = MODE_COLORS[mode]
  const glow     = MODE_GLOW[mode]

  const advance = useCallback(() => {
    const nextSession = sessions + (mode === 'focus' ? 1 : 0)
    if (mode === 'focus') setSessions(nextSession)
    const nextMode = mode === 'focus' ? sessionToMode(nextSession) : 'focus'
    setMode(nextMode)
    setTimeLeft(MODES[nextMode])
    setRunning(false)
    setFlash(true)
    setTimeout(() => setFlash(false), 800)
  }, [mode, sessions])

  // Timer tick
  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { advance(); return 0 }
        if (mode === 'focus') { setTotalSecs(s => s + 1); setWeekSecs(s => s + 1) }
        return t - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, advance, mode])

  // Document title
  useEffect(() => {
    document.title = running ? `${fmt(timeLeft)} · ${MODE_LABELS[mode]}` : 'Focus Timer'
    return () => { document.title = 'Confirmed Creations' }
  }, [timeLeft, running, mode])

  function switchMode(m: Mode) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setMode(m); setTimeLeft(MODES[m]); setRunning(false)
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimeLeft(MODES[mode]); setRunning(false)
  }

  const focusDone  = Math.floor(sessions / 2)
  const totalMins  = Math.floor(totalSecs / 60)
  const weekMins   = Math.floor(weekSecs / 60)
  const weekHrs    = weekMins >= 60 ? `${Math.floor(weekMins / 60)}h ${weekMins % 60}m` : `${weekMins}m`

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 60px', fontFamily: 'Satoshi,sans-serif', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes flashBg { 0%,100% { opacity:0; } 50% { opacity:1; } }
        @keyframes ringGlow { 0%,100% { filter: drop-shadow(0 0 12px ${color}); } 50% { filter: drop-shadow(0 0 28px ${color}); } }
      `}</style>

      {/* Back */}
      <div style={{ paddingTop: 4, paddingBottom: 20, animation: 'fadeUp 0.3s ease both' }}>
        <Link href="/tools" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ← Tools
        </Link>
      </div>

      {/* Flash overlay */}
      {flash && (
        <div style={{ position: 'fixed', inset: 0, background: color, opacity: 0.06, pointerEvents: 'none', zIndex: 99, animation: 'flashBg 0.8s ease' }} />
      )}

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 40, animation: 'fadeUp 0.35s 0.05s ease both' }}>
        {(Object.keys(MODES) as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 12,
              background: mode === m ? `${MODE_COLORS[m]}18` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${mode === m ? MODE_COLORS[m] + '40' : 'rgba(255,255,255,0.07)'}`,
              fontSize: 10, fontWeight: 800, letterSpacing: '0.07em',
              color: mode === m ? MODE_COLORS[m] : '#333',
              cursor: 'pointer', fontFamily: 'Satoshi,sans-serif',
              transition: 'all 0.2s ease',
            }}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Ring + time */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, animation: 'fadeUp 0.4s 0.1s ease both' }}>
        <div style={{ position: 'relative', width: 280, height: 280, marginBottom: 40 }}>
          {/* Glow behind ring */}
          <div style={{
            position: 'absolute', inset: 20, borderRadius: '50%',
            background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`,
            filter: `blur(20px)`,
            animation: running ? 'ringGlow 2s ease-in-out infinite' : 'none',
          }} />

          <svg width="280" height="280" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
            {/* Track */}
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
            {/* Progress */}
            <circle
              cx="140" cy="140" r={R}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC - offset}
              style={{
                transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease',
                filter: running ? `drop-shadow(0 0 10px ${color})` : 'none',
              }}
            />
          </svg>

          {/* Center content */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{
              fontSize: 54, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.03em',
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'Satoshi,sans-serif',
              animation: running && timeLeft <= 10 ? 'pulse 1s ease-in-out infinite' : 'none',
            }}>
              {fmt(timeLeft)}
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: color, marginTop: 4 }}>
              {MODE_LABELS[mode]}
            </span>
            {totalMins > 0 && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>
                {totalMins} min this session
              </span>
            )}
            {weekMins > 0 && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
                {weekHrs} this week
              </span>
            )}
          </div>
        </div>

        {/* Session dots */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 44, alignItems: 'center' }}>
          {Array.from({ length: 4 }).map((_, i) => {
            const done = i < (sessions % 8)
            return (
              <div key={i} style={{
                width: done ? 24 : 10, height: 10, borderRadius: 99,
                background: done ? MODE_COLORS.focus : 'rgba(255,255,255,0.08)',
                transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: done ? `0 0 8px ${MODE_GLOW.focus}` : 'none',
              }} />
            )
          })}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginLeft: 4 }}>
            {sessions} session{sessions !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', maxWidth: 340 }}>
          <button
            onClick={reset}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.35)', fontSize: 16,
            }}
          >
            ↺
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => setRunning(r => !r)}
            style={{
              flex: 1, height: 60, borderRadius: 20,
              background: `linear-gradient(135deg, ${color}, ${color}bb)`,
              border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: 900, letterSpacing: '0.08em', color: '#0A0A0A',
              boxShadow: `0 8px 32px ${glow}`,
              transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'Satoshi,sans-serif',
            }}
          >
            {running ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
                PAUSE
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 3l14 9-14 9V3z"/>
                </svg>
                {timeLeft === MODES[mode] ? 'START' : 'RESUME'}
              </>
            )}
          </button>

          <button
            onClick={advance}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 700,
            }}
          >
            ⏭
          </button>
        </div>

        {/* Tip */}
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center', marginTop: 28, lineHeight: 1.6, maxWidth: 260 }}>
          {mode === 'focus'
            ? 'Put the phone down. Lock in. 25 minutes of real work.'
            : mode === 'short'
            ? 'Step away from the screen. Stretch. Breathe.'
            : 'You earned this. Rest fully before the next round.'}
        </p>
      </div>
    </div>
  )
}
