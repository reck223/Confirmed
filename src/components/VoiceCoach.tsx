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
      {open && (
        <div style={{
          width: 300, marginBottom: 12, borderRadius: 20,
          background: 'linear-gradient(160deg,#141414 0%,#0a0a0a 100%)',
          border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden', fontFamily: 'Satoshi,sans-serif',
        }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {fillMode ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: '#D4AF37' }}>
                  {handsFree ? `🎧 HANDS-FREE ${queuePos}/${queueTotal} · ${fillLabel?.toUpperCase()}` : `FILLING: ${fillLabel?.toUpperCase()}`}
                </p>
                <button onClick={exitFill} style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ✕ {handsFree ? 'Stop' : 'Cancel'}
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>VOICE COACH</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(Object.keys(PERSONAS) as PersonaId[]).map(id => {
                    const sel = id === persona
                    return (
                      <button
                        key={id}
                        disabled={busy}
                        onClick={() => setPersona(id)}
                        style={{
                          flex: 1, padding: '7px 4px', borderRadius: 10, cursor: busy ? 'default' : 'pointer',
                          border: `1px solid ${sel ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          background: sel ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
                          color: sel ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                          fontFamily: 'Satoshi,sans-serif', fontSize: 10, fontWeight: 800, opacity: busy ? 0.5 : 1,
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

          <div ref={scrollRef} style={{ maxHeight: 260, minHeight: 80, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                  Talk to {p.name} — {p.tagline.toLowerCase()}. Tap the mic below and start speaking.
                </p>
                {availableFills.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.06em', marginTop: 8 }}>OR FILL THIS OUT BY VOICE</p>
                    {availableFills.map(f => (
                      <button
                        key={f.id}
                        onClick={() => startFill(f.id)}
                        style={{
                          textAlign: 'left', padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                          border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.06)',
                          color: '#D4AF37', fontFamily: 'Satoshi,sans-serif', fontSize: 11, fontWeight: 700,
                        }}
                      >
                        🎙️ {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : history.map((t, i) => (
              <div key={i} style={{ alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <p style={{
                  fontSize: 12, lineHeight: 1.5, padding: '8px 12px', borderRadius: 14,
                  background: t.role === 'user' ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.05)',
                  color: t.role === 'user' ? '#EFEFEF' : 'rgba(255,255,255,0.75)',
                }}>
                  {t.content}
                </p>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              onClick={startListening}
              disabled={busy || status === 'unsupported'}
              style={{
                width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: busy ? 'default' : 'pointer',
                background: status === 'listening'
                  ? 'radial-gradient(circle,#f87171,#991b1b)'
                  : 'radial-gradient(circle,#D4AF37,#9A7010)',
                boxShadow: status === 'listening' ? '0 0 24px rgba(248,113,113,0.5)' : '0 0 20px rgba(212,175,55,0.4)',
                fontSize: 20, opacity: status === 'unsupported' ? 0.3 : 1,
                transition: 'box-shadow 0.2s ease',
              }}
            >
              🎙️
            </button>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>{STATUS_LABEL[status]}</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 56, height: 56, borderRadius: '50%', border: '1px solid rgba(212,175,55,0.3)', cursor: 'pointer',
          background: open ? '#141414' : 'linear-gradient(160deg,#1a1a1a,#0a0a0a)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.15)',
          fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="Voice coach"
      >
        {open ? '✕' : '🎙️'}
      </button>
    </div>
  )
}
