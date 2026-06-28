'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile, signOut } from './actions'
import type { Profile } from '@/lib/types/database'

export function ProfileClient({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  function handleSave(formData: FormData) {
    setError('')
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.error) { setError(result.error); return }
      setSaved(true)
      setEditing(false)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    })
  }

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
      router.push('/signin')
    })
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }} className="view-panel">

      {/* Hero — avatar + name */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        {/* Cover gradient */}
        <div style={{ height: 100, borderRadius: '20px 20px 0 0', background: 'linear-gradient(135deg,#18140A,#0F0C03)', border: '1px solid rgba(212,175,55,0.15)', borderBottom: 'none', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 120% at 50% -20%, rgba(212,175,55,0.18) 0%, transparent 70%)' }} />
        </div>
        {/* Card body */}
        <div style={{ background: 'linear-gradient(160deg,#161616,#111111)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0 0 20px 20px', padding: '0 20px 20px' }}>
          {/* Avatar overlapping */}
          <div style={{ marginTop: -36, marginBottom: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#D4AF37,#8A6808)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#000', border: '3px solid #111', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#D4AF37' }}>{profile.streak ?? 0}-week streak</span>
            </div>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF', marginBottom: 4 }}>{profile.full_name ?? 'Your Name'}</h1>
          {profile.username && <p style={{ fontSize: 13, color: '#555', marginBottom: profile.tagline ? 4 : 0 }}>@{profile.username}</p>}
          {profile.tagline && <p style={{ fontSize: 13, color: '#888', fontWeight: 300, fontStyle: 'italic' }}>{profile.tagline}</p>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="STREAK" value={String(profile.streak ?? 0)} unit="wks" accent="#D4AF37" />
        <StatCard label="GOALS DONE" value={String(profile.goals_complete ?? 0)} unit="" accent="#4ade80" />
        <StatCard label="REFLECTIONS" value={String(profile.assessments_submitted ?? 0)} unit="" accent="#a78bfa" />
      </div>

      {profile.bio && (
        <div style={{ marginBottom: 20, padding: '16px 18px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <p className="profile-section-label" style={{ marginBottom: 8 }}>ABOUT</p>
          <p style={{ fontSize: 13, color: '#AAA', fontWeight: 300, lineHeight: 1.7 }}>{profile.bio}</p>
        </div>
      )}

      {saved && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>Profile saved</p>
        </div>
      )}

      {!editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setEditing(true)} className="btn-ghost" style={{ width: '100%' }}>Edit Profile</button>
          <button onClick={handleSignOut} disabled={isPending} style={{ width: '100%', padding: '14px 24px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
            {isPending ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      ) : (
        <form autoComplete="off" action={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF' }}>Edit Profile</p>
            <button type="button" onClick={() => setEditing(false)} style={{ fontSize: 13, color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Cancel</button>
          </div>

          <Field name="full_name" label="FULL NAME" defaultValue={profile.full_name ?? ''} placeholder="Your name" />
          <Field name="username" label="USERNAME" defaultValue={profile.username ?? ''} placeholder="yourhandle" />
          <Field name="tagline" label="TAGLINE" defaultValue={profile.tagline ?? ''} placeholder="One sentence about you" />
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>BIO</label>
            <textarea name="bio" defaultValue={profile.bio ?? ''} placeholder="Tell your circle about yourself" rows={3} className="cc-input" />
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>REFLECTION DAY</label>
            <select name="assessment_day" defaultValue={profile.assessment_day} className="cc-input" style={{ fontSize: 14 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}

          <button type="submit" disabled={isPending} className="btn-gold" style={{ marginTop: 8 }}>
            {isPending ? 'SAVING...' : 'SAVE PROFILE'}
          </button>
        </form>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, accent }: { label: string; value: string; unit: string; accent: string }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${accent}22`, background: `${accent}0A`, padding: '14px 10px', textAlign: 'center' }}>
      <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: '#555', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 900, color: accent, lineHeight: 1, textShadow: `0 0 16px ${accent}44` }}>{value}</p>
      {unit && <p style={{ fontSize: 9, color: '#555', marginTop: 4 }}>{unit}</p>}
    </div>
  )
}

function Field({ name, label, defaultValue, placeholder }: { name: string; label: string; defaultValue: string; placeholder: string }) {
  return (
    <div>
      <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>{label}</label>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} className="cc-input" style={{ fontSize: 14 }} />
    </div>
  )
}
