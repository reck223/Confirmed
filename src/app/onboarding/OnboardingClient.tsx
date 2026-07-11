'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { checkUsername, saveOnboarding } from './actions'

const FOCUS_AREAS = [
  { key: 'health',        emoji: '💪', label: 'Health' },
  { key: 'career',        emoji: '💼', label: 'Career' },
  { key: 'finance',       emoji: '💰', label: 'Finance' },
  { key: 'learning',      emoji: '📚', label: 'Learning' },
  { key: 'creative',      emoji: '🎨', label: 'Creative' },
  { key: 'business',      emoji: '🚀', label: 'Business' },
  { key: 'mindset',       emoji: '🧘', label: 'Mindset' },
  { key: 'relationships', emoji: '❤️', label: 'Relationships' },
  { key: 'personal',      emoji: '⭐', label: 'Personal' },
  { key: 'adventure',     emoji: '🌍', label: 'Adventure' },
  { key: 'spiritual',     emoji: '✨', label: 'Spiritual' },
]

const FEATURES = [
  { emoji: '🎯', title: "Today's Focus", desc: 'Pick your top tasks each morning. Check them off as you go.' },
  { emoji: '📝', title: 'Weekly Reflection', desc: 'Rate your week, log wins, and set intentions every Sunday.' },
  { emoji: '👥', title: 'Your Circle', desc: 'Share goals with trusted people. Stay accountable together.' },
  { emoji: '✦',  title: 'Goal Templates', desc: 'Browse playbooks with milestones built in. Start strong.' },
]

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 40 }}>
      {[1, 2, 3, 4].map(s => (
        <div key={s} style={{
          height: 5,
          width: s === step ? 28 : s < step ? 16 : 6,
          borderRadius: 999,
          background: s <= step ? '#D4AF37' : 'rgba(255,255,255,0.12)',
          transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }} />
      ))}
    </div>
  )
}

