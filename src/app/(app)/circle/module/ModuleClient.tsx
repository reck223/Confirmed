'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeModule } from './actions'

const STEPS = [
  {
    emoji: '⭕',
    title: 'What Is a Circle?',
    body: "A Circle is a small, private accountability group — up to 10 people who show up for each other's goals. Unlike public feeds, Circles are where real talk happens: honest check-ins, weekly reflections, and the kind of support that actually moves the needle.",
    bullets: [
      'Private by design — what happens in Circle stays in Circle',
      'Built around shared goals, not just general chat',
      'Designed for consistency, not performance',
      'Everyone has a role. Yours, as leader, is to set the standard.',
    ],
  },
  {
    emoji: '🎯',
    title: "The Leader's Role",
    body: "As the person who creates a Circle, you set the culture. That means showing up consistently, acknowledging members' wins, and making sure no one falls off silently. You don't need to have it all figured out — you just need to be present.",
    bullets: [
      'Check in at least once a week — post, react, comment',
      'Run sessions to keep momentum (even 20 min matters)',
      'Celebrate milestones — make progress feel real',
      'Notice when someone goes quiet. Reach out.',
    ],
  },
  {
    emoji: '📜',
    title: 'Circle Guidelines',
    body: 'Every Circle runs on trust. These are the rules that keep it that way. As the creator, you are responsible for upholding them and setting the example for your members.',
    bullets: [
      'Privacy first — never share what others post in Circle',
      'No judgment — support and honesty only',
      'Consistency over perfection — missing a week is fine, disappearing is not',
      'Conflicts happen. Address them directly, not passively.',
      'Keep it focused. One group, one mission.',
    ],
  },
  {
    emoji: '🗓️',
    title: 'Running Your First Circle',
    body: "Here's what the first 30 days look like. Stick to this and your Circle will have momentum before the month is out.",
    bullets: [
      'Week 1 — Share your code. Get 3–5 committed members in.',
      'Week 1 — Set a group focus: one theme for the month.',
      'Week 2 — Schedule your first session. Even 20 minutes counts.',
      'Ongoing — Post at least once a week: a win, a struggle, or a goal update.',
      'Week 4 — Reflect on the month. What worked? What didn\'t?',
    ],
  },
  {
    emoji: '🤝',
    title: 'Your Commitment',
    body: 'Creating a Circle is not just unlocking a feature — it is taking on a responsibility to the people who join you. Before you request access, commit to the following.',
    bullets: [
      'I will show up consistently for my members',
      'I will keep Circle conversations private',
      'I will create a space where honesty and real growth come first',
      'I understand that leading a Circle is a responsibility, not just a role',
      'If I step back, I will hand off leadership or close the Circle with respect',
    ],
  },
]

export function ModuleClient({ alreadyComplete }: { alreadyComplete: boolean }) {
  const [step, setStep] = useState(0)
  const [completing, startComplete] = useTransition()
  const [done, setDone] = useState(alreadyComplete)
  const router = useRouter()

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const progress = ((step + 1) / STEPS.length) * 100

  function handleComplete() {
    startComplete(async () => {
      await completeModule()
      setDone(true)
    })
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 0 60px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .module-step { animation: fadeUp 0.35s ease both; }
      `}</style>

      {/* Header */}
      <div style={{ padding: '24px 20px 0' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>CIRCLE CREATOR MODULE</p>
        <p style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 16 }}>Learn to Lead</p>

        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', marginBottom: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#D4AF37,#f97316)', borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginBottom: 28 }}>Step {step + 1} of {STEPS.length}</p>
      </div>

      {done ? (
        /* ── Completion state ── */
        <div style={{ margin: '0 20px', borderRadius: 24, background: 'linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.04))', border: '1px solid rgba(212,175,55,0.3)', padding: 32, textAlign: 'center', animation: 'fadeUp 0.4s ease both' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🏆</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: '#D4AF37', marginBottom: 8 }}>Module Complete</p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6, marginBottom: 28 }}>You've completed the Circle Creator Module. Head back to your Circle tab to check your remaining requirements and request access.</p>
          <button onClick={() => router.push('/circle')} style={{ width: '100%', padding: '14px 0', borderRadius: 14, background: 'linear-gradient(135deg,#D4AF37,#f97316)', border: 'none', fontSize: 14, fontWeight: 800, color: '#0A0A0A', cursor: 'pointer', letterSpacing: '0.04em' }}>
            GO TO CIRCLE →
          </button>
        </div>
      ) : (
        /* ── Step content ── */
        <div key={step} className="module-step" style={{ padding: '0 20px' }}>
          {/* Step card */}
          <div style={{ borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.07)', padding: '28px 24px', marginBottom: 20 }}>
            <p style={{ fontSize: 40, marginBottom: 18 }}>{current.emoji}</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 14 }}>{current.title}</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.58)', lineHeight: 1.7, marginBottom: 22 }}>{current.body}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {current.bullets.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: '#D4AF37' }}>{i + 1}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#bbb', lineHeight: 1.6, margin: 0 }}>{b}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 99, background: i === step ? '#D4AF37' : i < step ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.08)', transition: 'all 0.3s ease' }} />
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{ flex: 1, padding: '14px 0', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.42)', cursor: 'pointer' }}
              >
                Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={handleComplete}
                disabled={completing}
                style={{ flex: 2, padding: '14px 0', borderRadius: 14, background: completing ? 'rgba(212,175,55,0.3)' : 'linear-gradient(135deg,#D4AF37,#f97316)', border: 'none', fontSize: 14, fontWeight: 800, color: '#0A0A0A', cursor: completing ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}
              >
                {completing ? 'SAVING...' : 'COMPLETE MODULE ✓'}
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                style={{ flex: 2, padding: '14px 0', borderRadius: 14, background: 'linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.06))', border: '1px solid rgba(212,175,55,0.25)', fontSize: 14, fontWeight: 800, color: '#D4AF37', cursor: 'pointer', letterSpacing: '0.04em' }}
              >
                NEXT →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
