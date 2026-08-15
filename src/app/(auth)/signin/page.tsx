'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'

function SignInInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot password state
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) setError(decodeURIComponent(urlError))
  }, [searchParams])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      const joinCode = searchParams.get('joinCode')
      router.push(joinCode ? `/join/${joinCode}` : '/home')
      router.refresh()
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetError('')
    if (!resetEmail.trim()) { setResetError('Enter your email address.'); return }
    setResetLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/new-password`,
    })
    setResetLoading(false)
    if (error) { setResetError(error.message); return }
    setResetSent(true)
  }

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-5">
      <div style={{ width: '100%', maxWidth: 360, position: 'relative', zIndex: 1 }}>

        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
          <Image
            src="/brandlogo.png"
            alt="Confirmed Creations"
            width={1536}
            height={1024}
            priority
            style={{ width: 'min(80vw, 380px)', height: 'auto', marginBottom: 16, filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.5))' }}
          />
          <p style={{ marginTop: 4, fontSize: 13, fontWeight: 300, color: 'rgba(255,255,255,0.50)', fontStyle: 'italic' }}>Welcome back.</p>
        </div>

        {/* ── FORGOT PASSWORD PANEL ── */}
        {showReset ? (
          <div>
            {resetSent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#EFEFEF', marginBottom: 8 }}>Check your inbox</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', lineHeight: 1.6, marginBottom: 24 }}>
                  We sent a reset link to <strong style={{ color: '#D4AF37' }}>{resetEmail}</strong>. Click it to set a new password.
                </p>
                <button onClick={() => { setShowReset(false); setResetSent(false); setResetEmail('') }} className="btn-ghost" style={{ width: '100%' }}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>Reset your password</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', marginBottom: 20 }}>Enter your email and we&apos;ll send you a reset link.</p>
                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    className="cc-input"
                    style={{ fontSize: 16 }}
                  />
                  {resetError && (
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <p style={{ color: '#f87171', fontSize: 13 }}>{resetError}</p>
                    </div>
                  )}
                  <button type="submit" className="btn-gold" disabled={resetLoading} style={{ padding: '15px', fontSize: 14 }}>
                    {resetLoading ? 'SENDING…' : 'SEND RESET LINK'}
                  </button>
                </form>
                <button type="button" onClick={() => setShowReset(false)} style={{ display: 'block', width: '100%', marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', padding: '10px 0' }}>
                  ← Back to sign in
                </button>
              </>
            )}
          </div>
        ) : (

        /* ── SIGN IN PANEL ── */
        <>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 14 }}>
              <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="cc-input"
              style={{ fontSize: 16 }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="cc-input"
              style={{ fontSize: 16 }}
            />
            <button type="submit" className="btn-gold" disabled={loading} style={{ marginTop: 4, padding: '15px', fontSize: 14 }}>
              {loading ? 'SIGNING IN…' : 'SIGN IN'}
            </button>
          </form>

          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setShowReset(true); setResetEmail(email) }}
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', padding: '10px 0' }}
            >
              Forgot password?
            </button>
          </div>

          <hr className="divider" style={{ margin: '24px 0' }} />

          <Link href="/signup" className="btn-ghost" style={{ display: 'block', textAlign: 'center', padding: '15px', fontSize: 14 }}>
            Create an account
          </Link>
          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.03em' }}>
            A private platform. By joining, you commit to showing up.
          </p>
        </>
        )}

      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  )
}
