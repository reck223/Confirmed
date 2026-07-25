'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { PERSONAS, type PersonaId } from '@/app/api/voice/personas'
import type { PromptSchemaId } from '@/app/api/voice/prompts'
import { getTodayQod } from '@/lib/qod'
import { createJournalEntryFromVoice } from '@/app/(app)/journal/actions'
import { addMeal } from '@/app/(app)/tools/meals/actions'
import { saveWorkoutSession } from '@/app/(app)/tools/workout/actions'
import { createGoalFromVoice } from '@/app/(app)/goals/actions'
import { completeLesson } from '@/app/(app)/playbook/actions'
import { onHandsFreeRequest, type HandsFreeItem } from '@/lib/voiceCoachBus'

type Turn = { role: 'user' | 'assistant'; content: string }
type Status = 'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported' | 'error'
type FillData = Record<string, unknown>

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Tap to talk',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  unsupported: 'Voice not supported in this browser',
  error: 'Something went wrong — try again',
}

const FILL_OPTIONS: { id: PromptSchemaId; route: string; label: string }[] = [
  { id: 'checkin_morning', route: '/journal', label: 'Morning check-in' },
  { id: 'checkin_evening', route: '/journal', label: 'Evening reflection' },
  { id: 'meal', route: '/tools/meals', label: 'Log a meal' },
  { id: 'workout', route: '/tools/workout', label: 'Log a workout' },
  { id: 'reading_goal', route: '/goals', label: 'Start a reading goal' },
  { id: 'letter_goal', route: '/goals', label: 'Write a letter to self' },
]

