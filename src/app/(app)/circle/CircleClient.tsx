'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCircle, joinCircle, createPost, toggleReaction } from './actions'

type PostWithMeta = {
  id: string; content: string; type: string; created_at: string
  user_id: string; circle_id: string | null
  author_name: string | null
  reactions: { fire: number; strong: number; relate: number }
  my_reactions: { fire: boolean; strong: boolean; relate: boolean }
}

type CircleInfo = { id: string; name: string; code: string }

const POST_TYPES = [
  { k: 'all', l: 'All' }, { k: 'win', l: '🏆 Wins' }, { k: 'lesson', l: '💡 Lessons' },
  { k: 'progress', l: '📈 Progress' }, { k: 'question', l: '❓ Support' },
]

export function CircleClient({ posts, circles, userId }: { posts: PostWithMeta[]; circles: CircleInfo[]; userId: string }) {
  const [showPost, setShowPost] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [filter, setFilter] = useState('all')
  const [successCode, setSuccessCode] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  const primaryCircle = circles[0]
  const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.type === filter)

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

  function handlePost(formData: FormData) {
    setError('')
    if (!primaryCircle) return
    startTransition(async () => {
      const result = await createPost(primaryCircle.id, formData)
      if (result.error) { setError(result.error); return }
      setShowPost(false)
      router.refresh()
    })
  }

  function handleReaction(postId: string, type: 'fire' | 'strong' | 'relate') {
    startTransition(async () => {
      await toggleReaction(postId, type)
      router.refresh()
    })
  }

  if (circles.length === 0) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }} className="view-panel">
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>YOUR CIRCLE</p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1 }}>Find Your<br />People.</h1>
          <p style={{ fontSize: 13, color: '#555', fontWeight: 300, marginTop: 8 }}>Accountability is better together.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setShowCreate(true)} style={{ width: '100%', padding: 24, borderRadius: 18, border: '1px solid rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.05)', textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s' }}>
            <p style={{ fontSize: 28, marginBottom: 10 }}>✨</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', marginBottom: 4 }}>Create a Circle</p>
            <p style={{ fontSize: 13, color: '#666', fontWeight: 300 }}>Start your own group and invite people with a code.</p>
          </button>
          <button onClick={() => setShowJoin(true)} style={{ width: '100%', padding: 24, borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s' }}>
            <p style={{ fontSize: 28, marginBottom: 10 }}>🔑</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', marginBottom: 4 }}>Join a Circle</p>
            <p style={{ fontSize: 13, color: '#666', fontWeight: 300 }}>Enter an invite code from a friend.</p>
          </button>
        </div>

        {successCode && (
          <div style={{ marginTop: 24, padding: 20, borderRadius: 18, border: '1px solid rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.05)' }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>CIRCLE CREATED</p>
            <p style={{ fontSize: 13, color: '#EFEFEF', marginBottom: 10 }}>Share this invite code with your people:</p>
            <p style={{ fontSize: 36, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.3em' }}>{successCode}</p>
          </div>
        )}

        <CCModal show={showCreate} onClose={() => setShowCreate(false)} title="Create a Circle">
          <form action={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>CIRCLE NAME</label>
              <input name="name" required placeholder="e.g. The Builders" className="cc-input" />
            </div>
            {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={isPending} className="btn-gold">{isPending ? 'CREATING...' : 'CREATE CIRCLE'}</button>
          </form>
        </CCModal>

        <CCModal show={showJoin} onClose={() => setShowJoin(false)} title="Join a Circle">
          <form action={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>INVITE CODE</label>
              <input name="code" required placeholder="e.g. ABC123" className="cc-input" style={{ textTransform: 'uppercase', letterSpacing: '0.3em' }} maxLength={6} />
            </div>
            {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={isPending} className="btn-gold">{isPending ? 'JOINING...' : 'JOIN CIRCLE'}</button>
          </form>
        </CCModal>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }} className="view-panel">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>
            {circles.map(c => c.name).join(' · ')}
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1 }}>Real people.<br />Real progress.</h1>
        </div>
        <button onClick={() => setShowPost(true)} className="btn-gold" style={{ width: 'auto', padding: '10px 18px', fontSize: 11 }}>+ SHARE</button>
      </div>

      {/* Invite code strip */}
      {primaryCircle && (
        <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#555' }}>Invite: <span style={{ fontWeight: 900, color: '#D4AF37', letterSpacing: '0.2em' }}>{primaryCircle.code}</span></span>
          <button onClick={() => setShowJoin(true)} style={{ fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Join another →</button>
        </div>
      )}

      {/* Type filter chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20, scrollbarWidth: 'none' }}>
        {POST_TYPES.map(t => (
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
          {filteredPosts.map(post => (
            <PostCard key={post.id} post={post} userId={userId} onReact={handleReaction} />
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      <CCModal show={showPost} onClose={() => setShowPost(false)} title="Share with Your Circle">
        <form action={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>TYPE</label>
            <select name="type" className="cc-input" style={{ fontSize: 14 }}>
              <option value="win">🏆 Win</option>
              <option value="lesson">💡 Lesson</option>
              <option value="milestone">🎯 Milestone</option>
              <option value="progress">📈 Progress update</option>
              <option value="question">❓ Question / Support</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>WHAT&apos;S HAPPENING?</label>
            <textarea name="content" required rows={4} placeholder="Share with your circle…" className="cc-input" />
          </div>
          {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={isPending} className="btn-gold">{isPending ? 'POSTING...' : 'POST TO CIRCLE'}</button>
        </form>
      </CCModal>

      <CCModal show={showJoin} onClose={() => setShowJoin(false)} title="Join Another Circle">
        <form action={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 8 }}>INVITE CODE</label>
            <input name="code" required placeholder="e.g. ABC123" className="cc-input" style={{ textTransform: 'uppercase', letterSpacing: '0.3em' }} maxLength={6} />
          </div>
          {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={isPending} className="btn-gold">{isPending ? 'JOINING...' : 'JOIN CIRCLE'}</button>
        </form>
      </CCModal>
    </div>
  )
}

function PostCard({ post, userId, onReact }: { post: PostWithMeta; userId: string; onReact: (id: string, type: 'fire' | 'strong' | 'relate') => void }) {
  const isOwn = post.user_id === userId
  const initials = (post.author_name ?? 'A').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={`post-card post-${post.type}`} style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(212,175,55,0.15)', color: '#D4AF37', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(212,175,55,0.25)' }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ fontSize: 14, color: '#EFEFEF', fontWeight: 700, lineHeight: 1 }}>{isOwn ? 'You' : (post.author_name ?? 'Member')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge-${post.type}`}>{post.type.toUpperCase()}</span>
            <span style={{ fontSize: 10, color: '#555' }}>{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 14, color: '#AAA', fontWeight: 300, lineHeight: 1.7 }}>{post.content}</p>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Reaction emoji="🔥" count={post.reactions.fire} active={post.my_reactions.fire} activeColor="#FF9500" activeBg="rgba(255,149,0,0.12)" activeBorder="rgba(255,149,0,0.3)" onClick={() => onReact(post.id, 'fire')} />
        <Reaction emoji="💪" count={post.reactions.strong} active={post.my_reactions.strong} activeColor="#a78bfa" activeBg="rgba(139,92,246,0.12)" activeBorder="rgba(139,92,246,0.3)" onClick={() => onReact(post.id, 'strong')} />
        <Reaction emoji="🤝" count={post.reactions.relate} active={post.my_reactions.relate} activeColor="#4ade80" activeBg="rgba(34,197,94,0.12)" activeBorder="rgba(34,197,94,0.3)" onClick={() => onReact(post.id, 'relate')} />
      </div>
    </div>
  )
}

function Reaction({ emoji, count, active, activeColor, activeBg, activeBorder, onClick }: {
  emoji: string; count: number; active: boolean; activeColor: string; activeBg: string; activeBorder: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Satoshi,sans-serif', background: active ? activeBg : 'rgba(255,255,255,0.04)', border: active ? `1px solid ${activeBorder}` : '1px solid rgba(255,255,255,0.07)', color: active ? activeColor : '#777' }}>
      {emoji} <span style={{ fontWeight: 700 }}>{count}</span>
    </button>
  )
}

function CCModal({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose} className="md:items-center md:p-4">
      <div style={{ width: '100%', maxWidth: 520, borderRadius: '24px 24px 0 0', background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: 24 }} className="md:rounded-3xl" onClick={e => e.stopPropagation()}>
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
