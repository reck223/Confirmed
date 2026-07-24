'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { PERSONAS, type PersonaId } from '@/app/api/voice/personas'

type Turn = { role: 'user' | 'assistant'; content: string }
type Status = 'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported' | 'error'

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Tap to talk',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  unsupported: 'Voice not supported in this browser',
  error: 'Something went wrong — try again',
}

export function VoiceCoach() {
  const [open, setOpen] = useState(false)
  const [persona, setPersona] = useState<PersonaId>('motivator')
  const [status, setStatus] = useState<Status>('idle')
  const [history, setHistory] = useState<Turn[]>([])
  const historyRef = useRef<Turn[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { historyRef.current = history }, [history])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [history])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) setStatus('unsupported')
  }, [])

  const speak = useCallback(async (text: string) => {
    setStatus('speaking')
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona }),
      })
      if (!res.ok) { setStatus('error'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = audioRef.current ?? new Audio()
      audioRef.current = audio
      audio.src = url
      audio.onended = () => { URL.revokeObjectURL(url); setStatus('idle') }
      audio.onerror = () => { URL.revokeObjectURL(url); setStatus('error') }
      await audio.play()
    } catch {
      setStatus('error')
    }
  }, [persona])

  const handleUserMessage = useCallback(async (message: string) => {
    const nextHistory = [...historyRef.current, { role: 'user' as const, content: message }]
    setHistory(nextHistory)
    setStatus('thinking')
    try {
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
  }, [persona, speak])

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

  const p = PERSONAS[persona]
  const busy = status === 'thinking' || status === 'speaking' || status === 'listening'

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', zIndex: 200 }}>
      {open && (
        <div style={{
          width: 300, marginBottom: 12, borderRadius: 20,
          background: 'linear-gradient(160deg,#141414 0%,#0a0a0a 100%)',
          border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden', fontFamily: 'Satoshi,sans-serif',
        }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
          </div>

          <div ref={scrollRef} style={{ maxHeight: 260, minHeight: 80, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.length === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                Talk to {p.name} — {p.tagline.toLowerCase()}. Tap the mic below and start speaking.
              </p>
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
