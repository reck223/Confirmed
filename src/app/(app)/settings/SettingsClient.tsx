'use client'
import { useState, useTransition } from 'react'
import { updateProfile, signOut } from './actions'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'

const FOCUS_AREAS = [
  { key: 'health',        emoji: '💪', label: 'Health',    color: '#4ade80' },
  { key: 'career',        emoji: '💼', label: 'Career',    color: '#a78bfa' },
  { key: 'finance',       emoji: '💰', label: 'Finance',   color: '#fbbf24' },
  { key: 'learning',      emoji: '📚', label: 'Learning',  color: '#38bdf8' },
  { key: 'creative',      emoji: '🎨', label: 'Creative',  color: '#f97316' },
  { key: 'relationships', emoji: '🤝', label: 'Relations', color: '#f472b6' },
]
const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const TIMES = [
  { value: 'morning',   label: '🌅  Morning (8–10am)' },
  { value: 'afternoon', label: '☀️  Afternoon (12–2pm)' },
  { value: 'evening',   label: '🌙  Evening (7–9pm)' },
]

function SectionLabel({ label, color = '#D4AF37' }: { label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingLeft: 2 }}>
      <div style={{ width: 2, height: 13, borderRadius: 1, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.28)' }}>
        {label}
      </span>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 20,
      background: 'linear-gradient(160deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function Field({ emoji, color, label, children, last }: {
  emoji: string; color: string; label: string; children: React.ReactNode; last?: boolean
}) {
  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)',
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 34, height: 34, flexShrink: 0, borderRadius: 10,
        background: `${color}14`, border: `1px solid ${color}26`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, marginTop: 2,
      }}>
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 7 }}>
          {label}
        </p>
        {children}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.07)',
  color: '#E8E8E8', fontSize: 14, fontFamily: 'Satoshi,sans-serif',
  outline: 'none', boxSizing: 'border-box',
}