function MicIcon({ size = 20, color = '#0a0a0a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="12" rx="3" fill={color} />
      <path d="M5 11a7 7 0 0 0 14 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <line x1="8.5" y1="22" x2="15.5" y2="22" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon({ size = 16, color = 'rgba(255,255,255,0.85)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.25} strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

function HeadphonesIcon({ size = 13, color = '#D4AF37' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 15v-3a9 9 0 0 1 18 0v3" />
      <rect x="16" y="14" width="5" height="7" rx="2" />
      <rect x="3" y="14" width="5" height="7" rx="2" />
    </svg>
  )
}

function SparkleIcon({ size = 12, color = '#D4AF37' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l1.9 6.6L20.5 10.5l-6.6 1.9L12 19l-1.9-6.6L3.5 10.5l6.6-1.9L12 2z" />
    </svg>
  )
}

// Small live status glyph rendered above the mic label — an equalizer while
// speaking, a soft pulse while listening, three dots while thinking.
function StatusGlyph({ status }: { status: Status }) {
  if (status === 'speaking') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="vc-bar" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </span>
    )
  }
  if (status === 'thinking') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {[0, 1, 2].map(i => (
          <span key={i} className="vc-dot" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
    )
  }
  return null
}

export function VoiceCoach() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [persona, setPersona] = useState<PersonaId>('motivator')
  const [status, setStatus] = useState<Status>('idle')
  const [history, setHistory] = useState<Turn[]>([])
  const [scrolling, setScrolling] = useState(false)
  const [fillMode, setFillMode] = useState<PromptSchemaId | null>(null)
  const [handsFree, setHandsFree] = useState(false)
  const [queueTotal, setQueueTotal] = useState(0)
  const [queuePos, setQueuePos] = useState(0)
  const historyRef = useRef<Turn[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handsFreeRef = useRef(false)
  const queueRef = useRef<HandsFreeItem[]>([])
  const lessonIdRef = useRef<string | null>(null)
  const startListeningRef = useRef<() => void>(() => {})

  const availableFills = FILL_OPTIONS.filter(f => pathname?.startsWith(f.route))

  // Fade the button while the page is actively being scrolled — keeps it
  // out of the way of content, back at full opacity ~500ms after scrolling
  // stops. Only applies when the panel's closed; never fade mid-conversation.
  useEffect(() => {
    if (open) { setScrolling(false); return }
    function onScroll() {
      setScrolling(true)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => setScrolling(false), 500)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [open])

  useEffect(() => { historyRef.current = history }, [history])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [history])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) setStatus('unsupported')
  }, [])

  // `onDone` lets a caller run something exactly when the spoken audio
  // finishes playing (not when playback merely starts, which is when the
  // returned promise resolves) — needed so hands-free mode never starts
  // fetching the next question while the current one is still being read.
  const speak = useCallback(async (text: string, onDone?: () => void) => {
    setStatus('speaking')
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona }),
      })
      if (!res.ok) { setStatus('error'); onDone?.(); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = audioRef.current ?? new Audio()
      audioRef.current = audio
      audio.src = url
      audio.onended = () => {
        URL.revokeObjectURL(url)
        if (onDone) { onDone(); return }
        if (handsFreeRef.current) { startListeningRef.current() }
        else { setStatus('idle') }
      }
      audio.onerror = () => { URL.revokeObjectURL(url); setStatus('error'); onDone?.() }
      await audio.play()
    } catch {
      setStatus('error')
      onDone?.()
    }
  }, [persona])

  const saveFillData = useCallback(async (schemaId: PromptSchemaId, data: FillData, lessonId?: string | null) => {
    const num = (v: unknown): number | null => (typeof v === 'number' ? v : (typeof v === 'string' && v.trim() ? Number(v) : null))
    const str = (v: unknown): string => (typeof v === 'string' ? v : v != null ? String(v) : '')

    if (schemaId === 'checkin_morning') {
      await createJournalEntryFromVoice('checkin', {
        checkin_type: 'morning', mood: '',
        intention: str(data.intention), task1: str(data.task1), task2: str(data.task2), task3: str(data.task3),
        excited: str(data.excited),
        qod_question: getTodayQod().q, qod_answer: str(data.qod_answer),
      })
    } else if (schemaId === 'checkin_evening') {
      await createJournalEntryFromVoice('checkin', {
        checkin_type: 'evening', mood: '',
        win: str(data.win), challenge: str(data.challenge), lesson: str(data.lesson),
        energy: str(data.energy || '5'),
      })
    } else if (schemaId === 'meal') {
      const today = new Date().toISOString().split('T')[0]
      await addMeal(today, str(data.mealType || 'snack'), str(data.name), num(data.calories), num(data.proteinG), num(data.carbsG), num(data.fatG))
    } else if (schemaId === 'workout') {
      const rawExercises = Array.isArray(data.exercises) ? data.exercises as FillData[] : []
      const exercises = rawExercises.map((ex, i) => {
        const setCount = Math.max(1, Math.round(num(ex.sets) ?? 1))
        return {
          name: str(ex.name) || `Exercise ${i + 1}`,
          isCardio: !!ex.isCardio,
          sortOrder: i,
          sets: Array.from({ length: setCount }, (_, si) => ({
            setNumber: si + 1, reps: num(ex.reps), weightLbs: num(ex.weightLbs), durationMins: null,
          })),
        }
      })
      await saveWorkoutSession(str(data.name) || 'Workout', num(data.durationMins) ?? 0, exercises)
    } else if (schemaId === 'reading_goal') {
      const count = num(data.bookCount)
      await createGoalFromVoice('reading', {
        title: str(data.title) || (count ? `Read ${count} Books` : 'Reading Goal'),
        why: count != null ? String(count) : '',
        deadline: data.deadline ? str(data.deadline) : null,
        nextAction: str(data.currentBook),
        bookAuthor: str(data.bookAuthor),
      })
    } else if (schemaId === 'letter_goal') {
      await createGoalFromVoice('letter', {
        why: str(data.letterContent),
        deadline: str(data.deadline) || null,
      })
    } else if (schemaId === 'lesson' && lessonId) {
      try { localStorage.setItem(`manifest:reflection-${lessonId}`, str(data.reflection)) } catch { /* */ }
      await completeLesson(lessonId)
    }
  }, [])

  const startFill = useCallback(async (schemaId: PromptSchemaId, lessonId?: string | null) => {
    lessonIdRef.current = lessonId ?? null
    setFillMode(schemaId)
    setHistory([])
    historyRef.current = []
    setStatus('thinking')
    try {
      const res = await fetch('/api/voice/fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaId, message: "Let's begin.", history: [], lessonId: lessonIdRef.current ?? undefined }),
      })
      const data = await res.json()
      if (!data.reply) { setStatus('error'); return }
      setHistory([{ role: 'assistant', content: data.reply }])
      await speak(data.reply)
    } catch {
      setStatus('error')
    }
  }, [speak])

  // Hands-free mode walks through a queue of items (e.g. morning check-in,
  // then today's lesson) end to end with no taps — each speak() auto-starts
  // listening again (see `speak`'s onDone/handsFreeRef logic), and this
  // advances to the next queued item once one finishes.
  const advanceQueue = useCallback(() => {
    const next = queueRef.current.shift()
    setQueuePos(p => p + 1)
    if (!next) {
      handsFreeRef.current = false
      setHandsFree(false)
      lessonIdRef.current = null
      speak("That's everything for now — nice work. You're all caught up.")
      return
    }
    startFill(next.schemaId, next.lessonId ?? null)
  }, [speak, startFill])

  const handleUserMessage = useCallback(async (message: string) => {
    const nextHistory = [...historyRef.current, { role: 'user' as const, content: message }]
    setHistory(nextHistory)
    setStatus('thinking')
    try {
      if (fillMode) {
        const res = await fetch('/api/voice/fill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schemaId: fillMode, message, history: historyRef.current, lessonId: lessonIdRef.current ?? undefined }),
        })
        const data = await res.json()
        if (!data.reply) { setStatus('error'); return }
        setHistory([...nextHistory, { role: 'assistant', content: data.reply }])
        if (data.done && data.data) {
          await saveFillData(fillMode, data.data, lessonIdRef.current)
          setFillMode(null)
          if (handsFreeRef.current) {
            await new Promise<void>(resolve => { speak(data.reply, resolve) })
            advanceQueue()
          } else {
            await speak(data.reply)
          }
        } else {
          await speak(data.reply)
        }
        return
      }

      const res = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: historyRef.current, persona }),
      })
      const data = await res.json()
      if (!data.text) { setStatus('error'); return }
      setHistory([...nextHistory, { role: 'assistant', content: data.text }])
      await speak(data.text)
    } catch {
      setStatus('error')
    }
  }, [fillMode, persona, speak, saveFillData, advanceQueue])

  const exitFill = useCallback(() => {
    setFillMode(null)
    setHistory([])
    historyRef.current = []
    setStatus('idle')
    handsFreeRef.current = false
    setHandsFree(false)
    queueRef.current = []
    lessonIdRef.current = null
  }, [])

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setStatus('unsupported'); return }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      const transcript = e.results[0][0].transcript
      handleUserMessage(transcript)
    }
    rec.onerror = () => setStatus('idle')
    rec.onend = () => setStatus(s => s === 'listening' ? 'idle' : s)
    rec.start()
    setStatus('listening')
  }, [handleUserMessage])

  useEffect(() => { startListeningRef.current = startListening }, [startListening])

  // Lets the home page (or any other component) start a hands-free run —
  // e.g. "morning check-in, then today's lesson" — via a decoupled event
  // bus rather than prop-drilling through the shared layout.
  useEffect(() => {
    return onHandsFreeRequest((items) => {
      if (items.length === 0) return
      queueRef.current = items.slice(1)
      handsFreeRef.current = true
      setHandsFree(true)
      setQueueTotal(items.length)
      setQueuePos(1)
      setOpen(true)
      startFill(items[0].schemaId, items[0].lessonId ?? null)
    })
  }, [startFill])

  const p = PERSONAS[persona]
  const busy = status === 'thinking' || status === 'speaking' || status === 'listening'
  const fillLabel = fillMode === 'lesson' ? "Today's Lesson" : FILL_OPTIONS.find(f => f.id === fillMode)?.label

  return (
    <div style={{
      position: 'fixed', right: 20, bottom: 'calc(140px + env(safe-area-inset-bottom, 0px))', zIndex: 350,
      opacity: scrolling ? 0.25 : 1,
      transition: 'opacity 0.25s ease',
      pointerEvents: scrolling ? 'none' : 'auto',
    }}>
      <style>{`
        @keyframes vcRing {
          0%   { transform: scale(0.7); opacity: 0.55; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes vcBar {
          0%, 100% { transform: scaleY(0.3); }
          50%      { transform: scaleY(1); }
        }
        @keyframes vcDot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40%           { opacity: 1; transform: translateY(-2px); }
        }
        @keyframes vcBreathe {
          0%, 100% { box-shadow: 0 10px 32px rgba(0,0,0,0.55), 0 0 0 0 rgba(212,175,55,0.28); }
          50%      { box-shadow: 0 10px 32px rgba(0,0,0,0.55), 0 0 0 7px rgba(212,175,55,0); }
        }
        @keyframes vcRise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .vc-bar {
          display: inline-block; width: 3px; height: 12px; border-radius: 2px;
          background: #D4AF37; animation: vcBar 0.9s ease-in-out infinite;
        }
        .vc-dot {
          display: inline-block; width: 4px; height: 4px; border-radius: 50%;
          background: #D4AF37; animation: vcDot 1.1s ease-in-out infinite;
        }
        .vc-panel { animation: vcRise 0.22s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {open && (
        <div className="vc-panel" style={{
          width: 320, marginBottom: 14, borderRadius: 22,
          background: 'linear-gradient(165deg,#161616 0%,#0a0a0a 65%,#080808 100%)',
          border: '1px solid rgba(212,175,55,0.16)',
          boxShadow: '0 28px 80px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(0,0,0,0.4)',
          overflow: 'hidden', fontFamily: 'Satoshi,sans-serif',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        }}>
          <div style={{
            padding: '16px 18px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'linear-gradient(180deg,rgba(212,175,55,0.05),transparent)',
          }}>
            {fillMode ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  {handsFree ? (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                      padding: '3px 8px', borderRadius: 999,
                      background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.28)',
                    }}>
                      <HeadphonesIcon size={11} />
                      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.08em', color: '#D4AF37' }}>
                        {queuePos}/{queueTotal}
                      </span>
                    </span>
                  ) : (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4AF37', flexShrink: 0 }} />
                  )}
                  <p style={{
                    fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', color: '#EFEFEF',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {fillLabel}
                  </p>
                </div>
                <button
                  onClick={exitFill}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                    fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.45)',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 999, padding: '5px 10px', cursor: 'pointer',
                  }}
                >
                  {handsFree ? 'Stop' : 'Cancel'}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <SparkleIcon size={11} />
                  <p style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.42)' }}>VOICE COACH</p>
                </div>
                <div style={{
                  display: 'flex', gap: 3, padding: 3, borderRadius: 12,
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {(Object.keys(PERSONAS) as PersonaId[]).map(id => {
                    const sel = id === persona
                    return (
                      <button
                        key={id}
                        disabled={busy}
                        onClick={() => setPersona(id)}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: 9, cursor: busy ? 'default' : 'pointer',
                          border: 'none',
                          background: sel ? 'linear-gradient(160deg,#F5D070,#D4AF37)' : 'transparent',
                          color: sel ? '#191305' : 'rgba(255,255,255,0.4)',
                          boxShadow: sel ? '0 2px 10px rgba(212,175,55,0.35)' : 'none',
                          fontFamily: 'Satoshi,sans-serif', fontSize: 10.5, fontWeight: 800,
                          opacity: busy && !sel ? 0.4 : 1,
                          transition: 'all 0.18s ease',
                        }}
                      >
                        {PERSONAS[id].name}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <div ref={scrollRef} style={{ maxHeight: 260, minHeight: 84, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', lineHeight: 1.55 }}>
                  Talk to {p.name} — {p.tagline.toLowerCase()}. Tap the mic below and start speaking.
                </p>
                {availableFills.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 10, marginTop: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.26)', letterSpacing: '0.08em' }}>OR FILL THIS OUT BY VOICE</p>
                    {availableFills.map(f => (
                      <button
                        key={f.id}
                        onClick={() => startFill(f.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9,
                          textAlign: 'left', padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                          border: '1px solid rgba(212,175,55,0.16)', background: 'rgba(212,175,55,0.05)',
                        }}
                      >
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: 'rgba(212,175,55,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <MicIcon size={11} color="#D4AF37" />
                        </span>
                        <span style={{ color: '#E8CD7A', fontFamily: 'Satoshi,sans-serif', fontSize: 11.5, fontWeight: 700 }}>
                          {f.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : history.map((t, i) => (
              <div key={i} style={{ alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <p style={{
                  fontSize: 12, lineHeight: 1.55, padding: '9px 13px', borderRadius: 14,
                  background: t.role === 'user' ? 'linear-gradient(160deg,rgba(212,175,55,0.16),rgba(212,175,55,0.08))' : 'rgba(255,255,255,0.045)',
                  border: t.role === 'user' ? '1px solid rgba(212,175,55,0.16)' : '1px solid rgba(255,255,255,0.04)',
                  color: t.role === 'user' ? '#F5E6B8' : 'rgba(255,255,255,0.78)',
                }}>
                  {t.content}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {status === 'listening' && (
                <>
                  <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(248,113,113,0.55)', animation: 'vcRing 1.6s ease-out infinite' }} />
                  <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(248,113,113,0.55)', animation: 'vcRing 1.6s ease-out infinite', animationDelay: '0.5s' }} />
                </>
              )}
              <button
                onClick={startListening}
                disabled={busy || status === 'unsupported'}
                style={{
                  width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: busy ? 'default' : 'pointer',
                  background: status === 'listening'
                    ? 'linear-gradient(160deg,#f87171,#991b1b)'
                    : 'linear-gradient(160deg,#F5D070,#D4AF37 55%,#9A7010)',
                  boxShadow: status === 'listening'
                    ? '0 4px 20px rgba(248,113,113,0.4), inset 0 1px 1px rgba(255,255,255,0.25)'
                    : '0 4px 20px rgba(212,175,55,0.38), inset 0 1px 1px rgba(255,255,255,0.35)',
                  opacity: status === 'unsupported' ? 0.3 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'box-shadow 0.2s ease, transform 0.12s ease',
                  position: 'relative', zIndex: 1,
                }}
                onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.94)' }}
                onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
              >
                <MicIcon size={21} color={status === 'listening' ? '#2a0a0a' : '#191305'} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 14 }}>
              <StatusGlyph status={status} />
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
                color: status === 'error' ? '#f87171' : status === 'listening' ? '#f87171' : 'rgba(255,255,255,0.38)',
              }}>
                {STATUS_LABEL[status]}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 58, height: 58, borderRadius: '50%', border: '1px solid rgba(212,175,55,0.32)', cursor: 'pointer',
          background: open ? 'linear-gradient(160deg,#1c1c1c,#0d0d0d)' : 'linear-gradient(160deg,#F5D070,#D4AF37 55%,#9A7010)',
          boxShadow: open
            ? '0 10px 32px rgba(0,0,0,0.55)'
            : '0 10px 32px rgba(0,0,0,0.5), 0 0 22px rgba(212,175,55,0.3), inset 0 1px 1px rgba(255,255,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: open ? 'none' : 'vcBreathe 3.2s ease-in-out infinite',
          transition: 'background 0.2s ease',
        }}
        aria-label="Voice coach"
      >
        {open ? <CloseIcon size={18} /> : <MicIcon size={22} color="#191305" />}
      </button>
    </div>
  )
}
