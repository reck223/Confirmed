'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCircle, joinCircle, createPost, toggleReaction, followUser, unfollowUser } from './actions'

// ── Types ──
type PostWithMeta = {
  id: string; content: string; type: string; created_at: string
  user_id: string; circle_id: string | null; author_name: string | null
  reactions: { fire: number; strong: number; relate: number }
  my_reactions: { fire: boolean; strong: boolean; relate: boolean }
}
type CircleInfo = { id: string; name: string; code: string }
type CalGoal = { id: string; title: string; category: string | null; deadline: string }
type DiscoverProfile = { id: string; full_name: string | null; username: string | null; streak: number; tagline: string | null; goals_complete: number }
type MemberAssessment = { user_id: string; week_start: string; week_title: string | null; rating: number | null; full_name: string | null }

// ── Post type metadata ──
const TYPE_META: Record<string, { emoji: string; label: string; color: string; bg: string; border: string; prompt: string }> = {
  win:       { emoji: '🏆', label: 'Win',       color: '#4ade80', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   prompt: 'What did you accomplish? Big or small — every win counts.' },
  lesson:    { emoji: '💡', label: 'Lesson',    color: '#D4AF37', bg: 'rgba(212,175,55,0.12)',  border: 'rgba(212,175,55,0.3)',  prompt: 'What did you learn? About yourself, your work, or what moves the needle.' },
  progress:  { emoji: '📈', label: 'Progress',  color: '#a78bfa', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)',  prompt: "What moved forward this week? Show your Circle you're in motion." },
  milestone: { emoji: '🎯', label: 'Milestone', color: '#7dd3fc', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)',  prompt: 'What milestone did you hit? Your Circle wants to celebrate with you.' },
  question:  { emoji: '❓', label: 'Support',   color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)', prompt: "Where do you need support? Be specific — your Circle shows up when they know how." },
}
const TYPE_KEYS = ['win', 'lesson', 'progress', 'milestone', 'question'] as const
const FILTER_TABS = [{ k: 'all', l: 'All' }, ...TYPE_KEYS.map(k => ({ k, l: TYPE_META[k].emoji + ' ' + TYPE_META[k].label }))]

// ── Category accent colors ──
const CAT_COLOR: Record<string, string> = {
  health: '#22c55e', career: '#8b5cf6', business: '#3b82f6', finance: '#D4AF37',
  learning: '#38bdf8', creative: '#f97316', relationships: '#f43f5e',
  personal: '#14b8a6', adventure: '#84cc16', material: '#ef4444', spiritual: '#c084fc',
}
function catColor(cat: string | null) { return CAT_COLOR[cat ?? ''] ?? '#D4AF37' }

// ── Avatar gradients ──
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

