'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.session) {
      router.push('/home')
      router.refresh()
    } else {
      setCheckEmail(true)
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

  if (checkEmail) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center px-5">
        <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>📬</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', marginBottom: 12 }}>Check your email</h1>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>We sent a confirmation link to</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37', marginBottom: 24 }}>{email}</p>
          <p style={{ fontSize: 12, color: '#444' }}>Click the link to activate your account, then come back to sign in.</p>
          <Link href="/signin" style={{ display: 'inline-block', marginTop: 24, fontSize: 13, color: '#D4AF37', fontWeight: 700 }}>
            Back to Sign In →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-5">

      <div style={{ width: '100%', maxWidth: 340, position: 'relative', zIndex: 1 }}>
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
          <p style={{ marginTop: 4, fontSize: 13, fontWeight: 300, color: '#666', fontStyle: 'italic' }}>Join a community that holds you to your word.</p>
        </div>

        {/* Google Sign-Up */}
        <button type="button" className="google-btn" onClick={handleGoogle}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign up with Google
        </button>

        {/* Divider */}
        <div className="auth-divider"><span>or create account with email</span></div>

        {/* Email form */}
        <form autoComplete="off" onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required className="cc-input" style={{ fontSize: 16 }} />
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required className="cc-input" style={{ fontSize: 16 }} />
          <input type="password" placeholder="Create password" value={password} onChange={e => setPassword(e.target.value)} required className="cc-input" style={{ fontSize: 16 }} />
          {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
          <button type="submit" className="btn-gold" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#444' }}>Your information is never shared.</p>

        <hr className="divider" style={{ margin: '24px 0' }} />

        <Link href="/signin" className="btn-ghost" style={{ display: 'block', textAlign: 'center' }}>Already have an account? Sign in</Link>
      </div>
    </div>
  )
}
