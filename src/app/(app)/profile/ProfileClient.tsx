'use client'
import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { updateProfile, signOut, uploadAvatar, uploadCover, setPinnedGoal, getFollowers, getFollowing, getCircleMembers } from './actions'
import { toggleReaction, addComment, deleteComment } from '@/app/(app)/circle/actions'
import { sendMessage } from '@/app/(app)/inbox/actions'
import type { Profile } from '@/lib/types/database'
import { getLevelInfo, LEVELS } from '@/lib/xp'
import { ACHIEVEMENT_META } from '@/lib/achievements'

type Goal = { id: string; title: string; category: string | null; progress: number; deadline: string | null; status: string; visibility: string }
type PostComment = { id: string; user_id: string; author_name: string | null; author_avatar: string | null; content: string; created_at: string }
type ProfilePost = {
  id: string; content: string; type: string; created_at: string
  media_url: string | null; media_type: string | null; visibility: string
  reactions: { fire: number; strong: number; relate: number }
  my_reactions: { fire: boolean; strong: boolean; relate: boolean }
  comments: PostComment[]
}

const POST_TYPE_LABEL: Record<string, { emoji: string; color: string }> = {
  win:      { emoji: '🏆', color: '#4ade80' },
  progress: { emoji: '📈', color: '#a78bfa' },
  lesson:   { emoji: '💡', color: '#D4AF37' },
  vibe:     { emoji: '🔥', color: '#f97316' },
}

const CAT_META: Record<string, { color: string; bg: string; emoji: string }> = {
  health:        { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  emoji: '💪' },
  career:        { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', emoji: '🚀' },
  finance:       { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  emoji: '💰' },
  learning:      { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  emoji: '📚' },
  creative:      { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  emoji: '🎨' },
  relationships: { color: '#f472b6', bg: 'rgba(244,114,182,0.12)', emoji: '❤️' },
  mindset:       { color: '#D4AF37', bg: 'rgba(212,175,55,0.12)',  emoji: '🧠' },
  business:      { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  emoji: '💼' },
}

function getBadges(profile: Profile) {
  const badges: { emoji: string; label: string; color: string }[] = []
  const weeks = profile.streak ?? 0
  const done = profile.goals_complete ?? 0
  const reflections = profile.assessments_submitted ?? 0
  const weeksSince = Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (7 * 86400000)))
  const consistency = Math.round((reflections / weeksSince) * 100)

  if (weeks >= 52) badges.push({ emoji: '🏆', label: '1-Year Streak', color: '#D4AF37' })
  else if (weeks >= 26) badges.push({ emoji: '🔥', label: '6-Month Streak', color: '#f97316' })
  else if (weeks >= 13) badges.push({ emoji: '⚡', label: '3-Month Streak', color: '#fbbf24' })
  else if (weeks >= 4)  badges.push({ emoji: '✦', label: '1-Month Streak', color: '#a78bfa' })

  if (done >= 25)     badges.push({ emoji: '💎', label: '25 Goals Done', color: '#38bdf8' })
  else if (done >= 10) badges.push({ emoji: '🎯', label: '10 Goals Done', color: '#4ade80' })
  else if (done >= 5)  badges.push({ emoji: '✅', label: '5 Goals Done',  color: '#22c55e' })
  else if (done >= 1)  badges.push({ emoji: '🌱', label: 'First Goal Done', color: '#86efac' })

  if (consistency >= 80) badges.push({ emoji: '🧠', label: 'Consistent', color: '#a78bfa' })
  if (reflections >= 13) badges.push({ emoji: '📖', label: '13 Reflections', color: '#818cf8' })

  // Building since badge
  const joinYear = new Date(profile.created_at).getFullYear()
  badges.push({ emoji: '🏗️', label: `Building since ${joinYear}`, color: 'rgba(255,255,255,0.42)' })

  return badges
}

function getFocusAreas(goals: Goal[]) {
  const cats = goals
    .filter(g => g.status === 'active' && g.category)
    .map(g => g.category!)
  const counts: Record<string, number> = {}
  for (const c of cats) counts[c] = (counts[c] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c)
}

function getAccountabilityScore(profile: Profile) {
  const weeksSince = Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (7 * 86400000)))
  return Math.min(100, Math.round(((profile.assessments_submitted ?? 0) / weeksSince) * 100))
}

function progressColor(p: number) {
  if (p >= 90) return '#4ade80'
  if (p >= 60) return '#D4AF37'
  if (p >= 30) return '#fb923c'
  return '#f87171'
}

type AssessmentHistory = { week_start: string; rating: number | null }[]


type ModalUser = { id: string; full_name: string | null; avatar_url: string | null; username: string | null }