// ══════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════
export function CircleClient({
  posts, circles, userId, calGoals, discoverProfiles, followingIds, followingPosts, memberAssessments,
}: {
  posts: PostWithMeta[]; circles: CircleInfo[]; userId: string
  calGoals: CalGoal[]; discoverProfiles: DiscoverProfile[]
  followingIds: string[]; followingPosts: PostWithMeta[]
  memberAssessments: MemberAssessment[]
}) {
  const [mainTab, setMainTab] = useState<'circle' | 'following' | 'calendar' | 'discover'>('circle')
  const [showPost, setShowPost] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [filter, setFilter] = useState('all')
  const [successCode, setSuccessCode] = useState('')
  const [postType, setPostType] = useState<keyof typeof TYPE_META>('win')
  const [postContent, setPostContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  const primaryCircle = circles[0]
  const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.type === filter)
  const selectedMeta = TYPE_META[postType]

  function handleCreate(formData: FormData) {
    setError('')
    startTransition(async () => {
      const result = await createCircle(formData)
      if (result.error) { setError(result.error); return }
      if ('code' in result && result.code) setSuccessCode(result.code)
      setShowCreate(false)
      router.refresh()
    })
  }

  function handleJoin(formData: FormData) {
    setError('')
    startTransition(async () => {
      const result = await joinCircle(formData)
      if (result.error) { setError(result.error); return }
      setShowJoin(false)
      router.refresh()
    })
  }

  function handlePost() {
    setError('')
    if (!primaryCircle || !postContent.trim()) return
    startTransition(async () => {
      const formData = new FormData()
      formData.set('content', postContent)
      formData.set('type', postType)
      const result = await createPost(primaryCircle.id, formData)
      if (result.error) { setError(result.error); return }
      setShowPost(false); setPostContent(''); setPostType('win')
      router.refresh()
    })
  }

  function handleReaction(postId: string, type: 'fire' | 'strong' | 'relate') {
    startTransition(async () => { await toggleReaction(postId, type); router.refresh() })
  }

  function handleFollow(id: string) {
    startTransition(async () => { await followUser(id); router.refresh() })
  }

  function handleUnfollow(id: string) {
    startTransition(async () => { await unfollowUser(id); router.refresh() })
  }

  // ── Tab navigation ──
  const TABS = [
    { k: 'circle' as const,    l: '👥 Circle' },
    { k: 'following' as const, l: 'Following' },
    { k: 'calendar' as const,  l: '📅 Calendar' },
    { k: 'discover' as const,  l: '✦ Discover' },
  ]

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 20px' }} className="view-panel">

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>YOUR CIRCLE</p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {mainTab === 'circle'    ? (circles.length > 0 ? 'Real people.\nReal progress.' : 'Find Your\nPeople.') :
             mainTab === 'following' ? 'People\nYou Follow.' :
             mainTab === 'calendar'  ? 'Goal\nDeadlines.' :
                                       'Discover\nBuilders.'}
          </h1>
        </div>
        {mainTab === 'circle' && circles.length > 0 && (
          <button onClick={() => setShowPost(true)} className="btn-gold" style={{ width: 'auto', padding: '10px 18px', fontSize: 11 }}>+ SHARE</button>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 24, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.k} className={`comm-tab${mainTab === t.k ? ' active' : ''}`} onClick={() => setMainTab(t.k)}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ══════════ CIRCLE TAB ══════════ */}
      {mainTab === 'circle' && (
        <>
          {circles.length === 0 ? (
            <>
              <p style={{ fontSize: 13, color: '#555', fontWeight: 300, marginBottom: 20 }}>Accountability is better together.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <button onClick={() => setShowCreate(true)} style={{ width: '100%', padding: 24, borderRadius: 18, border: '1px solid rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.05)', textAlign: 'left', cursor: 'pointer' }}>
                  <p style={{ fontSize: 28, marginBottom: 10 }}>✨</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', marginBottom: 4 }}>Create a Circle</p>
                  <p style={{ fontSize: 13, color: '#666', fontWeight: 300 }}>Start your own group and invite people with a code.</p>
                </button>
                <button onClick={() => setShowJoin(true)} style={{ width: '100%', padding: 24, borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', cursor: 'pointer' }}>
                  <p style={{ fontSize: 28, marginBottom: 10 }}>🔑</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', marginBottom: 4 }}>Join a Circle</p>
                  <p style={{ fontSize: 13, color: '#666', fontWeight: 300 }}>Enter an invite code from a friend.</p>
                </button>
              </div>
              {successCode && (
                <div style={{ padding: 20, borderRadius: 18, border: '1px solid rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.05)' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>CIRCLE CREATED — SHARE THIS CODE</p>
                  <p style={{ fontSize: 36, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.3em' }}>{successCode}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Invite strip */}
              {primaryCircle && (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#555' }}>
                    {circles.map(c => c.name).join(' · ')} ·{' '}
                    <span style={{ fontWeight: 900, color: '#D4AF37', letterSpacing: '0.2em' }}>{primaryCircle.code}</span>
                  </span>
                  <button onClick={() => setShowJoin(true)} style={{ fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Join another →</button>
                </div>
              )}
              {/* This Week's Reflections strip */}
              {memberAssessments.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', marginBottom: 10 }}>THIS WEEK&apos;S REFLECTIONS</p>
                  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                    {memberAssessments.map(ma => {
                      const rColors: Record<number, string> = { 1:'#f87171',2:'#f87171',3:'#fb923c',4:'#fbbf24',5:'#fbbf24',6:'#D4AF37',7:'#D4AF37',8:'#4ade80',9:'#4ade80',10:'#22c55e' }
                      const r = ma.rating ?? 7
                      const color = rColors[r] ?? '#D4AF37'
                      return (
                        <a key={ma.user_id} href={`/assess/${ma.user_id}`} style={{ display: 'block', textDecoration: 'none', flexShrink: 0, width: 160, borderRadius: 16, overflow: 'hidden', border: `1px solid ${color}20` }}>
                          <div style={{ height: 3, background: `linear-gradient(90deg,${color},${color}55)` }} />
                          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarGrad(ma.user_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#FFF' }}>
                                {initials(ma.full_name)}
                              </div>
                              <span style={{ fontSize: 16, fontWeight: 900, color, textShadow: `0 0 12px ${color}60` }}>{r}</span>
                            </div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ma.week_title ? `"${ma.week_title}"` : (ma.full_name?.split(' ')[0] ?? 'Member')}
                            </p>
                            <p style={{ fontSize: 10, color: '#555', marginTop: 2 }}>Read reflection →</p>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Type filter */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 18, scrollbarWidth: 'none' }}>
                {FILTER_TABS.map(t => (
                  <button key={t.k} onClick={() => setFilter(t.k)} style={{ whiteSpace: 'nowrap', padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Satoshi,sans-serif', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0, background: filter === t.k ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)', color: filter === t.k ? '#D4AF37' : '#888', border: filter === t.k ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255,255,255,0.09)' }}>
                    {t.l}
                  </button>
                ))}
              </div>
              {/* Posts */}
              {filteredPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <p style={{ fontSize: 40, marginBottom: 14 }}>💬</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No posts yet</p>
                  <p style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>Be the first to share a win or update.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredPosts.map(post => <PostCard key={post.id} post={post} userId={userId} onReact={handleReaction} />)}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ══════════ FOLLOWING TAB ══════════ */}
      {mainTab === 'following' && (
        <FollowingTab
          followingIds={followingIds}
          discoverProfiles={discoverProfiles}
          followingPosts={followingPosts}
          userId={userId}
          onReact={handleReaction}
          onDiscover={() => setMainTab('discover')}
        />
      )}

      {/* ══════════ CALENDAR TAB ══════════ */}
      {mainTab === 'calendar' && <CalendarTab goals={calGoals} />}

      {/* ══════════ DISCOVER TAB ══════════ */}
      {mainTab === 'discover' && (
        <DiscoverTab
          profiles={discoverProfiles}
          followingIds={followingIds}
          userId={userId}
          isPending={isPending}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
        />
      )}

      {/* ══ Share Modal ══ */}
      {showPost && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }} onClick={() => { setShowPost(false); setPostContent('') }}>
          <div style={{ width: '100%', maxWidth: 520, borderRadius: '28px 28px 0 0', background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: 24, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 32, height: 3, borderRadius: 2, background: '#222', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', lineHeight: 1 }}>Share with your Circle</h2>
                <p style={{ fontSize: 11, color: '#444', marginTop: 4 }}>What&apos;s worth celebrating today?</p>
              </div>
              <button onClick={() => { setShowPost(false); setPostContent('') }} style={{ fontSize: 22, color: '#555', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', marginBottom: 12 }}>WHAT TYPE OF UPDATE?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                {TYPE_KEYS.map(k => {
                  const m = TYPE_META[k]; const active = postType === k
                  return (
                    <button key={k} type="button" onClick={() => setPostType(k)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 4px', borderRadius: 14, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', background: active ? m.bg : 'rgba(255,255,255,0.03)', border: active ? `1px solid ${m.border}` : '1px solid rgba(255,255,255,0.07)', transform: active ? 'scale(1.04)' : 'scale(1)' }}>
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{m.emoji}</span>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: active ? m.color : '#555' }}>{m.label.toUpperCase()}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: '11px 14px', borderRadius: 10, background: selectedMeta.bg, border: `1px solid ${selectedMeta.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{selectedMeta.emoji}</span>
              <p style={{ fontSize: 12, color: selectedMeta.color, fontWeight: 500, lineHeight: 1.5 }}>{selectedMeta.prompt}</p>
            </div>
            <textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="Be specific. Be honest." rows={5} maxLength={500} autoFocus className="cc-input" style={{ marginBottom: 6, fontSize: 14, lineHeight: 1.65, resize: 'none' }} />
            <p style={{ fontSize: 10, color: postContent.length > 450 ? '#f87171' : '#444', textAlign: 'right', marginBottom: 20 }}>{postContent.length}/500</p>
            {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-ghost" style={{ width: 'auto', padding: '13px 20px' }} onClick={() => { setShowPost(false); setPostContent('') }}>Cancel</button>
              <button type="button" disabled={isPending || !postContent.trim()} onClick={handlePost} style={{ flex: 1, padding: '13px 20px', borderRadius: 14, cursor: postContent.trim() ? 'pointer' : 'default', fontFamily: 'Satoshi,sans-serif', fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', transition: 'all 0.2s', border: `1px solid ${selectedMeta.border}`, background: postContent.trim() ? selectedMeta.bg : 'rgba(255,255,255,0.03)', color: postContent.trim() ? selectedMeta.color : '#444', opacity: isPending ? 0.6 : 1, boxShadow: postContent.trim() ? `0 0 20px ${selectedMeta.border}` : 'none' }}>
                {isPending ? 'POSTING…' : `POST ${selectedMeta.emoji}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Create Circle Modal ══ */}
      <CCModal show={showCreate} onClose={() => setShowCreate(false)} title="Create a Circle">
        <form autoComplete="off" action={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>CIRCLE NAME</label>
            <input name="name" required placeholder="e.g. The Builders" className="cc-input" />
          </div>
          {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={isPending} className="btn-gold">{isPending ? 'CREATING...' : 'CREATE CIRCLE'}</button>
        </form>
      </CCModal>

      {/* ══ Join Circle Modal ══ */}
      <CCModal show={showJoin} onClose={() => setShowJoin(false)} title="Join a Circle">
        <form autoComplete="off" action={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>INVITE CODE</label>
            <input name="code" required placeholder="e.g. ABC123" className="cc-input" style={{ textTransform: 'uppercase', letterSpacing: '0.3em' }} maxLength={6} />
          </div>
          {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={isPending} className="btn-gold">{isPending ? 'JOINING...' : 'JOIN CIRCLE'}</button>
        </form>
      </CCModal>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Following Tab
// ══════════════════════════════════════════════════════
function FollowingTab({ followingIds, discoverProfiles, followingPosts, userId, onReact, onDiscover }: {
  followingIds: string[]; discoverProfiles: DiscoverProfile[]; followingPosts: PostWithMeta[]
  userId: string; onReact: (id: string, type: 'fire' | 'strong' | 'relate') => void
  onDiscover: () => void
}) {
  const followedProfiles = discoverProfiles.filter(p => followingIds.includes(p.id))

  if (followingIds.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: 40, marginBottom: 14 }}>👤</p>
        <p style={{ fontSize: 17, fontWeight: 800, color: '#EFEFEF', marginBottom: 6 }}>No one followed yet</p>
        <p style={{ fontSize: 13, color: '#555', fontWeight: 300, marginBottom: 24 }}>Follow builders doing incredible things.</p>
        <button onClick={onDiscover} className="btn-gold" style={{ width: 'auto', padding: '12px 24px', fontSize: 11 }}>DISCOVER PEOPLE →</button>
      </div>
    )
  }

  return (
    <div>
      {/* Avatar scroll */}
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
        {followedProfiles.map(p => (
          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: avatarGrad(p.id), color: '#FFF', fontSize: 14, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.1)' }}>
              {initials(p.full_name)}
            </div>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#666', maxWidth: 52, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.username ?? p.full_name?.split(' ')[0] ?? '?'}
            </p>
          </div>
        ))}
      </div>

      {/* Posts */}
      {followingPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: 13, color: '#555' }}>No posts from people you follow yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {followingPosts.map(post => <PostCard key={post.id} post={post} userId={userId} onReact={onReact} />)}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Calendar Tab
// ══════════════════════════════════════════════════════
function CalendarTab({ goals }: { goals: CalGoal[] }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const goalsByDate: Record<string, CalGoal[]> = {}
  for (const g of goals) {
    goalsByDate[g.deadline] = [...(goalsByDate[g.deadline] ?? []), g]
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()
  const todayStr = today.toISOString().split('T')[0]

  const cells = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstDay + 1
    let date: Date
    if (dayNum < 1) date = new Date(viewYear, viewMonth - 1, prevMonthDays + dayNum)
    else if (dayNum > daysInMonth) date = new Date(viewYear, viewMonth + 1, dayNum - daysInMonth)
    else date = new Date(viewYear, viewMonth, dayNum)
    const dateKey = date.toISOString().split('T')[0]
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / 86400000)
    return {
      dateKey, dayNum: date.getDate(),
      inCurrentMonth: dayNum >= 1 && dayNum <= daysInMonth,
      isToday: dateKey === todayStr,
      isPast: dateKey < todayStr,
      isUrgent: daysUntil >= 0 && daysUntil <= 3,
      goals: goalsByDate[dateKey] ?? [],
    }
  })

  function prevMonth() {
    setSelectedDate(null)
    viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1)
  }
  function nextMonth() {
    setSelectedDate(null)
    viewMonth === 11 ? (setViewMonth(0), setViewYear(y => y + 1)) : setViewMonth(m => m + 1)
  }

  function handleCellClick(dateKey: string, cellGoals: CalGoal[]) {
    if (!cellGoals.length) return
    setSelectedDate(prev => prev === dateKey ? null : dateKey)
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const upcoming = goals.filter(g => g.deadline >= todayStr).sort((a,b) => a.deadline.localeCompare(b.deadline)).slice(0, 8)
  const monthGoals = goals.filter(g => g.deadline.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2,'0')}`))
  const selectedGoals = selectedDate ? (goalsByDate[selectedDate] ?? []) : []
  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''

  return (
    <div>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontSize: 18, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1 }}>{monthLabel}</p>
          {monthGoals.length > 0 && (
            <p style={{ fontSize: 10, color: '#D4AF37', fontWeight: 600, marginTop: 3 }}>
              {monthGoals.length} deadline{monthGoals.length !== 1 ? 's' : ''} this month
            </p>
          )}
        </div>
        <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontSize: 18, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>›</button>
        <button onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); setSelectedDate(null) }} style={{ padding: '7px 12px', borderRadius: 10, fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', background: 'rgba(212,175,55,0.07)', flexShrink: 0, letterSpacing: '0.04em' }}>TODAY</button>
      </div>

      {/* Day of week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: '#333', padding: '6px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 16 }}>
        {cells.map((cell, i) => {
          const isSelected = selectedDate === cell.dateKey
          const hasGoals = cell.goals.length > 0
          const primaryColor = hasGoals ? catColor(cell.goals[0].category) : '#D4AF37'
          const isUrgentCell = cell.inCurrentMonth && cell.isUrgent && hasGoals

          return (
            <div
              key={i}
              onClick={() => handleCellClick(cell.dateKey, cell.goals)}
              style={{
                borderRadius: 10,
                padding: '8px 4px 6px',
                minHeight: 56,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                cursor: hasGoals ? 'pointer' : 'default',
                transition: 'all 0.15s',
                position: 'relative',
                background: isSelected
                  ? `${primaryColor}18`
                  : isUrgentCell
                  ? 'rgba(248,113,113,0.05)'
                  : cell.isToday
                  ? 'rgba(212,175,55,0.07)'
                  : 'transparent',
                border: isSelected
                  ? `1px solid ${primaryColor}40`
                  : cell.isToday
                  ? '1px solid rgba(212,175,55,0.25)'
                  : '1px solid transparent',
                boxShadow: isSelected ? `0 0 16px ${primaryColor}20` : 'none',
              }}
            >
              {/* Day number */}
              <div style={{
                width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: cell.isToday ? 900 : cell.inCurrentMonth ? 600 : 400,
                background: cell.isToday ? '#D4AF37' : 'transparent',
                color: cell.isToday ? '#000' : cell.inCurrentMonth ? (cell.isPast ? '#444' : '#EFEFEF') : '#2a2a2a',
                boxShadow: cell.isToday ? '0 0 12px rgba(212,175,55,0.5)' : 'none',
                flexShrink: 0,
              }}>
                {cell.dayNum}
              </div>

              {/* Goal dots */}
              {cell.goals.length > 0 && cell.inCurrentMonth && (
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {cell.goals.slice(0, 3).map((g, gi) => (
                    <div key={gi} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: catColor(g.category),
                      boxShadow: isUrgentCell ? `0 0 6px ${catColor(g.category)}` : 'none',
                      flexShrink: 0,
                    }} />
                  ))}
                  {cell.goals.length > 3 && (
                    <div style={{ fontSize: 7, fontWeight: 800, color: '#555', lineHeight: 1, marginTop: 1 }}>+{cell.goals.length - 3}</div>
                  )}
                </div>
              )}

              {/* Urgency pulse */}
              {isUrgentCell && !isSelected && (
                <div style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: '#f87171', boxShadow: '0 0 6px rgba(248,113,113,0.8)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day detail panel */}
      {selectedDate && selectedGoals.length > 0 && (
        <div style={{ marginBottom: 20, borderRadius: 18, border: '1px solid rgba(212,175,55,0.18)', background: 'rgba(212,175,55,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#D4AF37', marginBottom: 2 }}>DEADLINE</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF' }}>{selectedDateLabel}</p>
            </div>
            <button onClick={() => setSelectedDate(null)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: '#555', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Satoshi,sans-serif' }}>×</button>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedGoals.map(g => {
              const color = catColor(g.category)
              const daysLeft = Math.ceil((new Date(g.deadline + 'T12:00:00').getTime() - today.getTime()) / 86400000)
              return (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: `${color}0a`, border: `1px solid ${color}22` }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.3 }}>{g.title}</p>
                    <p style={{ fontSize: 10, color, fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>{g.category ?? 'Goal'}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, color: daysLeft <= 1 ? '#f87171' : daysLeft <= 3 ? '#fbbf24' : color }}>{daysLeft}</p>
                    <p style={{ fontSize: 8, color: '#444', fontWeight: 700, letterSpacing: '0.06em' }}>DAYS</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming deadlines */}
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#444', marginBottom: 12 }}>UPCOMING DEADLINES</p>
      {upcoming.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>📅</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No upcoming deadlines</p>
          <p style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>Set deadlines on your goals and they&apos;ll appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcoming.map(g => {
            const daysLeft = Math.ceil((new Date(g.deadline + 'T12:00:00').getTime() - today.getTime()) / 86400000)
            const color = catColor(g.category)
            const urgency = daysLeft <= 1 ? '#f87171' : daysLeft <= 3 ? '#fbbf24' : color
            return (
              <div
                key={g.id}
                onClick={() => setSelectedDate(g.deadline)}
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, borderRadius: 14, border: `1px solid ${urgency}18`, background: `${urgency}06`, cursor: 'pointer', transition: 'all 0.15s' }}
              >
                {/* Days countdown */}
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${urgency}14`, border: `1px solid ${urgency}25`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <p style={{ fontSize: daysLeft > 99 ? 12 : 18, fontWeight: 900, lineHeight: 1, color: urgency }}>{daysLeft}</p>
                  <p style={{ fontSize: 7, color: urgency, fontWeight: 700, letterSpacing: '0.06em', opacity: 0.7 }}>DAYS</p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'capitalize' }}>{g.category ?? 'Goal'}</p>
                    <span style={{ fontSize: 10, color: '#333' }}>·</span>
                    <p style={{ fontSize: 10, color: '#444' }}>{new Date(g.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
                {daysLeft <= 3 && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: urgency, boxShadow: `0 0 8px ${urgency}`, flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Discover Tab
// ══════════════════════════════════════════════════════
function DiscoverTab({ profiles, followingIds, userId, isPending, onFollow, onUnfollow }: {
  profiles: DiscoverProfile[]; followingIds: string[]
  userId: string; isPending: boolean
  onFollow: (id: string) => void; onUnfollow: (id: string) => void
}) {
  const [discFilter, setDiscFilter] = useState<'all' | 'following'>('all')
  const filtered = discFilter === 'following'
    ? profiles.filter(p => followingIds.includes(p.id))
    : profiles

  if (profiles.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: 40, marginBottom: 14 }}>✦</p>
        <p style={{ fontSize: 17, fontWeight: 800, color: '#EFEFEF', marginBottom: 6 }}>No builders yet</p>
        <p style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>Invite others to join Confirmed Creations to discover people to follow.</p>
      </div>
    )
  }

  const spotlight = profiles.find(p => !followingIds.includes(p.id)) ?? profiles[0]
  const rest = profiles.filter(p => p.id !== spotlight.id)

  return (
    <div>
      {/* Filter toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, gap: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['all', 'following'] as const).map(f => (
            <button key={f} onClick={() => setDiscFilter(f)} style={{ padding: '5px 13px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', border: 'none', transition: 'all 0.15s', background: discFilter === f ? 'rgba(212,175,55,0.15)' : 'transparent', color: discFilter === f ? '#D4AF37' : '#555' }}>
              {f === 'all' ? 'All' : 'Following'}
            </button>
          ))}
        </div>
      </div>

      {/* Spotlight card */}
      {discFilter === 'all' && (
        <div style={{ marginBottom: 16 }}>
          <div className="disc-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: avatarGrad(spotlight.id), zIndex: 0 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(170deg,rgba(13,13,13,0) 0%,rgba(13,13,13,0.6) 45%,#0D0D0D 85%)', zIndex: 1 }} />
            <div style={{ position: 'relative', zIndex: 2, padding: '18px 18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: '#D4AF37', background: 'rgba(212,175,55,0.14)', border: '1px solid rgba(212,175,55,0.3)', padding: '4px 10px', borderRadius: 6 }}>✦ SPOTLIGHT</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 66, height: 66, borderRadius: '50%', background: avatarGrad(spotlight.id), color: '#FFF', fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.12)', boxShadow: '0 0 28px rgba(0,0,0,0.6)', flexShrink: 0 }}>
                  {initials(spotlight.full_name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{spotlight.full_name ?? 'Builder'}</p>
                  {spotlight.username && <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>@{spotlight.username}</p>}
                </div>
              </div>
              {spotlight.tagline && (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.14)', borderLeft: '3px solid rgba(212,175,55,0.4)' }}>
                  <p style={{ fontSize: 13, color: '#D4AF37', fontStyle: 'italic', lineHeight: 1.6 }}>&ldquo;{spotlight.tagline}&rdquo;</p>
                </div>
              )}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 16, overflow: 'hidden' }}>
                <div className="disc-stat" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="disc-stat-n" style={{ color: '#FF9500' }}>🔥 {spotlight.streak}w</p>
                  <p className="disc-stat-l">STREAK</p>
                </div>
                <div className="disc-stat">
                  <p className="disc-stat-n" style={{ color: '#D4AF37' }}>{spotlight.goals_complete}</p>
                  <p className="disc-stat-l">GOALS DONE</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <FollowBtn id={spotlight.id} userId={userId} followingIds={followingIds} isPending={isPending} onFollow={onFollow} onUnfollow={onUnfollow} large />
                <a href={`/inbox/${spotlight.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Builder cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.filter(p => p.id !== spotlight.id || discFilter === 'following').map(p => (
          <div key={p.id} className="disc-card">
            <div className="disc-band" style={{ background: avatarGrad(p.id) }}>
              {p.streak > 0 && (
                <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '4px 8px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize: 11 }}>🔥</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#FF9500' }}>{p.streak}w</span>
                </div>
              )}
              <div className="disc-av-float" style={{ width: 52, height: 52, fontSize: 14, background: avatarGrad(p.id) }}>
                {initials(p.full_name)}
              </div>
            </div>
            <div style={{ padding: '30px 16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.15 }}>{p.full_name ?? 'Builder'}</p>
                  {p.username && <p style={{ fontSize: 10, color: '#444', marginTop: 2 }}>@{p.username}</p>}
                </div>
                <FollowBtn id={p.id} userId={userId} followingIds={followingIds} isPending={isPending} onFollow={onFollow} onUnfollow={onUnfollow} />
              </div>
              {p.tagline && (
                <p style={{ fontSize: 11.5, color: '#666', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 12, paddingLeft: 10, borderLeft: '2px solid rgba(212,175,55,0.25)' }}>
                  &ldquo;{p.tagline}&rdquo;
                </p>
              )}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                <div className="disc-stat" style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                  <p className="disc-stat-n">{p.streak}</p>
                  <p className="disc-stat-l">STREAK</p>
                </div>
                <div className="disc-stat">
                  <p className="disc-stat-n" style={{ color: '#D4AF37' }}>{p.goals_complete}</p>
                  <p className="disc-stat-l">DONE</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {discFilter === 'following' && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '52px 20px' }}>
            <p style={{ fontSize: 36, marginBottom: 14 }}>✦</p>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#EFEFEF', marginBottom: 6 }}>No one followed yet</p>
            <button onClick={() => setDiscFilter('all')} className="btn-gold" style={{ width: 'auto', padding: '12px 26px', marginTop: 12, fontSize: 11 }}>SEE ALL BUILDERS →</button>
          </div>
        )}
      </div>
    </div>
  )
}

function FollowBtn({ id, userId, followingIds, isPending, onFollow, onUnfollow, large }: {
  id: string; userId: string; followingIds: string[]
  isPending: boolean; onFollow: (id: string) => void; onUnfollow: (id: string) => void
  large?: boolean
}) {
  if (id === userId) return null
  const isFollowing = followingIds.includes(id)
  return (
    <button
      onClick={() => isFollowing ? onUnfollow(id) : onFollow(id)}
      disabled={isPending}
      style={{ padding: large ? '13px' : '8px 14px', borderRadius: large ? 12 : 9, fontSize: large ? 13 : 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0, width: large ? '100%' : undefined, letterSpacing: large ? '0.04em' : undefined, background: isFollowing ? 'rgba(139,92,246,0.1)' : 'rgba(212,175,55,0.1)', color: isFollowing ? '#a78bfa' : '#D4AF37', border: isFollowing ? '1px solid rgba(139,92,246,0.25)' : '1px solid rgba(212,175,55,0.25)' }}
    >
      {isFollowing ? '✓ Following' : '+ Follow'}
    </button>
  )
}

// ══════════════════════════════════════════════════════
// Shared sub-components
// ══════════════════════════════════════════════════════
function PostCard({ post, userId, onReact }: { post: PostWithMeta; userId: string; onReact: (id: string, type: 'fire' | 'strong' | 'relate') => void }) {
  const isOwn = post.user_id === userId
  const displayName = isOwn ? 'You' : (post.author_name ?? 'Member')
  const av = displayName === 'You' ? 'ME' : initials(displayName)
  const grad = isOwn ? 'linear-gradient(135deg,#D4AF37,#f97316)' : avatarGrad(post.user_id)
  const meta = TYPE_META[post.type]
  return (
    <div className={`post-card post-${post.type}`} style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: grad, color: '#FFF', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{av}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, color: '#EFEFEF', fontWeight: 700, lineHeight: 1, marginBottom: 5 }}>{displayName}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge-${post.type}`}>{meta ? `${meta.emoji} ${meta.label.toUpperCase()}` : post.type.toUpperCase()}</span>
            <span style={{ fontSize: 10, color: '#555' }}>{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 14, color: '#AAA', fontWeight: 300, lineHeight: 1.7 }}>{post.content}</p>
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Reaction emoji="🔥" count={post.reactions.fire}   active={post.my_reactions.fire}   activeColor="#FF9500" activeBg="rgba(255,149,0,0.12)"  activeBorder="rgba(255,149,0,0.3)"  onClick={() => onReact(post.id, 'fire')} />
        <Reaction emoji="💪" count={post.reactions.strong} active={post.my_reactions.strong} activeColor="#a78bfa" activeBg="rgba(139,92,246,0.12)" activeBorder="rgba(139,92,246,0.3)" onClick={() => onReact(post.id, 'strong')} />
        <Reaction emoji="🤝" count={post.reactions.relate} active={post.my_reactions.relate} activeColor="#4ade80" activeBg="rgba(34,197,94,0.12)"  activeBorder="rgba(34,197,94,0.3)"  onClick={() => onReact(post.id, 'relate')} />
      </div>
    </div>
  )
}

function Reaction({ emoji, count, active, activeColor, activeBg, activeBorder, onClick }: { emoji: string; count: number; active: boolean; activeColor: string; activeBg: string; activeBorder: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Satoshi,sans-serif', background: active ? activeBg : 'rgba(255,255,255,0.04)', border: active ? `1px solid ${activeBorder}` : '1px solid rgba(255,255,255,0.07)', color: active ? activeColor : '#777' }}>
      {emoji} <span style={{ fontWeight: 700 }}>{count}</span>
    </button>
  )
}

function CCModal({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, borderRadius: '24px 24px 0 0', background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 32, height: 3, borderRadius: 2, background: '#222', margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF' }}>{title}</h2>
          <button onClick={onClose} style={{ fontSize: 24, color: '#555', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
