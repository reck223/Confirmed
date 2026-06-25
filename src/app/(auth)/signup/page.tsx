'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim() },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // If session exists, email confirmation is off — go straight to app
    if (data.session) {
      router.push('/home')
      router.refresh()
    } else {
      // Email confirmation required
      setCheckEmail(true)
    }
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-5">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-6">📬</div>
          <h1 className="text-2xl font-black text-[#EFEFEF] mb-3">Check your email</h1>
          <p className="text-sm text-[#555] mb-2">We sent a confirmation link to</p>
          <p className="text-sm font-bold text-[#D4AF37] mb-6">{email}</p>
          <p className="text-xs text-[#444]">Click the link to activate your account, then come back to sign in.</p>
          <Link href="/signin" className="inline-block mt-6 text-sm text-[#D4AF37] font-bold">
            Back to Sign In →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <p className="text-base font-black tracking-[0.3em] text-[#D4AF37]">MANIFEST</p>
          <p className="text-xs text-[#555] mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSignUp} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className={inputCls}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className={inputCls}
          />
          <input
            type="password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className={inputCls}
          />

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black text-sm font-black tracking-wider mt-1 disabled:opacity-50"
          >
            {loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="text-center text-xs text-[#444] mt-6">
          Already have an account?{' '}
          <Link href="/signin" className="text-[#D4AF37] font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#444] outline-none focus:border-[#D4AF37]/40'
