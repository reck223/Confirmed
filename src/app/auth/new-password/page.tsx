'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function NewPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/home')
  }

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-5">
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
          <Image
            src="/brandlogo.png"
            alt="Confirmed Creations"
            width={1536}
            height={1024}
            priority
            style={{ width: 'min(80vw, 380px)', height: 'auto', marginBottom: 16, filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.5))' }}
          />
          <p style={{ marginTop: 4, fontSize: 13, fontWeight: 300, color: '#666' }}>Set your new password.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="cc-input"
            style={{ fontSize: 16 }}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            className="cc-input"
            style={{ fontSize: 16 }}
          />
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <p style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>{error}</p>
            </div>
          )}
          <button type="submit" className="btn-gold" disabled={loading} style={{ marginTop: 4, padding: '15px', fontSize: 14 }}>
            {loading ? 'SAVING…' : 'SET NEW PASSWORD'}
          </button>
        </form>
      </div>
    </div>
  )
}
