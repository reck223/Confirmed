'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeModule } from './actions'

const STEPS = [
  {
    emoji: '⭕',
    title: 'What Is a Circle?',
    body: "Most support systems fail because they're too big, too public, or too casual. A Circle fixes all three. It's a private group of up to 10 people who hold each other to a real standard — not by cheerleading, but by showing up consistently, asking hard questions, and refusing to let each other coast. This is where progress actually happens.",
    bullets: [
      'Private by design — your vulnerabilities don\'t leave this room',
      'Small on purpose — 5 to 10 people who actually know your goals',
      'Built for real talk, not performance. No highlight reels.',
      'You set the standard. Everyone else rises to it.',
    ],
  },
  {
    emoji: '🎯',
    title: "The Leader's Job",
    body: "You didn't create a group chat — you created a culture. Your job isn't to motivate everyone. It's to show up so consistently that presence becomes the norm. When the leader posts, reacts, and runs sessions, members follow. When the leader goes quiet, the Circle dies. You set the tone.",
    bullets: [
      'Show up before you ask others to — post first, react first',
      'Notice when someone goes quiet. One message can pull them back.',
      'Celebrate the small stuff — milestones don\'t have to be big to matter',
      'Run sessions. Twenty minutes of shared accountability beats weeks of solo grind.',
    ],
  },
  {
    emoji: '📜',
    title: 'The Code',
    body: 'A Circle only works if everyone trusts it completely. These are not suggestions — they are the foundation. As creator, you are responsible for upholding them and making sure your members understand what they are agreeing to.',
    bullets: [
      'What\'s shared in Circle stays in Circle. No exceptions, ever.',
      'Honesty over positivity. Support that ignores reality isn\'t support.',
      'Showing up imperfectly beats not showing up at all.',
      'If there\'s conflict, handle it directly. Passive silence kills Circles.',
      'One focus. One group. Keep the signal clean.',
    ],
  },
  {
    emoji: '🗓️',
    title: 'Your First 30 Days',
    body: "The first month makes or breaks a Circle. Most fall apart because the leader waited for momentum instead of creating it. Don't wait. Here's the exact playbook.",
    bullets: [
      'Days 1–3: Get 3–5 people in. Quality over quantity — choose people who actually want this.',
      'Day 7: Share your first post. Set the tone before anyone else has to.',
      'Week 2: Schedule your first live session. Twenty minutes changes the energy.',
      'Week 3: Name a monthly focus. One shared theme gives everyone something to point toward.',
      'Week 4: Reflect publicly. What moved? What didn\'t? Model the habit you want to see.',
    ],
  },
  {
    emoji: '🤝',
    title: 'Before You Lead',
    body: "A Circle isn't a feature you unlock — it's a responsibility you take on. The people who join you will invest their honesty, their time, and their trust. They deserve a leader who takes that seriously.",
    bullets: [
      'I will show up consistently — for my members, not just for myself',
      'I will protect what\'s shared in Circle as if it\'s not mine to share',
      'I will lead with honesty, even when it\'s uncomfortable',
      'I understand that going quiet without warning isn\'t an option',
      'If I step back, I will hand off or close with respect — not disappear',
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
