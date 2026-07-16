'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitAssessment } from './actions'

type Phase = 'intro' | 'rating' | 'questions'

const QUESTIONS = [
  {
    key: 'wins', fieldName: 'wins', label: 'Wins', emoji: '🏆',
    color: '#22c55e', colorBg: 'rgba(34,197,94,0.08)', colorBorder: 'rgba(34,197,94,0.2)',
    prompt: "What did you accomplish this week that you're proud of?",
    subprompt: 'Big or small — every win counts. Name what moved forward.',
    spark: "Even tiny progress is real progress. What almost doesn't feel worth mentioning — but is?",
    placeholder: 'I finally had the hard conversation, shipped the project, ran the longest distance of my life...',
  },
  {
    key: 'challenges', fieldName: 'challenges', label: 'Challenges', emoji: '⚡',
    color: '#f59e0b', colorBg: 'rgba(245,158,11,0.08)', colorBorder: 'rgba(245,158,11,0.2)',
    prompt: 'Where did you fall short this week?',
    subprompt: 'No judgment here. Naming it honestly is the whole point.',
    spark: 'What would you tell a close friend who experienced this exact situation?',
    placeholder: 'I avoided the thing I was supposed to do, slipped on my morning routine, let a deadline slip...',
  },
  {
    key: 'lessons', fieldName: 'lessons', label: 'Lesson', emoji: '💡',
    color: '#a78bfa', colorBg: 'rgba(167,139,250,0.08)', colorBorder: 'rgba(167,139,250,0.2)',
    prompt: "What's the most important thing you learned?",
    subprompt: 'About yourself, your work, or what actually moves the needle.',
    spark: 'What will you do differently next week because of this?',
    placeholder: 'I learned that I do my best thinking before 9am, that I underestimate how long things take...',
  },
  {
    key: 'intentions', fieldName: 'intentions', label: 'Next 7 Days', emoji: '🎯',
    color: '#D4AF37', colorBg: 'rgba(212,175,55,0.08)', colorBorder: 'rgba(212,175,55,0.2)',
    prompt: 'What will you commit to in the next 7 days?',
    subprompt: "Vague commitments don't get done. One specific, non-negotiable thing.",
    spark: 'What one action, if you took it, would make everything else easier this week?',
    placeholder: 'I will finish the investor deck by Thursday, hit the gym 4 times, send the proposal...',
  },
  {
    key: 'gratitude', fieldName: 'gratitude', label: 'Your Circle', emoji: '🤝',
    color: '#38bdf8', colorBg: 'rgba(56,189,248,0.08)', colorBorder: 'rgba(56,189,248,0.2)',
    prompt: 'Where do you need your Circle this week?',
    subprompt: 'Ask specifically. They show up when they know exactly how.',
    spark: "Is there something you've been dealing with alone that someone in your Circle could actually help with?",
    placeholder: 'I need someone to review my pitch, accountability on my routine, perspective on a hard decision...',
  },
  {
    key: 'week_title', fieldName: 'week_title', label: 'Chapter Title', emoji: '✍️',
    color: '#e879f9', colorBg: 'rgba(232,121,249,0.08)', colorBorder: 'rgba(232,121,249,0.2)',
    prompt: 'If this week were a chapter in your story, what would it be called?',
    subprompt: 'Two to five words. Make it yours.',
    spark: 'What single phrase captures the energy, the struggle, or the breakthrough of these last 7 days?',
    placeholder: '"The Comeback", "Quiet Wins", "Building in the Dark", "One Step Closer"...',
    isTitle: true,
  },
]

const RATING_COLOR: Record<number, string> = {
  1: '#f87171', 2: '#f87171', 3: '#fb923c', 4: '#fbbf24', 5: '#fbbf24',
  6: '#D4AF37', 7: '#D4AF37', 8: '#4ade80', 9: '#4ade80', 10: '#22c55e',
}

