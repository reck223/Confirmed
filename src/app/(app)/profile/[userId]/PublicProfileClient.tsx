'use client'
import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { followUser, unfollowUser } from '../../circle/actions'
import { getPublicFollowCounts } from './actions'

type Goal = { id: string; title: string; category: string | null; progress: number; deadline: string | null; status: string; visibility: string }
type PublicPost = { id: string; content: string; type: string; created_at: string; media_url: string | null; media_type: string | null }
type Profile = {
  id: string; full_name: string | null; username: string | null; bio: string | null
  tagline: string | null; streak: number; goals_complete: number; assessments_submitted: number
  avatar_url: string | null; cover_url: string | null; pinned_goal_id: string | null; created_at: string
}

const AVATAR_GRADS = [
  'linear-gradient(135deg,#22c55e,#0ea5e9)',
  'linear-gradient(135deg,#f472b6,#fb923c)',
  'linear-gradient(135deg,#a78bfa,#38bdf8)',
  'linear-gradient(135deg,#D4AF37,#f97316)',
  'linear-gradient(135deg,#f87171,#d946ef)',
  'linear-gradient(135deg,#4ade80,#D4AF37)',
  'linear-gradient(135deg,#38bdf8,#a78bfa)',
]
function avatarGrad(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_GRADS[hash % AVATAR_GRADS.length]
}
function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
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

type AssessmentHistory = { week_start: string; rating: number | null }[]


function getBadges(profile: Profile) {
  const badges: { emoji: string; label: string; color: string }[] = []
  const weeks = profile.streak ?? 0
  const done = profile.goals_complete ?? 0
  const weeksSince = Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (7 * 86400000)))
  const consistency = Math.round(((profile.assessments_submitted ?? 0) / weeksSince) * 100)

  if (weeks >= 52)     badges.push({ emoji: '🏆', label: '1-Year Streak',   color: '#D4AF37' })
  else if (weeks >= 26) badges.push({ emoji: '🔥', label: '6-Month Streak', color: '#f97316' })
  else if (weeks >= 13) badges.push({ emoji: '⚡', label: '3-Month Streak', color: '#fbbf24' })
  else if (weeks >= 4)  badges.push({ emoji: '✦', label: '1-Month Streak',  color: '#a78bfa' })

  if (done >= 25)      badges.push({ emoji: '💎', label: '25 Goals Done',   color: '#38bdf8' })
  else if (done >= 10) badges.push({ emoji: '🎯', label: '10 Goals Done',   color: '#4ade80' })
  else if (done >= 5)  badges.push({ emoji: '✅', label: '5 Goals Done',    color: '#22c55e' })
  else if (done >= 1)  badges.push({ emoji: '🌱', label: 'First Goal Done', color: '#86efac' })

  if (consistency >= 80) badges.push({ emoji: '🧠', label: 'Consistent', color: '#a78bfa' })

  const joinYear = new Date(profile.created_at).getFullYear()
  badges.push({ emoji: '🏗️', label: `Building since ${joinYear}`, color: 'rgba(255,255,255,0.42)' })
  return badges
}

function getFocusAreas(goals: Goal[]) {
  const cats = goals.filter(g => g.status === 'active' && g.category).map(g => g.category!)
  const counts: Record<string, number> = {}
  for (const c of cats) counts[c] = (counts[c] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c)
}

function getAccountabilityScore(profile: Profile) {
  const weeksSince = Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (7 * 86400000)))
  return Math.min(100, Math.round(((profile.assessments_submitted ?? 0) / weeksSince) * 100))
}

function daysUntil(deadline: string | null) {
  if (!deadline) return null
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'Past due'
  if (diff === 0) return 'Due today'
  if (diff === 1) return '1 day left'
  if (diff < 30) return `${diff}d left`
  return `${Math.floor(diff / 30)}mo left`
}

function progressColor(p: number) {
  if (p >= 90) return '#4ade80'
  if (p >= 60) return '#D4AF37'
  if (p >= 30) return '#fb923c'
  return '#f87171'
}