export function OnboardingClient({ fullName }: { fullName: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [tagline, setTagline] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const firstName = fullName.split(' ')[0] || 'there'
  const usernameClean = username.toLowerCase().replace(/[^a-z0-9_]/g, '')
  const usernameValid = usernameClean.length >= 3 && usernameClean.length <= 20

  function toggleArea(key: string) {
    setFocusAreas(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function handleContinueStep2() {
    if (!usernameValid) { setError('Username must be 3–20 characters (letters, numbers, underscores only)'); return }
    setError('')
    setLoading(true)
    const result = await checkUsername(usernameClean)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setStep(3)
  }

  async function handleEnter() {
    setError('')
    setLoading(true)
    const result = await saveOnboarding({ username: usernameClean, tagline, focusAreas, dateOfBirth })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    startTransition(() => router.push('/home'))
  }

  // ── Step 1: Welcome ──────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        <StepDots step={step} />
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 52 }}>
            <Image src="/brandlogo.png" alt="Confirmed Creations" width={1536} height={1024} priority
              className="logo-shimmer"
              style={{ width: 'min(72vw, 300px)', height: 'auto' }} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: '#D4AF37', marginBottom: 14 }}>WELCOME TO THE COMMUNITY</p>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16 }}>
            Hey, {firstName}. ✦
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.50)', fontWeight: 300, lineHeight: 1.75, marginBottom: 44 }}>
            You&apos;re in the right place.<br />
            Let&apos;s take 2 minutes to personalize your experience.
          </p>
          <button className="btn-gold" style={{ fontSize: 14, padding: '16px' }} onClick={() => setStep(2)}>
            GET STARTED →
          </button>
        </div>
      </div>
    )
  }

  // ── Step 2: Handle ───────────────────────────────────────────
  if (step === 2) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '40px 24px', position: 'relative', zIndex: 1, maxWidth: 440, margin: '0 auto', width: '100%' }}>
        <StepDots step={step} />
        <button onClick={() => { setStep(1); setError('') }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', fontSize: 13, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', padding: '0 0 32px', display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
          ← Back
        </button>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#D4AF37', marginBottom: 10 }}>STEP 1 OF 3</p>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 6 }}>Your Handle</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', fontWeight: 300, marginBottom: 32, lineHeight: 1.65 }}>
          This is how your circle will recognize you.
        </p>

        {/* Username input */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', marginBottom: 8, transition: 'border-color 0.2s, box-shadow 0.2s' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(212,175,55,0.45)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
          <span style={{ padding: '0 4px 0 18px', color: '#D4AF37', fontSize: 17, fontWeight: 900, userSelect: 'none', flexShrink: 0 }}>@</span>
          <input
            type="text"
            placeholder="yourhandle"
            value={username}
            autoFocus
            onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setError('') }}
            maxLength={20}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#EFEFEF', padding: '15px 10px', fontSize: 16, fontFamily: 'Satoshi,sans-serif', fontWeight: 500 }}
          />
          {username.length > 0 && (
            <span style={{ padding: '0 16px 0 0', fontSize: 13, fontWeight: 700, color: usernameValid ? '#22c55e' : '#888', flexShrink: 0 }}>
              {usernameValid ? '✓' : username.length < 3 ? `${3 - username.length} more` : '✗'}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 28, letterSpacing: '0.02em' }}>
          3–20 chars · letters, numbers, underscores only
        </p>

        {/* Tagline */}
        <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', display: 'block', marginBottom: 8 }}>
          TAGLINE <span style={{ color: 'rgba(255,255,255,0.22)', fontWeight: 600 }}>— OPTIONAL</span>
        </label>
        <input
          type="text"
          className="cc-input"
          placeholder="What are you building?"
          value={tagline}
          onChange={e => setTagline(e.target.value)}
          maxLength={80}
          style={{ marginBottom: 24, fontSize: 15 }}
        />

        {/* Date of Birth */}
        <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', display: 'block', marginBottom: 8 }}>
          🎂 DATE OF BIRTH <span style={{ color: 'rgba(255,255,255,0.22)', fontWeight: 600 }}>— OPTIONAL</span>
        </label>
        <input
          type="date"
          className="cc-input"
          value={dateOfBirth}
          onChange={e => setDateOfBirth(e.target.value)}
          style={{ marginBottom: 8, fontSize: 15, colorScheme: 'dark' }}
        />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 32 }}>Your circle will celebrate your birthday with you 🎉</p>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
            <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>
          </div>
        )}

        <button className="btn-gold" style={{ fontSize: 14, padding: '16px' }} onClick={handleContinueStep2} disabled={loading || !usernameValid}>
          {loading ? 'CHECKING…' : 'CONTINUE →'}
        </button>
      </div>
    )
  }

  // ── Step 3: Focus Areas ──────────────────────────────────────
  if (step === 3) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '40px 24px', position: 'relative', zIndex: 1, maxWidth: 440, margin: '0 auto', width: '100%' }}>
        <StepDots step={step} />
        <button onClick={() => { setStep(2); setError('') }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', fontSize: 13, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', padding: '0 0 32px', display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
          ← Back
        </button>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#D4AF37', marginBottom: 10 }}>STEP 2 OF 3</p>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 6 }}>What are you leveling up?</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', fontWeight: 300, marginBottom: 28, lineHeight: 1.65 }}>
          Select the areas you&apos;re most committed to.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: focusAreas.length > 0 ? 16 : 32 }}>
          {FOCUS_AREAS.map(area => (
            <button
              key={area.key}
              className={`focus-pill${focusAreas.includes(area.key) ? ' selected' : ''}`}
              onClick={() => toggleArea(area.key)}
            >
              <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>{area.emoji}</span>
              {area.label}
            </button>
          ))}
        </div>

        {focusAreas.length > 0 && (
          <p style={{ fontSize: 12, color: '#D4AF37', fontWeight: 600, marginBottom: 20, textAlign: 'center' }}>
            {focusAreas.length} area{focusAreas.length !== 1 ? 's' : ''} selected ✓
          </p>
        )}

        <button className="btn-gold" style={{ fontSize: 14, padding: '16px' }} onClick={() => setStep(4)} disabled={focusAreas.length === 0}>
          CONTINUE →
        </button>
        <button className="btn-ghost" style={{ marginTop: 10, fontSize: 13 }} onClick={() => setStep(4)}>
          Skip for now
        </button>
      </div>
    )
  }

  // ── Step 4: Feature Tour ─────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '40px 24px 32px', position: 'relative', zIndex: 1, maxWidth: 440, margin: '0 auto', width: '100%' }}>
      <StepDots step={4} />

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, rgba(212,175,55,0.22), rgba(212,175,55,0.04))', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 20px', boxShadow: '0 0 32px rgba(212,175,55,0.12)' }}>
          ✦
        </div>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#D4AF37', marginBottom: 10 }}>YOU&apos;RE ALL SET</p>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>
          Here&apos;s what&apos;s waiting<br />for you, {firstName}.
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.6 }}>
          Four tools to help you follow through.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
        {FEATURES.map(f => (
          <div key={f.title} className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>{f.emoji}</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', marginBottom: 5, lineHeight: 1.3 }}>{f.title}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.55 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14 }}>
          <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>
        </div>
      )}

      <button className="btn-gold" style={{ fontSize: 13, padding: '16px', letterSpacing: '0.06em' }} onClick={handleEnter} disabled={loading}>
        {loading ? 'SETTING UP…' : 'ENTER CONFIRMED CREATIONS →'}
      </button>
    </div>
  )
}