export function SettingsClient({ profile }: { profile: Profile }) {
  const [focusAreas, setFocusAreas]  = useState<string[]>(profile.focus_areas ?? [])
  const [saved, setSaved]            = useState(false)
  const [error, setError]            = useState('')
  const [isPending, startTransition] = useTransition()
  const [signingOut, startSignOut]   = useTransition()

  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [pwError, setPwError]                 = useState('')
  const [pwSaved, setPwSaved]                 = useState(false)
  const [pwPending, setPwPending]             = useState(false)

  const initials = (profile.full_name ?? profile.username ?? '?').slice(0, 2).toUpperCase()

  async function handlePasswordChange() {
    setPwError('')
    if (newPassword.length < 8) { setPwError('At least 8 characters required'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    setPwPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwPending(false)
    if (error) { setPwError(error.message); return }
    setPwSaved(true); setNewPassword(''); setConfirmPassword('')
    setTimeout(() => setPwSaved(false), 3000)
  }

  function handleSubmit(formData: FormData) {
    setError('')
    focusAreas.forEach(a => formData.append('focus_areas', a))
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result?.error) { setError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px 100px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes pulse-ring { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.03)} }

        .s-input:focus {
          border-color: rgba(212,175,55,0.4) !important;
          box-shadow: 0 0 0 3px rgba(212,175,55,0.08), inset 0 0 0 1px rgba(212,175,55,0.12) !important;
          background: rgba(0,0,0,0.38) !important;
        }
        .s-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23444' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 34px !important;
          cursor: pointer;
        }
        .focus-pill {
          padding: 13px 8px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-family: Satoshi,sans-serif;
          -webkit-tap-highlight-color: transparent;
          position: relative;
          overflow: hidden;
        }
        .focus-pill:active { transform: scale(0.93) !important; }
        .focus-pill .fp-emoji { font-size: 22px; transition: transform 0.2s; display: block; }
        .focus-pill:hover .fp-emoji { transform: scale(1.15); }
        .focus-pill.fp-active { transform: scale(1.03); }

        .save-btn {
          width: 100%; padding: 16px; border-radius: 16px;
          font-size: 13px; font-weight: 800; letter-spacing: 0.08em;
          cursor: pointer; font-family: Satoshi,sans-serif; border: none;
          transition: all 0.22s; position: relative; overflow: hidden;
        }
        .save-btn:not(:disabled):hover { filter: brightness(1.08); }
        .save-btn:not(:disabled):active { transform: scale(0.98); }

        .pw-show-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.3); padding: 4px; font-size: 15px;
          transition: color 0.15s;
        }
        .pw-show-btn:hover { color: rgba(255,255,255,0.6); }

        .signout-btn {
          width: 100%; padding: 15px; border-radius: 14px;
          font-size: 13px; font-weight: 700; letter-spacing: 0.04em;
          cursor: pointer; font-family: Satoshi,sans-serif;
          border: 1px solid rgba(239,68,68,0.18);
          background: rgba(239,68,68,0.06); color: #f87171;
          transition: all 0.18s;
        }
        .signout-btn:hover {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.3);
          box-shadow: 0 4px 20px rgba(239,68,68,0.1);
        }
        .signout-btn:active { transform: scale(0.98); }
      `}</style>

      {/* ── Page title ── */}
      <div style={{ padding: '32px 0 0', animation: 'fadeUp 0.3s ease both' }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(212,175,55,0.55)', marginBottom: 4 }}>
          ACCOUNT
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.03em', lineHeight: 1 }}>
          Settings
        </h1>
      </div>

      {/* ── Avatar hero card ── */}
      <div style={{ animation: 'fadeUp 0.3s 0.06s ease both', marginTop: 24, marginBottom: 24 }}>
        <div style={{
          borderRadius: 24,
          background: 'linear-gradient(160deg, rgba(212,175,55,0.07) 0%, rgba(255,255,255,0.02) 60%)',
          border: '1px solid rgba(212,175,55,0.12)',
          boxShadow: 'inset 0 1px 0 rgba(212,175,55,0.08)',
          padding: '28px 20px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Ambient top glow */}
          <div style={{
            position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
            width: 200, height: 120,
            background: 'radial-gradient(ellipse, rgba(212,175,55,0.11), transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Avatar with gradient ring */}
          <div style={{ animation: 'pulse-ring 3.5s ease-in-out infinite' }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%', padding: 2.5,
              background: 'linear-gradient(135deg, #D4AF37 0%, #7a5800 50%, #D4AF37 100%)',
              boxShadow: '0 0 0 1px rgba(212,175,55,0.08), 0 8px 32px rgba(212,175,55,0.2)',
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: 'linear-gradient(145deg, #1c1c1c, #111)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.02em',
              }}>
                {initials}
              </div>
            </div>
          </div>

          {/* Name + handle */}
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 3 }}>
              {profile.full_name ?? 'Your Name'}
            </p>
            <p style={{ fontSize: 13, color: '#D4AF37', fontWeight: 600, opacity: 0.7 }}>
              @{profile.username ?? 'handle'}
            </p>
            {profile.tagline && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginTop: 7, fontStyle: 'italic', maxWidth: 260 }}>
                &ldquo;{profile.tagline}&rdquo;
              </p>
            )}
          </div>

          {/* Focus area chips */}
          {focusAreas.length > 0 && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                padding: '5px 14px', borderRadius: 20,
                background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
                fontSize: 11, color: '#D4AF37', fontWeight: 700, letterSpacing: '0.03em',
              }}>
                ✦ {focusAreas.length} focus area{focusAreas.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Profile ── */}
        <div style={{ animation: 'fadeUp 0.3s 0.1s ease both' }}>
          <SectionLabel label="PROFILE" />
          <Card>
            <Field emoji="✏️" color="#a78bfa" label="DISPLAY NAME">
              <input name="full_name" defaultValue={profile.full_name ?? ''} placeholder="Your full name"
                className="s-input" style={inp} />
            </Field>
            <Field emoji="@" color="#38bdf8" label="USERNAME">
              <input name="username" defaultValue={profile.username ?? ''} placeholder="@yourhandle"
                className="s-input" style={inp} />
            </Field>
            <Field emoji="⚡" color="#f97316" label="TAGLINE">
              <input name="tagline" defaultValue={profile.tagline ?? ''} placeholder="What are you building?"
                className="s-input" style={inp} />
            </Field>
            <Field emoji="📝" color="#4ade80" label="BIO" last>
              <textarea name="bio" defaultValue={profile.bio ?? ''} placeholder="Tell your circle what you're working toward…"
                rows={3} className="s-input" style={{ ...inp, resize: 'none', lineHeight: 1.65 }} />
            </Field>
          </Card>
        </div>

        {/* ── Focus Areas ── */}
        <div style={{ animation: 'fadeUp 0.3s 0.14s ease both' }}>
          <SectionLabel label="FOCUS AREAS" color="#fbbf24" />
          <Card>
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.24)', marginBottom: 14, lineHeight: 1.65 }}>
                What are you leveling up? Your circle sees this.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {FOCUS_AREAS.map(area => {
                  const active = focusAreas.includes(area.key)
                  return (
                    <button
                      key={area.key} type="button"
                      onClick={() => setFocusAreas(prev =>
                        prev.includes(area.key) ? prev.filter(a => a !== area.key) : [...prev, area.key]
                      )}
                      className={`focus-pill${active ? ' fp-active' : ''}`}
                      style={{
                        border: `1px solid ${active ? area.color + '40' : 'rgba(255,255,255,0.07)'}`,
                        background: active ? `${area.color}12` : 'rgba(255,255,255,0.025)',
                        boxShadow: active ? `0 0 18px ${area.color}18, inset 0 1px 0 ${area.color}20` : 'none',
                      }}
                    >
                      <span className="fp-emoji">{area.emoji}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                        color: active ? area.color : 'rgba(255,255,255,0.32)',
                        transition: 'color 0.18s',
                      }}>
                        {area.label}
                      </span>
                      {active && (
                        <div style={{
                          width: 4, height: 4, borderRadius: '50%',
                          background: area.color, boxShadow: `0 0 6px ${area.color}`,
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>
              {focusAreas.length > 0 && (
                <p style={{ fontSize: 11, color: 'rgba(212,175,55,0.55)', fontWeight: 700, marginTop: 14, textAlign: 'center', letterSpacing: '0.04em' }}>
                  {focusAreas.length} selected ✓
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* ── Weekly Reflection ── */}
        <div style={{ animation: 'fadeUp 0.3s 0.18s ease both' }}>
          <SectionLabel label="WEEKLY REFLECTION" color="#38bdf8" />
          <Card>
            <Field emoji="📅" color="#38bdf8" label="DAY">
              <select name="assessment_day" defaultValue={profile.assessment_day ?? 'Sunday'}
                className="s-input s-select" style={inp}>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field emoji="🕐" color="#a78bfa" label="TIME" last>
              <select name="assessment_time" defaultValue={profile.assessment_time ?? 'evening'}
                className="s-input s-select" style={inp}>
                {TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </Card>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 14,
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
            boxShadow: 'inset 0 1px 0 rgba(239,68,68,0.08)',
          }}>
            <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="save-btn"
          style={{
            animation: 'fadeUp 0.3s 0.22s ease both',
            background: saved
              ? 'rgba(74,222,128,0.12)'
              : isPending
              ? 'rgba(212,175,55,0.08)'
              : 'linear-gradient(135deg, #D4AF37 0%, #9A7200 50%, #C09A30 100%)',
            color: saved ? '#4ade80' : isPending ? '#D4AF37' : '#0A0A0A',
            border: saved
              ? '1px solid rgba(74,222,128,0.28)'
              : isPending
              ? '1px solid rgba(212,175,55,0.15)'
              : 'none',
            boxShadow: saved || isPending
              ? 'none'
              : '0 4px 28px rgba(212,175,55,0.28), inset 0 1px 0 rgba(255,255,255,0.14)',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {saved ? '✓  CHANGES SAVED' : isPending ? 'SAVING…' : 'SAVE CHANGES'}
        </button>
      </form>

      {/* ── Security ── */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ animation: 'fadeUp 0.3s 0.26s ease both' }}>
          <SectionLabel label="SECURITY" color="#f87171" />
          <Card>
            <Field emoji="🔐" color="#f87171" label="NEW PASSWORD">
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="s-input"
                  style={{ ...inp, paddingRight: 44 }}
                />
                <button type="button" className="pw-show-btn" onClick={() => setShowNew(v => !v)}>
                  {showNew ? '🙈' : '👁️'}
                </button>
              </div>
            </Field>
            <Field emoji="🔑" color="#fbbf24" label="CONFIRM PASSWORD" last>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="s-input"
                  style={{ ...inp, paddingRight: 44 }}
                />
                <button type="button" className="pw-show-btn" onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
              {pwError && (
                <p style={{ fontSize: 12, color: '#f87171', fontWeight: 600, marginTop: 8 }}>{pwError}</p>
              )}
              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={pwPending || !newPassword}
                style={{
                  marginTop: 12, width: '100%', padding: '13px', borderRadius: 12,
                  fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
                  cursor: !newPassword ? 'not-allowed' : 'pointer',
                  fontFamily: 'Satoshi,sans-serif',
                  background: pwSaved ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                  color: pwSaved ? '#4ade80' : 'rgba(255,255,255,0.55)',
                  border: pwSaved ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.08)',
                  opacity: !newPassword && !pwSaved ? 0.35 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {pwSaved ? '✓  PASSWORD UPDATED' : pwPending ? 'UPDATING…' : 'UPDATE PASSWORD'}
              </button>
            </Field>
          </Card>
        </div>

        {/* ── Account ── */}
        <div style={{ animation: 'fadeUp 0.3s 0.3s ease both' }}>
          <SectionLabel label="ACCOUNT" color="#f87171" />
          <Card>
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', marginBottom: 14, lineHeight: 1.65 }}>
                Signing out will return you to the login screen.
              </p>
              <button
                className="signout-btn"
                onClick={() => startSignOut(async () => { await signOut() })}
                disabled={signingOut}
              >
                {signingOut ? 'Signing out…' : '🚪  Sign Out'}
              </button>
            </div>
          </Card>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.08)', letterSpacing: '0.12em', paddingTop: 4 }}>
          MANIFEST · BY CONFIRMED CREATIONS
        </p>
      </div>
    </div>
  )
}
