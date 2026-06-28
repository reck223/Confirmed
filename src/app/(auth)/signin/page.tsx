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
      router.push('/home')
      router.refresh()
    }
  }

  async function handleGoogle() {
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
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
          <p style={{ marginTop: 4, fontSize: 13, fontWeight: 300, color: '#666', fontStyle: 'italic' }}>Welcome back.</p>
        </div>

        {/* ── FORGOT PASSWORD PANEL ── */}
        {showReset ? (
          <div>
            {resetSent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#EFEFEF', marginBottom: 8 }}>Check your inbox</p>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>
                  We sent a reset link to <strong style={{ color: '#D4AF37' }}>{resetEmail}</strong>. Click it to set a new password.
                </p>
                <button onClick={() => { setShowReset(false); setResetSent(false); setResetEmail('') }} className="btn-ghost" style={{ width: '100%' }}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>Reset your password</p>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Enter your email and we&apos;ll send you a reset link.</p>
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
                <button type="button" onClick={() => setShowReset(false)} style={{ display: 'block', width: '100%', marginTop: 14, fontSize: 13, color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', padding: '10px 0' }}>
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

          {/* Google */}
          <button type="button" className="google-btn" onClick={handleGoogle}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider"><span>or sign in with email</span></div>

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
              style={{ fontSize: 13, color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', padding: '10px 0' }}
            >
              Forgot password?
            </button>
          </div>

          <hr className="divider" style={{ margin: '24px 0' }} />

          <Link href="/signup" className="btn-ghost" style={{ display: 'block', textAlign: 'center', padding: '15px', fontSize: 14 }}>
            Create an account
          </Link>
          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: '#444', letterSpacing: '0.03em' }}>
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