export function PublicProfileClient({ profile, goals, allGoals, isFollowing: initialFollowing, currentUserId: _currentUserId, followersCount, followingCount, assessmentHistory, posts }: {
  profile: Profile; goals: Goal[]; allGoals: Goal[]
  isFollowing: boolean; currentUserId: string
  followersCount: number; followingCount: number
  assessmentHistory: AssessmentHistory
  posts: PublicPost[]
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const [liveFollowers, setLiveFollowers] = useState<number | null>(null)
  const [liveFollowing, setLiveFollowing] = useState<number | null>(null)

  useEffect(() => {
    getPublicFollowCounts(profile.id).then(({ followersCount: f, followingCount: ing }) => {
      setLiveFollowers(f)
      setLiveFollowing(ing)
    })
  }, [profile.id])

  const badges = getBadges(profile)
  const focusAreas = getFocusAreas(allGoals)
  const accountabilityScore = getAccountabilityScore(profile)
  const activeGoals = goals.filter(g => g.status === 'active')
  const doneGoals = goals.filter(g => g.status === 'complete')
  const pinnedGoal = allGoals.find(g => g.id === profile.pinned_goal_id)

  function handleFollow() {
    const next = !following
    setFollowing(next)
    setLiveFollowers(prev => (prev ?? followersCount) + (next ? 1 : -1))
    startTransition(async () => {
      if (next) await followUser(profile.id)
      else await unfollowUser(profile.id)
      router.refresh()
    })
  }

  const firstName = profile.full_name?.split(' ')[0] ?? 'They'

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 100 }} className="view-panel">

      {/* ── Cover ── */}
      <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
        {profile.cover_url ? (
          <Image src={profile.cover_url} alt="Cover" fill style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#18140A,#0F0C03)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 120% at 50% -20%, rgba(212,175,55,0.22) 0%, transparent 70%)' }} />
          </div>
        )}
        <Link href="/circle" style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none', backdropFilter: 'blur(6px)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </Link>
      </div>

      {/* ── Avatar + actions ── */}
      <div style={{ padding: '0 20px', marginTop: -44 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, border: '3px solid #080808', overflow: 'hidden', background: avatarGrad(profile.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#FFF', flexShrink: 0, position: 'relative' }}>
            {profile.avatar_url ? <Image src={profile.avatar_url} alt={profile.full_name ?? ''} fill style={{ objectFit: 'cover' }} /> : initials(profile.full_name)}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
            <Link href={`/inbox/${profile.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </Link>
            <button onClick={handleFollow} style={{ padding: '8px 20px', borderRadius: 12, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13, transition: 'all 0.15s', background: following ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#D4AF37,#9A7010)', color: following ? 'rgba(255,255,255,0.55)' : '#000', border: following ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent' }}>
              {following ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        {/* Name + handle */}
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 2 }}>{profile.full_name ?? 'Builder'}</h1>
        {profile.username && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', marginBottom: 4 }}>@{profile.username}</p>}
        {profile.tagline && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.58)', fontWeight: 300, fontStyle: 'italic', marginBottom: 10 }}>{profile.tagline}</p>}

        {/* Follower counts */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
          <div><span style={{ fontSize: 15, fontWeight: 900, color: '#EFEFEF' }}>{liveFollowers ?? followersCount}</span> <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>followers</span></div>
          <div><span style={{ fontSize: 15, fontWeight: 900, color: '#EFEFEF' }}>{liveFollowing ?? followingCount}</span> <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>following</span></div>
        </div>
      </div>

      {/* ── Badges ── */}
      {badges.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>ACHIEVEMENTS</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {badges.map(b => (
              <div key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: `${b.color}14`, border: `1px solid ${b.color}35` }}>
                <span style={{ fontSize: 12 }}>{b.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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



      {/* ── Completed goals showcase ── */}
      {doneGoals.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>COMPLETED GOALS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {doneGoals.slice(0, 5).map(g => {
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
            {doneGoals.length > 5 && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', textAlign: 'center', paddingTop: 4 }}>+{doneGoals.length - 5} more completed</p>}
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

      {/* ── Bio ── */}
      {profile.bio && (
        <div style={{ margin: '0 20px 20px', padding: '16px 18px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 8 }}>ABOUT</p>
          <p style={{ fontSize: 13, color: '#AAA', fontWeight: 300, lineHeight: 1.7 }}>{profile.bio}</p>
        </div>
      )}

      {/* ── Pinned goal ── */}
      {pinnedGoal && (
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>WHAT {firstName.toUpperCase()} IS BUILDING RIGHT NOW</p>
          <PinnedGoalCard goal={pinnedGoal} />
        </div>
      )}

      {/* ── Public posts ── */}
      {posts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 16, padding: '0 20px' }}>POSTS</p>
          <div>
            {(() => {
              const POST_META: Record<string, { emoji: string; color: string }> = {
                win: { emoji: '🏆', color: '#4ade80' }, progress: { emoji: '📈', color: '#a78bfa' },
                lesson: { emoji: '💡', color: '#D4AF37' }, vibe: { emoji: '🔥', color: '#f97316' },
              }
              return posts.map((p, idx) => {
                const meta = POST_META[p.type] ?? { emoji: '✦', color: '#D4AF37' }
                const date = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const hasMedia = !!p.media_url
                const authorName = profile.full_name ?? profile.username ?? 'Member'
                return (
                  <div key={p.id}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 12px' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#D4AF37,#a78bfa)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {profile.avatar_url ? (
                          <Image src={profile.avatar_url} alt="" width={40} height={40} style={{ borderRadius: '50%', border: '2px solid #0A0A0A', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: avatarGrad(profile.id), border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#FFF' }}>
                            {initials(profile.full_name)}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em' }}>{authorName}</span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: meta.color + '15', border: `1px solid ${meta.color}30`, color: meta.color, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'capitalize' }}>
                            {meta.emoji} {p.type}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{date}</span>
                      </div>
                    </div>

                    {/* Full-bleed media */}
                    {p.media_url && p.media_type === 'image' && (
                      <img src={p.media_url} alt="" style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block', maxHeight: 500 }} />
                    )}
                    {p.media_url && p.media_type === 'video' && (
                      <video src={p.media_url} controls playsInline style={{ width: '100%', display: 'block', background: '#000', maxHeight: 500 }} />
                    )}

                    {/* Text-only post */}
                    {!hasMedia && p.content && (
                      <div style={{ padding: '0 20px 12px' }}>
                        <p style={{ fontSize: 15, color: '#C8C8C8', fontWeight: 400, lineHeight: 1.65 }}>{p.content}</p>
                      </div>
                    )}

                    {/* Caption */}
                    {hasMedia && p.content && (
                      <p style={{ fontSize: 13, lineHeight: 1.6, padding: '10px 20px 8px', color: 'rgba(255,255,255,0.58)' }}>
                        <span style={{ fontWeight: 800, color: '#EFEFEF', marginRight: 6 }}>{authorName}</span>
                        {p.content}
                      </p>
                    )}

                    {idx < posts.length - 1 && (
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '12px 0 4px' }} />
                    )}
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* ── Public goals ── */}
      <div style={{ padding: '0 20px' }}>
        {activeGoals.length === 0 && doneGoals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🔒</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No public goals yet</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>{firstName} hasn&apos;t shared any goals publicly.</p>
          </div>
        ) : (
          <>
            {activeGoals.length > 0 && (
              <>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>ACTIVE GOALS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {activeGoals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
                </div>
              </>
            )}
            {doneGoals.length > 0 && (
              <>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>COMPLETED</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {doneGoals.map(goal => <GoalCard key={goal.id} goal={goal} done />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
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
        <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
          <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle cx="26" cy="26" r="20" fill="none" stroke={pColor} strokeWidth="3"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.6s ease' }} />
          <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="900" fill={pColor} fontFamily="Satoshi,sans-serif">{goal.progress}%</text>
        </svg>
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

function GoalCard({ goal, done }: { goal: Goal; done?: boolean }) {
  const m = CAT_META[goal.category ?? ''] ?? { color: '#D4AF37', bg: 'rgba(212,175,55,0.1)', emoji: '✦' }
  const pColor = progressColor(goal.progress)
  const deadline = daysUntil(goal.deadline)
  return (
    <div style={{ borderRadius: 18, border: `1px solid ${done ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.07)'}`, background: done ? 'rgba(74,222,128,0.03)' : 'rgba(255,255,255,0.02)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            {goal.category && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color }}>
                {m.emoji} {goal.category}
              </span>
            )}
            {done && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>✓ Done</span>}
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.3 }}>{goal.title}</p>
        </div>
        {deadline && !done && <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.42)', whiteSpace: 'nowrap', paddingTop: 2 }}>{deadline}</span>}
      </div>
      {!done && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>PROGRESS</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: pColor }}>{goal.progress}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${goal.progress}%`, background: pColor, borderRadius: 2, boxShadow: `0 0 8px ${pColor}66` }} />
          </div>
        </>
      )}
    </div>
  )
}