export function ProfileClient({ profile, goals, followersCount, followingCount, circleCount, assessmentHistory, achievements, posts }: {
  profile: Profile; goals: Goal[]; followersCount: number; followingCount: number; circleCount: number
  assessmentHistory: AssessmentHistory
  achievements: { type: string; earned_at: string }[]
  posts: ProfilePost[]
}) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [saved, setSaved] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url ?? null)
  const [coverUrl, setCoverUrl] = useState<string | null>(profile.cover_url ?? null)
  const [showAvatarOverlay, setShowAvatarOverlay] = useState(false)
  const [showCoverOverlay, setShowCoverOverlay] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null)
  const [pinnedGoalId, setPinnedGoalIdState] = useState<string | null>(profile.pinned_goal_id ?? null)
  const [showPinPicker, setShowPinPicker] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [usersModal, setUsersModal] = useState<null | 'followers' | 'following' | 'circle'>(null)
  const [modalUsers, setModalUsers] = useState<ModalUser[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [liveFollowing, setLiveFollowing] = useState<number | null>(null)
  const [liveFollowers, setLiveFollowers] = useState<number | null>(null)
  const [liveCircle, setLiveCircle] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])
  // Sync from server after refresh (fixes mobile stale cache)
  useEffect(() => { if (profile.avatar_url) setAvatarUrl(profile.avatar_url + '?v=' + Date.now()) }, [profile.avatar_url])
  useEffect(() => { if (profile.cover_url)  setCoverUrl(profile.cover_url  + '?v=' + Date.now()) }, [profile.cover_url])
  // Fetch live counts on mount — server count can be stale due to Next.js caching
  useEffect(() => {
    Promise.all([getFollowers(), getFollowing(), getCircleMembers()]).then(([followers, following, circle]) => {
      setLiveFollowers(followers.length)
      setLiveFollowing(following.length)
      setLiveCircle(circle.length)
    })
  }, [])

  const badges = getBadges(profile)
  const focusAreas = getFocusAreas(goals)
  const accountabilityScore = getAccountabilityScore(profile)
  const activeGoals = goals.filter(g => g.status === 'active')
  const levelInfo = getLevelInfo(profile.xp ?? 0)
  const earnedAchievementTypes = new Set(achievements.map(a => a.type))
  const pinnedGoal = goals.find(g => g.id === pinnedGoalId)

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  function handleSave(formData: FormData) {
    setError('')
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.error) { setError(result.error); return }
      setSaved(true); setEditing(false)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    })
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setAvatarError('')
    setShowAvatarOverlay(false)
    setAvatarUrl(URL.createObjectURL(file))
    const fd = new FormData(); fd.append('avatar', file)
    startTransition(async () => {
      const r = await uploadAvatar(fd)
      if (r.error) {
        setAvatarUrl(profile.avatar_url ?? null)
        setAvatarError(r.error)
        setTimeout(() => setAvatarError(''), 5000)
        return
      }
      if (r.url) setAvatarUrl(r.url + '?v=' + Date.now())
      router.refresh()
    })
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setShowCoverOverlay(false)
    setCoverUrl(URL.createObjectURL(file))
    const fd = new FormData(); fd.append('cover', file)
    startTransition(async () => {
      const r = await uploadCover(fd)
      if (r.error) { setCoverUrl(profile.cover_url ?? null); return }
      if (r.url) setCoverUrl(r.url + '?v=' + Date.now())
      router.refresh()
    })
  }

  function handlePinGoal(id: string | null) {
    setPinnedGoalIdState(id)
    setShowPinPicker(false)
    startTransition(async () => {
      await setPinnedGoal(id)
      router.refresh()
    })
  }

  function handleSignOut() {
    startTransition(async () => { await signOut(); router.push('/signin') })
  }

  async function openUsersModal(type: 'followers' | 'following' | 'circle') {
    setUsersModal(type)
    setModalUsers([])
    setModalLoading(true)
    const fn = type === 'followers' ? getFollowers : type === 'following' ? getFollowing : getCircleMembers
    const users = await fn()
    setModalUsers(users)
    setModalLoading(false)
    if (type === 'following') setLiveFollowing(users.length)
    else if (type === 'followers') setLiveFollowers(users.length)
    else setLiveCircle(users.length)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 100 }} className="view-panel">

      {/* ── Cover ── */}
      <div
        style={{ position: 'relative', height: 160, overflow: 'hidden', cursor: 'pointer' }}
        onMouseEnter={() => setShowCoverOverlay(true)}
        onMouseLeave={() => setShowCoverOverlay(false)}
        onClick={() => setShowCoverOverlay(v => !v)}
      >
        {coverUrl ? (
          <Image src={coverUrl} alt="Cover" fill style={{ objectFit: 'cover', objectPosition: 'center' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#18140A,#0F0C03)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 120% at 50% -20%, rgba(212,175,55,0.25) 0%, transparent 70%)' }} />
          </div>
        )}
        {/* Cover overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          opacity: showCoverOverlay ? 1 : 0,
          transition: 'opacity 0.25s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          pointerEvents: showCoverOverlay ? 'auto' : 'none',
        }}>
          <button
            onClick={e => { e.stopPropagation(); coverInputRef.current?.click() }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '14px 22px', borderRadius: 16,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)', color: '#fff',
              cursor: 'pointer', fontFamily: 'Satoshi,sans-serif',
              transform: showCoverOverlay ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(6px)',
              transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>Edit Cover</span>
          </button>
          {coverUrl && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox({ src: coverUrl, label: 'Cover Photo' }) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '14px 22px', borderRadius: 16,
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)', color: '#fff',
                cursor: 'pointer', fontFamily: 'Satoshi,sans-serif',
                transform: showCoverOverlay ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(6px)',
                transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.04s',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>View Photo</span>
            </button>
          )}
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />
      </div>

      {/* ── Avatar + social row ── */}
      <div style={{ padding: '0 20px', marginTop: -44 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          {/* Avatar with Instagram-style overlay */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{ width: 88, height: 88, borderRadius: 24, border: '3px solid #080808', overflow: 'hidden', background: 'linear-gradient(135deg,#D4AF37,#8A6808)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#000', cursor: 'pointer', position: 'relative' }}
              onMouseEnter={() => setShowAvatarOverlay(true)}
              onMouseLeave={() => setShowAvatarOverlay(false)}
              onClick={() => setShowAvatarOverlay(v => !v)}
            >
              {avatarUrl ? <Image src={avatarUrl} alt="Avatar" fill style={{ objectFit: 'cover', objectPosition: 'center' }} /> : initials}

              {/* Avatar overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                opacity: showAvatarOverlay ? 1 : 0,
                transition: 'opacity 0.2s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                pointerEvents: showAvatarOverlay ? 'auto' : 'none',
              }}>
                <button
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.04em',
                    transform: showAvatarOverlay ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(4px)',
                    transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Edit
                </button>
                {avatarUrl && (
                  <button
                    onClick={e => { e.stopPropagation(); setLightbox({ src: avatarUrl, label: 'Profile Photo' }) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                      color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.04em',
                      transform: showAvatarOverlay ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(4px)',
                      transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.04s',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    View
                  </button>
                )}
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            {avatarError && (
              <p style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, fontSize: 10, color: '#f87171', whiteSpace: 'nowrap' }}>{avatarError}</p>
            )}
          </div>

          {/* Follower / Circle counts */}
          <div style={{ display: 'flex', gap: 20, paddingBottom: 6 }}>
            {([
              { label: 'CIRCLE', value: liveCircle ?? circleCount, key: 'circle' },
              { label: 'FOLLOWERS', value: liveFollowers ?? followersCount, key: 'followers' },
              { label: 'FOLLOWING', value: liveFollowing ?? followingCount, key: 'following' },
            ] as { label: string; value: number; key: 'circle' | 'followers' | 'following' }[]).map(({ label, value, key }) => (
              <button key={key} onClick={() => openUsersModal(key)} style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Satoshi,sans-serif' }}>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', fontWeight: 600, marginTop: 2 }}>{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Name + Building since */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{profile.full_name ?? 'Your Name'}</h1>
          {badges.filter(b => b.label.includes('Building since')).map(b => (
            <div key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <span style={{ fontSize: 11 }}>{b.emoji}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)', fontWeight: 700, letterSpacing: '0.04em' }}>{b.label.toUpperCase()}</span>
            </div>
          ))}
        </div>
        {profile.username && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', marginBottom: 4 }}>@{profile.username}</p>}
        {profile.tagline && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.58)', fontWeight: 300, fontStyle: 'italic', marginBottom: profile.bio ? 6 : 12 }}>{profile.tagline}</p>}
        {profile.bio && <p style={{ fontSize: 13, color: '#AAA', fontWeight: 300, lineHeight: 1.7, marginBottom: 12 }}>{profile.bio}</p>}
      </div>

      {/* ── Achievements ── */}
      <AchievementsSection earnedTypes={earnedAchievementTypes} totalCount={Object.keys(ACHIEVEMENT_META).length} />

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '0 20px', marginBottom: 20 }}>
        {[
          { label: 'STREAK', value: profile.streak ?? 0, unit: 'wks', color: '#D4AF37' },
          { label: 'GOALS DONE', value: profile.goals_complete ?? 0, unit: '', color: '#4ade80' },
          { label: 'CONSISTENCY', value: accountabilityScore, unit: '%', color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 16, border: `1px solid ${s.color}22`, background: `${s.color}0A`, padding: '14px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1, textShadow: `0 0 16px ${s.color}44` }}>{s.value}</p>
            {s.unit && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.42)', marginTop: 4 }}>{s.unit}</p>}
          </div>
        ))}
      </div>

      {/* ── XP + Level ── */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ borderRadius: 18, padding: '16px 18px', background: `${levelInfo.color}0a`, border: `1px solid ${levelInfo.color}25` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>LEVEL {levelInfo.level}</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: levelInfo.color, letterSpacing: '-0.01em' }}>{levelInfo.title}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 24, fontWeight: 900, color: levelInfo.color, lineHeight: 1 }}>{levelInfo.xp}</p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.06em' }}>XP TOTAL</p>
            </div>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${levelInfo.progressToNext}%`, background: `linear-gradient(90deg,${levelInfo.color},${levelInfo.color}99)`, borderRadius: 3, transition: 'width 0.5s', boxShadow: `0 0 8px ${levelInfo.color}60` }} />
          </div>
          {levelInfo.level < LEVELS.length && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>{levelInfo.xpToNext} XP to Level {levelInfo.level + 1}</p>
          )}
        </div>
      </div>

      {/* ── Completed goals showcase ── */}
      {goals.filter(g => g.status === 'complete').length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>COMPLETED GOALS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {goals.filter(g => g.status === 'complete').slice(0, 5).map(g => {
              const m = CAT_META[g.category ?? ''] ?? { color: '#D4AF37', bg: 'rgba(212,175,55,0.1)', emoji: '✦' }
              return (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(34,197,94,0.12)', background: 'rgba(34,197,94,0.04)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: m.bg, border: `1px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{m.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', textTransform: 'capitalize', marginTop: 2 }}>{g.category ?? 'Goal'}</p>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              )
            })}
            {goals.filter(g => g.status === 'complete').length > 5 && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', textAlign: 'center', paddingTop: 4 }}>+{goals.filter(g => g.status === 'complete').length - 5} more completed</p>
            )}
          </div>
        </div>
      )}

      {/* ── Focus areas ── */}
      {focusAreas.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>FOCUS AREAS</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {focusAreas.map(cat => {
              const m = CAT_META[cat] ?? { color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', emoji: '✦' }
              return (
                <div key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: m.bg, border: `1px solid ${m.color}30` }}>
                  <span style={{ fontSize: 13 }}>{m.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: m.color, textTransform: 'capitalize' }}>{cat}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Pinned goal ── */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)' }}>WHAT I&apos;M BUILDING RIGHT NOW</p>
          <button onClick={() => setShowPinPicker(true)} style={{ fontSize: 11, color: '#D4AF37', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', fontWeight: 700 }}>
            {pinnedGoal ? 'Change' : '+ Pin a goal'}
          </button>
        </div>
        {pinnedGoal ? (
          <PinnedGoalCard goal={pinnedGoal} />
        ) : (
          <button onClick={() => setShowPinPicker(true)} style={{ width: '100%', padding: '20px', borderRadius: 16, border: '1px dashed rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.03)', cursor: 'pointer', textAlign: 'center', fontFamily: 'Satoshi,sans-serif' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)' }}>Pin your most important goal so visitors know what you&apos;re focused on.</p>
          </button>
        )}
      </div>

      {/* ── Posts feed ── */}
      {posts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 16, padding: '0 20px' }}>POSTS</p>
          <div>
            {posts.map((p, idx) => (
              <div key={p.id}>
                <ProfilePostCard
                  post={p}
                  avatarUrl={avatarUrl}
                  displayName={profile.full_name ?? profile.username ?? 'You'}
                  handle={'@' + (profile.username ?? (profile.full_name ?? 'you').split(' ')[0]).toLowerCase()}
                  userId={profile.id}
                />
                {idx < posts.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {saved && (
        <div style={{ margin: '0 20px 16px', padding: '12px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>Profile saved</p>
        </div>
      )}

      {/* ── Edit / Sign out ── */}
      {!editing ? (
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => setEditing(true)} className="btn-ghost" style={{ width: '100%' }}>Edit Profile</button>
          <button onClick={handleSignOut} disabled={isPending} style={{ width: '100%', padding: '14px 24px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
            {isPending ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      ) : (
        <form autoComplete="off" action={handleSave} style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF' }}>Edit Profile</p>
            <button type="button" onClick={() => setEditing(false)} style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Cancel</button>
          </div>
          <Field name="full_name" label="FULL NAME" defaultValue={profile.full_name ?? ''} placeholder="Your name" />
          <Field name="username" label="USERNAME" defaultValue={profile.username ?? ''} placeholder="yourhandle" />
          <Field name="tagline" label="TAGLINE" defaultValue={profile.tagline ?? ''} placeholder="One sentence about you" />
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', display: 'block', marginBottom: 8 }}>BIO</label>
            <textarea name="bio" defaultValue={profile.bio ?? ''} placeholder="Tell your circle about yourself" rows={4} className="cc-input" />
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', display: 'block', marginBottom: 8 }}>REFLECTION DAY</label>
            <select name="assessment_day" defaultValue={profile.assessment_day} className="cc-input" style={{ fontSize: 14 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={isPending} className="btn-gold" style={{ marginTop: 4 }}>
            {isPending ? 'SAVING…' : 'SAVE PROFILE'}
          </button>
        </form>
      )}

      {/* ── Pin picker modal ── */}
      {showPinPicker && (
        <div onClick={() => setShowPinPicker(false)} className="modal-open" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: '#0E0E0E', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', padding: '24px', maxHeight: '85dvh', overflowY: 'auto', animation: 'scaleIn 0.2s ease both' }}>
            <div style={{ width: 32, height: 3, borderRadius: 2, background: '#222', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF' }}>Pin a Goal</p>
              <button onClick={() => setShowPinPicker(false)} style={{ fontSize: 22, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {pinnedGoal && (
              <button onClick={() => handlePinGoal(null)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(248,113,113,0.2)', background: 'transparent', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 12 }}>
                Remove pinned goal
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeGoals.length === 0 && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', textAlign: 'center', padding: '20px 0' }}>No active goals to pin.</p>
              )}
              {activeGoals.map(g => {
                const m = CAT_META[g.category ?? ''] ?? { color: '#D4AF37', bg: 'rgba(212,175,55,0.1)', emoji: '✦' }
                const isSelected = g.id === pinnedGoalId
                return (
                  <button key={g.id} onClick={() => handlePinGoal(g.id)} style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `1px solid ${isSelected ? m.color + '60' : 'rgba(255,255,255,0.07)'}`, background: isSelected ? m.bg : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{m.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.3 }}>{g.title}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 3 }}>{g.progress}% complete</p>
                      </div>
                      {isSelected && <span style={{ fontSize: 14, color: m.color }}>✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Users modal (followers / following / circle) ── */}
      {mounted && usersModal && createPortal(
        <div
          onClick={() => setUsersModal(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}
          className="modal-open"
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, background: '#111', borderRadius: 24, border: '1px solid rgba(255,255,255,0.07)', maxHeight: '85dvh', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.2s ease both', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em' }}>
                {usersModal === 'circle' ? 'Circle Members' : usersModal === 'followers' ? 'Followers' : 'Following'}
              </p>
              <button onClick={() => setUsersModal(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.58)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0 24px' }}>
              {modalLoading ? (
                [0,1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 12, width: '40%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 6 }} />
                      <div style={{ height: 10, width: '25%', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} />
                    </div>
                  </div>
                ))
              ) : modalUsers.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13, padding: '40px 20px' }}>
                  {usersModal === 'circle' ? 'No circle members yet' : usersModal === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                </p>
              ) : (
                modalUsers.map(u => {
                  const nameInitials = u.full_name ? u.full_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '?'
                  const grad = ['linear-gradient(135deg,#22c55e,#0ea5e9)','linear-gradient(135deg,#f472b6,#fb923c)','linear-gradient(135deg,#a78bfa,#38bdf8)','linear-gradient(135deg,#D4AF37,#f97316)','linear-gradient(135deg,#f87171,#d946ef)','linear-gradient(135deg,#4ade80,#D4AF37)'][u.id.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 6]
                  return (
                    <Link key={u.id} href={`/profile/${u.id}`} onClick={() => setUsersModal(null)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', textDecoration: 'none', transition: 'background 0.15s' }}>
                      {/* Avatar */}
                      <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden', background: grad }}>
                        {u.avatar_url ? (
                          <Image src={u.avatar_url} alt={u.full_name ?? ''} fill style={{ objectFit: 'cover' }} />
                        ) : (
                          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>{nameInitials}</span>
                        )}
                      </div>
                      {/* Name + handle */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.2 }}>{u.full_name ?? 'Builder'}</p>
                        {u.username && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>@{u.username}</p>}
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 24,
            animation: 'lbFadeIn 0.25s ease forwards',
          }}
        >
          <style>{`
            @keyframes lbFadeIn { from { opacity:0 } to { opacity:1 } }
            @keyframes lbZoomIn { from { opacity:0; transform:scale(0.88) } to { opacity:1; transform:scale(1) } }
          `}</style>

          {/* Close button */}
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'fixed', top: 20, right: 20,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >×</button>

          {/* Label */}
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', marginBottom: 20, textTransform: 'uppercase' }}>{lightbox.label}</p>

          {/* Image */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '1',
              borderRadius: 24, overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
              animation: 'lbZoomIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            <Image src={lightbox.src} alt={lightbox.label} fill style={{ objectFit: 'cover', objectPosition: 'center' }} />
          </div>
        </div>
      )}
    </div>
  )
}

function PinnedGoalCard({ goal }: { goal: Goal }) {
  const m = CAT_META[goal.category ?? ''] ?? { color: '#D4AF37', bg: 'rgba(212,175,55,0.1)', emoji: '✦' }
  const pColor = progressColor(goal.progress)
  const circumference = 2 * Math.PI * 20
  const offset = circumference - (goal.progress / 100) * circumference
  return (
    <div style={{ borderRadius: 20, border: `1px solid ${m.color}30`, background: `linear-gradient(145deg, ${m.bg}, rgba(0,0,0,0))`, padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${m.color}, ${m.color}44)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle cx="26" cy="26" r="20" fill="none" stroke={pColor} strokeWidth="3"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.6s ease' }} />
            <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="900" fill={pColor} fontFamily="Satoshi,sans-serif">{goal.progress}%</text>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: m.bg, border: `1px solid ${m.color}30`, marginBottom: 8 }}>
            <span style={{ fontSize: 11 }}>{m.emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: m.color, textTransform: 'capitalize' }}>{goal.category}</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.3 }}>{goal.title}</p>
        </div>
      </div>
    </div>
  )
}

function Field({ name, label, defaultValue, placeholder }: { name: string; label: string; defaultValue: string; placeholder: string }) {
  const [val, setVal] = useState(defaultValue)
  const isUsername = name === 'username'

  let usernameError = ''
  if (isUsername && val) {
    const v = val.toLowerCase()
    if (v.length < 3) usernameError = 'At least 3 characters'
    else if (v.length > 20) usernameError = 'Max 20 characters'
    else if (!/^[a-z0-9_.]+$/.test(v)) usernameError = 'Letters, numbers, _ and . only'
    else if (/^[._]|[._]$/.test(v)) usernameError = 'Cannot start or end with . or _'
    else if (/[_.]{2}/.test(v)) usernameError = 'No consecutive . or _'
  }

  const remaining = isUsername ? 20 - val.length : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)' }}>{label}</label>
        {isUsername && val.length > 0 && (
          <span style={{ fontSize: 10, color: remaining! < 0 ? '#f87171' : remaining! <= 5 ? '#fb923c' : '#444' }}>
            {remaining! < 0 ? `${Math.abs(remaining!)} over limit` : `${remaining} left`}
          </span>
        )}
      </div>
      <input
        name={name}
        value={isUsername ? val : undefined}
        defaultValue={isUsername ? undefined : defaultValue}
        onChange={isUsername ? e => setVal(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')) : undefined}
        placeholder={placeholder}
        className="cc-input"
        style={{ fontSize: 14, borderColor: usernameError ? 'rgba(248,113,113,0.4)' : undefined }}
        maxLength={isUsername ? 20 : undefined}
        autoCapitalize={isUsername ? 'none' : undefined}
        autoCorrect={isUsername ? 'off' : undefined}
        spellCheck={isUsername ? false : undefined}
      />
      {isUsername && usernameError && (
        <p style={{ fontSize: 11, color: '#f87171', marginTop: 6, fontFamily: 'Satoshi,sans-serif' }}>{usernameError}</p>
      )}
      {isUsername && !usernameError && val.length >= 3 && (
        <p style={{ fontSize: 11, color: '#4ade80', marginTop: 6, fontFamily: 'Satoshi,sans-serif' }}>@{val}</p>
      )}
    </div>
  )
}

// ── Achievements Section ────────────────────────────────────────────────────
function AchievementsSection({ earnedTypes, totalCount }: { earnedTypes: Set<string>; totalCount: number }) {
  const [expanded, setExpanded] = useState(false)
  const allEntries = Object.entries(ACHIEVEMENT_META) as [string, typeof ACHIEVEMENT_META[keyof typeof ACHIEVEMENT_META]][]
  const earned = allEntries.filter(([type]) => earnedTypes.has(type))
  const unearned = allEntries.filter(([type]) => !earnedTypes.has(type))

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 12 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)' }}>ACHIEVEMENTS</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{earnedTypes.size}/{totalCount} earned</span>
          <button onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 700, fontFamily: 'Satoshi,sans-serif' }}>
            {expanded ? 'Less ▴' : 'See all ▾'}
          </button>
        </div>
      </div>

      {/* Horizontal scroll — earned only */}
      {!expanded && (
        earned.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', padding: '0 20px', fontWeight: 500 }}>No achievements yet — keep going!</p>
        ) : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 20, paddingRight: 20, paddingBottom: 4, scrollbarWidth: 'none' }}>
            {earned.map(([type, meta]) => (
              <div key={type} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 64 }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: `${meta.color}15`, border: `1px solid ${meta.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 26 }}>{meta.emoji}</span>
                </div>
                <span style={{ fontSize: 8, fontWeight: 700, color: meta.color, textAlign: 'center', lineHeight: 1.3, letterSpacing: '0.02em', maxWidth: 64 }}>{meta.title}</span>
              </div>
            ))}
          </div>
        )
      )}

      {/* Full grid dropdown */}
      {expanded && (
        <div style={{ padding: '0 20px' }}>
          {earned.length > 0 && (
            <>
              <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: '#4ade80', marginBottom: 8 }}>EARNED</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
                {earned.map(([type, meta]) => (
                  <div key={type} style={{ borderRadius: 14, padding: '12px 8px', textAlign: 'center', background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}>
                    <p style={{ fontSize: 22, marginBottom: 4 }}>{meta.emoji}</p>
                    <p style={{ fontSize: 8, fontWeight: 700, color: meta.color, lineHeight: 1.3 }}>{meta.title}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          {unearned.length > 0 && (
            <>
              <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', marginBottom: 8 }}>LOCKED</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {unearned.map(([type, meta]) => (
                  <div key={type} style={{ borderRadius: 14, padding: '12px 8px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.35 }}>
                    <p style={{ fontSize: 22, marginBottom: 4, filter: 'grayscale(100%)' }}>{meta.emoji}</p>
                    <p style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>{meta.title}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          <Link href="/playbook" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.42)', textDecoration: 'none', fontWeight: 600 }}>
            Earn more in the Playbook →
          </Link>
        </div>
      )}
    </div>
  )
}

// ── TYPE META ──────────────────────────────────────────────────────────────
const PROFILE_TYPE_META: Record<string, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  win:       { emoji: '🏆', label: 'Win',       color: '#4ade80', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)'   },
  lesson:    { emoji: '💡', label: 'Lesson',    color: '#D4AF37', bg: 'rgba(212,175,55,0.12)',  border: 'rgba(212,175,55,0.3)'  },
  progress:  { emoji: '📈', label: 'Progress',  color: '#a78bfa', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)'  },
  milestone: { emoji: '🎯', label: 'Milestone', color: '#7dd3fc', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)'  },
  question:  { emoji: '❓', label: 'Support',   color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)' },
}

function pTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function pInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function ProfilePostCard({ post, avatarUrl, displayName, handle, userId }: {
  post: ProfilePost; avatarUrl: string | null; displayName: string; handle: string; userId: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const meta = PROFILE_TYPE_META[post.type] ?? { emoji: '✦', label: post.type, color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.3)' }
  const hasMedia = !!post.media_url

  const [fireActive, setFireActive] = useState(post.my_reactions.fire)
  const [fireCount, setFireCount] = useState(post.reactions.fire)
  const [showComments, setShowComments] = useState(false)
  const [localComments, setLocalComments] = useState<PostComment[]>(post.comments)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [shareMembers, setShareMembers] = useState<ModalUser[]>([])
  const [shareLoading, setShareLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [shareSending, setShareSending] = useState(false)
  const [shareSent, setShareSent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const commentCount = localComments.length

  function handleFire() {
    setFireActive(a => !a)
    setFireCount(c => fireActive ? c - 1 : c + 1)
    startTransition(async () => { await toggleReaction(post.id, 'fire'); router.refresh() })
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    const optimistic: PostComment = { id: 'temp-' + Date.now(), user_id: userId, author_name: displayName, author_avatar: avatarUrl, content: commentText.trim(), created_at: new Date().toISOString() }
    setLocalComments(prev => [...prev, optimistic])
    setCommentText('')
    const result = await addComment(post.id, optimistic.content)
    if (result.error) { setLocalComments(prev => prev.filter(c => c.id !== optimistic.id)) }
    else { router.refresh() }
    setSubmitting(false)
  }

  async function handleDelete(commentId: string) {
    setLocalComments(prev => prev.filter(c => c.id !== commentId))
    await deleteComment(commentId)
    router.refresh()
  }

  async function openShare() {
    setShowShare(true)
    setSelected(new Set())
    setShareSent(false)
    setShareLoading(true)
    const members = await getFollowing()
    setShareMembers(members)
    setShareLoading(false)
  }

  async function handleSend() {
    if (selected.size === 0 || shareSending) return
    setShareSending(true)
    const msg = `[[POST]]${JSON.stringify({ id: post.id, type: post.type, content: post.content, author: displayName, authorAvatar: avatarUrl, mediaUrl: post.media_url, mediaType: post.media_type })}`
    await Promise.all([...selected].map(rid => sendMessage(rid, msg)))
    setShareSending(false)
    setShareSent(true)
    setTimeout(() => { setShowShare(false); setShareSent(false); setSelected(new Set()) }, 1500)
  }

  const initials = pInitials(displayName)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 10px' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#D4AF37,#a78bfa)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0A0A0A' }} />
            : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#1a1a1a', border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#FFF' }}>{initials}</div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF' }}>{displayName}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color, fontWeight: 700 }}>{meta.emoji} {meta.label}</span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{pTimeAgo(post.created_at)}</span>
        </div>
      </div>

      {/* Media */}
      {hasMedia && post.media_type === 'image' && <img src={post.media_url!} alt="" style={{ width: '100%', display: 'block', objectFit: 'cover' }} />}
      {hasMedia && post.media_type === 'video' && <video src={post.media_url!} controls playsInline style={{ width: '100%', display: 'block', background: '#000' }} />}

      {/* Text-only */}
      {!hasMedia && post.content && (
        <div style={{ padding: '0 20px 10px' }}>
          <p style={{ fontSize: 14, color: '#C8C8C8', fontWeight: 400, lineHeight: 1.65, margin: 0 }}>
            <span style={{ fontWeight: 800, color: '#EFEFEF', marginRight: 5 }}>{handle}</span>{post.content}
          </p>
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 6px' }}>
        <button onClick={handleFire} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px 4px 0' }}>
          <span style={{ fontSize: 22, lineHeight: 1, filter: fireActive ? 'drop-shadow(0 0 8px rgba(212,175,55,1)) drop-shadow(0 0 16px rgba(212,175,55,0.7))' : 'grayscale(1) opacity(0.35)', transition: 'filter 0.2s' }}>🤝</span>
          {fireCount > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: fireActive ? '#D4AF37' : '#888', fontFamily: 'Satoshi,sans-serif', transition: 'color 0.2s' }}>{fireCount}</span>}
        </button>
        <button onClick={() => { setShowComments(o => !o); setTimeout(() => inputRef.current?.focus(), 100) }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {commentCount > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.58)' }}>{commentCount}</span>}
        </button>
        <button onClick={openShare} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
        <button style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 4px 8px', marginLeft: 'auto' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>

      {/* Caption for media */}
      {hasMedia && post.content && (
        <p style={{ fontSize: 14, lineHeight: 1.65, padding: '4px 20px 10px', color: '#C8C8C8', margin: 0 }}>
          <span style={{ fontWeight: 800, color: '#EFEFEF', marginRight: 5 }}>{handle}</span>{post.content}
        </p>
      )}

      {/* Comments */}
      {showComments && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4 }}>
          {localComments.length > 0 && localComments.map(comment => {
            const isMyComment = comment.user_id === userId
            const cName = isMyComment ? displayName : (comment.author_name ?? 'Member')
            return (
              <div key={comment.id} style={{ display: 'flex', gap: 12, padding: '12px 20px', alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg,#D4AF37,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#FFF' }}>
                  {comment.author_avatar ? <img src={comment.author_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : pInitials(cName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: '#EFEFEF', lineHeight: 1.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, marginRight: 6 }}>{cName}</span>
                    <span style={{ color: '#B0B0B0', fontWeight: 400 }}>{comment.content}</span>
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{pTimeAgo(comment.created_at)}</span>
                    {isMyComment && <button onClick={() => handleDelete(comment.id)} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 4 }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
            )
          })}
          <form onSubmit={handleComment} style={{ display: 'flex', gap: 12, padding: '10px 20px 16px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#D4AF37,#a78bfa)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#FFF' }}>
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : pInitials(displayName)}
            </div>
            <input ref={inputRef} value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment…" maxLength={500} style={{ flex: 1, padding: '0 0 6px', fontSize: 13, background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#EFEFEF', fontFamily: 'Satoshi,sans-serif', outline: 'none' }} />
            <button type="submit" disabled={!commentText.trim() || submitting} style={{ fontSize: 13, fontWeight: 800, cursor: commentText.trim() ? 'pointer' : 'default', fontFamily: 'Satoshi,sans-serif', background: 'none', border: 'none', color: commentText.trim() ? '#38bdf8' : '#333', transition: 'color 0.15s', padding: 0 }}>{submitting ? '…' : 'Post'}</button>
          </form>
        </div>
      )}

      {/* Share sheet */}
      {showShare && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', padding: '20px 16px' }} onClick={() => { setShowShare(false); setSelected(new Set()); setShareSent(false) }}>
          <div style={{ width: '100%', maxWidth: 520, background: '#111', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85dvh', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.2s ease both', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#333', margin: '16px auto 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF' }}>Send to…</p>
              {selected.size > 0 && (
                <button onClick={handleSend} disabled={shareSending} style={{ padding: '8px 18px', borderRadius: 12, background: shareSent ? 'rgba(74,222,128,0.15)' : 'linear-gradient(135deg,#D4AF37,#9A7010)', border: shareSent ? '1px solid rgba(74,222,128,0.3)' : 'none', color: shareSent ? '#4ade80' : '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', opacity: shareSending ? 0.6 : 1 }}>
                  {shareSent ? 'Sent ✓' : shareSending ? '…' : `Send (${selected.size})`}
                </button>
              )}
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
              {shareLoading ? (
                [0,1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
                    <div style={{ height: 12, width: '40%', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }} />
                  </div>
                ))
              ) : shareMembers.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13, padding: '30px 20px' }}>Follow people to send them posts</p>
              ) : (
                shareMembers.map(m => {
                  const sel = selected.has(m.id)
                  const mInit = m.full_name ? m.full_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '?'
                  const grad = ['linear-gradient(135deg,#22c55e,#0ea5e9)','linear-gradient(135deg,#f472b6,#fb923c)','linear-gradient(135deg,#a78bfa,#38bdf8)','linear-gradient(135deg,#D4AF37,#f97316)','linear-gradient(135deg,#f87171,#d946ef)','linear-gradient(135deg,#4ade80,#D4AF37)'][m.id.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 6]
                  return (
                    <button key={m.id} onClick={() => setSelected(prev => { const n = new Set(prev); sel ? n.delete(m.id) : n.add(m.id); return n })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', background: sel ? 'rgba(212,175,55,0.06)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden', background: grad }}>
                        {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>{mInit}</span>}
                      </div>
                      <p style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#EFEFEF', fontFamily: 'Satoshi,sans-serif' }}>{m.full_name ?? 'Builder'}{m.username ? <span style={{ color: 'rgba(255,255,255,0.42)', fontWeight: 400, fontSize: 12 }}> @{m.username}</span> : ''}</p>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${sel ? '#D4AF37' : 'rgba(255,255,255,0.15)'}`, background: sel ? '#D4AF37' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                        {sel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
