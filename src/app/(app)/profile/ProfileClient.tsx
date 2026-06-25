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
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="max-w-[600px] mx-auto px-5 py-8">
      {/* Avatar + name */}
      <div className="flex items-center gap-5 mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8A6808] flex items-center justify-center text-2xl font-black text-black flex-shrink-0">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#EFEFEF]">{profile.full_name ?? 'Your Name'}</h1>
          {profile.username && <p className="text-sm text-[#555]">@{profile.username}</p>}
          {profile.tagline && <p className="text-sm text-[#EFEFEF]/70 mt-0.5">{profile.tagline}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="STREAK" value={String(profile.streak)} unit="wks" />
        <StatCard label="GOALS DONE" value={String(profile.goals_complete)} unit="" />
        <StatCard label="REFLECTIONS" value={String(profile.assessments_submitted)} unit="" />
      </div>

      {profile.bio && (
        <div className="mb-6 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <p className="text-[9px] font-black tracking-[0.14em] text-[#555] mb-2">ABOUT</p>
          <p className="text-sm text-[#EFEFEF]/80 leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {saved && (
        <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 font-bold">
          ✓ Profile saved
        </div>
      )}

      {!editing ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setEditing(true)}
            className="w-full py-3.5 rounded-xl border border-white/[0.08] text-[#EFEFEF] text-sm font-bold hover:bg-white/[0.03] transition-colors"
          >
            Edit Profile
          </button>
          <button
            onClick={handleSignOut}
            disabled={isPending}
            className="w-full py-3.5 rounded-xl border border-white/[0.06] text-[#555] text-sm font-bold hover:text-rose-400 hover:border-rose-500/30 transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <form action={handleSave} className="flex flex-col gap-4">
          <h2 className="text-lg font-black text-[#EFEFEF] mb-2">Edit Profile</h2>

          <Field name="full_name" label="FULL NAME" defaultValue={profile.full_name ?? ''} placeholder="Your name" />
          <Field name="username" label="USERNAME" defaultValue={profile.username ?? ''} placeholder="yourhandle" />
          <Field name="tagline" label="TAGLINE" defaultValue={profile.tagline ?? ''} placeholder="One sentence about you" />
          <TextareaField name="bio" label="BIO" defaultValue={profile.bio ?? ''} placeholder="Tell your circle about yourself" />

          <div>
            <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">REFLECTION DAY</label>
            <select name="assessment_day" defaultValue={profile.assessment_day} className={inputCls}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 py-3.5 rounded-xl border border-white/[0.08] text-[#555] text-sm font-bold hover:text-[#EFEFEF] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black text-sm font-black tracking-wider disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
      <p className="text-[8px] font-black tracking-wider text-[#555] mb-1">{label}</p>
      <p className="text-2xl font-black text-[#D4AF37]">{value}</p>
      {unit && <p className="text-[9px] text-[#555]">{unit}</p>}
    </div>
  )
}

function Field({ name, label, defaultValue, placeholder }: { name: string; label: string; defaultValue: string; placeholder: string }) {
  return (
    <div>
      <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">{label}</label>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} className={inputCls} />
    </div>
  )
}

function TextareaField({ name, label, defaultValue, placeholder }: { name: string; label: string; defaultValue: string; placeholder: string }) {
  return (
    <div>
      <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">{label}</label>
      <textarea name={name} defaultValue={defaultValue} placeholder={placeholder} rows={3} className={`${inputCls} resize-none`} />
    </div>
  )
}

const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#444] focus:outline-none focus:border-[#D4AF37]/50'