export function AssessForm({ weekStart, streak }: { weekStart: string; streak: number }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [step, setStep] = useState(1)
  const [rating, setRating] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  function setAnswer(key: string, value: string) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    if (rating === 0) { setError('Please select a rating'); return }
    setError('')
    startTransition(async () => {
      const formData = new FormData()
      formData.set('rating', String(rating))
      formData.set('wins', answers.wins ?? '')
      formData.set('challenges', answers.challenges ?? '')
      formData.set('lessons', answers.lessons ?? '')
      formData.set('intentions', answers.intentions ?? '')
      formData.set('gratitude', answers.gratitude ?? '')
      formData.set('week_title', answers.week_title ?? '')
      const result = await submitAssessment(weekStart, formData)
      if (result.error) { setError(result.error); return }
      router.push('/home#reflection')
    })
  }

  // ─── INTRO PHASE ───
  if (phase === 'intro') {
    return (
      <div>
        {/* Hero card */}
        <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', marginBottom: 16, background: 'linear-gradient(160deg,#1C1200 0%,#0E0E0E 60%,#080808 100%)', border: '1px solid rgba(212,175,55,0.18)', padding: '28px 24px 24px' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(212,175,55,0.07)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#D4AF37' }}>
                WEEKLY REFLECTION · WEEK OF {weekStart.toUpperCase()}
              </p>
              <span className="pulse-gold" style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4AF37', flexShrink: 0, display: 'inline-block' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
              <span className="gold-text" style={{ fontSize: 72, fontWeight: 900, lineHeight: 0.9 }}>{streak}</span>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.2 }}>{streak === 1 ? 'week' : 'weeks'} of</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.2 }}>showing up.</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 300, marginTop: 10, lineHeight: 1.6 }}>
              The difference between people who grow and people who repeat the same year is this: one writes it down. The other guesses.
            </p>
          </div>
        </div>

        {/* Question preview */}
        <div className="card" style={{ padding: '16px 18px', marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>6 QUESTIONS · ~12 MIN</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {QUESTIONS.map(q => (
              <div key={q.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, background: q.colorBg, border: `1px solid ${q.colorBorder}` }}>
                  {q.emoji}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: q.color }}>{q.label}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>{q.subprompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="btn-gold" style={{ fontSize: 15, letterSpacing: '0.04em' }} onClick={() => setPhase('rating')}>
          BEGIN REFLECTION →
        </button>
      </div>
    )
  }

  // ─── RATING PHASE ───
  if (phase === 'rating') {
    return (
      <div>
        <button onClick={() => setPhase('intro')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 28, fontFamily: 'Satoshi,sans-serif' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.48)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)' }}>Back</span>
        </button>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>BEFORE WE BEGIN</p>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 10 }}>How did this week feel?</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', fontWeight: 300, lineHeight: 1.7 }}>Gut level. Don&apos;t think too hard about it. One to ten.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 12 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button key={n} onClick={() => setRating(n)} style={{
              padding: '14px 0', borderRadius: 12, border: '1px solid', fontSize: 18, fontWeight: 900,
              cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s',
              background: rating === n ? `linear-gradient(135deg,${RATING_COLOR[n]},${RATING_COLOR[n]}88)` : 'rgba(255,255,255,0.04)',
              color: rating === n ? '#000' : 'rgba(255,255,255,0.52)',
              borderColor: rating === n ? 'transparent' : 'rgba(255,255,255,0.08)',
              transform: rating === n ? 'scale(1.08)' : 'scale(1)',
            }}>
              {n}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 36 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Rough week</span>
          {rating > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: rating >= 8 ? '#22c55e' : rating >= 5 ? '#D4AF37' : '#f59e0b' }}>
              {rating >= 8 ? 'Strong week 🔥' : rating >= 5 ? 'Solid week ✓' : 'Tough but here ⚡'}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Exceptional</span>
        </div>

        <button className="btn-gold" onClick={() => { if (rating > 0) { setStep(1); setPhase('questions') } }}
          style={{ opacity: rating === 0 ? 0.4 : 1, cursor: rating === 0 ? 'default' : 'pointer' }}>
          CONTINUE →
        </button>
      </div>
    )
  }

  // ─── QUESTIONS PHASE ───
  const q = QUESTIONS[step - 1]
  return (
    <div>
      {/* Color progress bar */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 36 }}>
        {QUESTIONS.map((q, i) => (
          <div key={q.key} style={{ flex: 1, height: 3, borderRadius: 2, transition: 'background 0.3s', background: i < step ? q.color : 'rgba(255,255,255,0.07)' }} />
        ))}
      </div>

      {/* Question header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, background: q.colorBg, border: `1px solid ${q.colorBorder}` }}>
          {q.emoji}
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 2, color: q.color }}>
            {step} OF 6 · {q.label.toUpperCase()}
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>Week of {weekStart}</p>
        </div>
      </div>

      <h2 style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 8 }}>{q.prompt}</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', fontWeight: 300, lineHeight: 1.65, marginBottom: 24 }}>{q.subprompt}</p>

      {(q as { isTitle?: boolean }).isTitle ? (
        <input
          type="text"
          value={answers[q.fieldName] ?? ''}
          onChange={e => setAnswer(q.fieldName, e.target.value)}
          placeholder={q.placeholder}
          autoComplete="off"
          className="cc-input"
          style={{ marginBottom: 12, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', height: 64 }}
        />
      ) : (
        <textarea
          value={answers[q.fieldName] ?? ''}
          onChange={e => setAnswer(q.fieldName, e.target.value)}
          placeholder={q.placeholder}
          rows={6}
          autoComplete="off"
          className="cc-input"
          style={{ marginBottom: 12, fontSize: 14, lineHeight: 1.65 }}
        />
      )}

      {/* Writing spark */}
      <div style={{ marginBottom: 24, padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💬</span>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.55, fontStyle: 'italic' }}>{q.spark}</p>
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-ghost" style={{ width: 'auto', padding: '13px 22px' }}
          onClick={() => step > 1 ? setStep(s => s - 1) : setPhase('rating')}>
          ← Back
        </button>
        <button className="btn-gold" disabled={isPending}
          onClick={() => step < 6 ? setStep(s => s + 1) : handleSubmit()}>
          {step < 6 ? 'CONTINUE →' : (isPending ? 'SUBMITTING…' : 'SUBMIT REFLECTION')}
        </button>
      </div>
    </div>
  )
}
