'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-5">
      {/* Large faint watermark */}
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', opacity: 0.03 }}>
        <svg width="720" height="720" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="46" stroke="#D4AF37" strokeWidth="1.2"/>
          <path d="M28 50 L44 66 L72 34" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div style={{ width: '100%', maxWidth: 340, position: 'relative', zIndex: 1 }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 44 }}>
          <svg width="80" height="80" viewBox="0 0 76 76" fill="none" style={{ marginBottom: 16 }}>
            <circle cx="38" cy="38" r="35" stroke="url(#gRing)" strokeWidth="2.5"/>
            <path d="M22 38 L33 49 L54 27" stroke="url(#gRing)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.44em', color: '#EFEFEF', lineHeight: 1 }}>CONFIRMED</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ color: '#D4AF37', fontSize: 10, opacity: 0.7, letterSpacing: '0.1em' }}>———</span>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.38em', color: '#D4AF37', lineHeight: 1 }}>CREATIONS</p>
            <span style={{ color: '#D4AF37', fontSize: 10, opacity: 0.7, letterSpacing: '0.1em' }}>———</span>
          </div>
          <p style={{ marginTop: 18, fontSize: 13, fontWeight: 300, color: '#666', fontStyle: 'italic' }}>Welcome back.</p>
        </div>

        {/* Google Sign-In */}
        <button className="google-btn" onClick={handleGoogle}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="auth-divider"><span>or sign in with email</span></div>

        {/* Email form */}
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required className="cc-input" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="cc-input" />
          {error && <p style={{ color: '#c0392b', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" className="btn-gold" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'SIGNING IN…' : 'SIGN IN'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: -4 }}>
          <button style={{ fontSize: 12, color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
            Forgot password?
          </button>
        </div>

        <hr className="divider" style={{ margin: '24px 0' }} />

        <Link href="/signup" className="btn-ghost" style={{ display: 'block', textAlign: 'center' }}>Create an account</Link>
        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: '#444', letterSpacing: '0.03em' }}>
          A private platform. By joining, you commit to showing up.
        </p>
      </div>
    </div>
  )
}
