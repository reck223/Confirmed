'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'

function SignUpInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const joinCode = searchParams.get('joinCode')
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

    const dest = joinCode ? `/join/${joinCode}` : '/onboarding'

    // Session exists immediately (email confirmation disabled) — go straight in
    if (data.session) {
      router.push(dest)
      router.refresh()
      return
    }

    // No session yet — try signing in directly in case confirmation is off but session wasn't returned
    const { data: signInData } = await supabase.auth.signInWithPassword({ email, password })
    if (signInData.session) {
      router.push(dest)
      router.refresh()
      return
    }

    // Email confirmation is required — show the check email screen
    setLoading(false)
    setCheckEmail(true)
  }

  if (checkEmail) {
    return (
      <div className="relative z-10 min-h-screen flex items-center justify-center px-5">
        <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>📬</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', marginBottom: 12 }}>Check your email</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', marginBottom: 6 }}>We sent a confirmation link to</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37', marginBottom: 24 }}>{email}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Click the link to activate your account, then come back to sign in.</p>
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
          <p style={{ marginTop: 4, fontSize: 13, fontWeight: 300, color: 'rgba(255,255,255,0.50)', fontStyle: 'italic' }}>Join a community that holds you to your word.</p>
        </div>

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

        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Your information is never shared.</p>

        <hr className="divider" style={{ margin: '24px 0' }} />

        <Link href="/signin" className="btn-ghost" style={{ display: 'block', textAlign: 'center' }}>Already have an account? Sign in</Link>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return <Suspense fallback={null}><SignUpInner /></Suspense>
}
