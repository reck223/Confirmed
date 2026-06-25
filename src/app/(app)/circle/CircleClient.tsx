'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCircle, joinCircle, createPost, toggleReaction } from './actions'

type PostWithMeta = {
  id: string
  content: string
  type: string
  created_at: string
  user_id: string
  circle_id: string | null
  author_name: string | null
  reactions: { fire: number; strong: number; relate: number }
  my_reactions: { fire: boolean; strong: boolean; relate: boolean }
}

type CircleInfo = { id: string; name: string; code: string }

export function CircleClient({
  posts,
  circles,
  userId,
}: {
  posts: PostWithMeta[]
  circles: CircleInfo[]
  userId: string
}) {
  const [showPost, setShowPost] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [successCode, setSuccessCode] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  const primaryCircle = circles[0]

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
      <div className="max-w-[600px] mx-auto px-5 py-8">
        <div className="mb-8">
          <p className="text-[9px] font-black tracking-[0.14em] text-[#D4AF37] mb-1">YOUR CIRCLE</p>
          <h1 className="text-3xl font-black text-[#EFEFEF] tracking-tight">Find Your People</h1>
          <p className="text-sm text-[#555] mt-1">Accountability is better together.</p>
        </div>

        <div className="grid gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full p-6 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/5 text-left hover:bg-[#D4AF37]/10 transition-colors"
          >
            <p className="text-2xl mb-2">✨</p>
            <p className="font-black text-[#EFEFEF] mb-1">Create a Circle</p>
            <p className="text-sm text-[#555]">Start your own group and invite people with a code.</p>
          </button>

          <button
            onClick={() => setShowJoin(true)}
            className="w-full p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-left hover:border-white/[0.1] transition-colors"
          >
            <p className="text-2xl mb-2">🔑</p>
            <p className="font-black text-[#EFEFEF] mb-1">Join a Circle</p>
            <p className="text-sm text-[#555]">Enter an invite code from a friend.</p>
          </button>
        </div>

        {successCode && (
          <div className="mt-6 p-5 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/5">
            <p className="text-[9px] font-black tracking-[0.14em] text-[#D4AF37] mb-1">CIRCLE CREATED</p>
            <p className="text-sm text-[#EFEFEF] mb-2">Share this invite code with your people:</p>
            <p className="text-3xl font-black text-[#D4AF37] tracking-widest">{successCode}</p>
          </div>
        )}

        <Modal show={showCreate} onClose={() => setShowCreate(false)} title="Create a Circle">
          <form action={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">CIRCLE NAME</label>
              <input name="name" required placeholder="e.g. The Builders" className={inputCls} />
            </div>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button type="submit" disabled={isPending} className={btnCls}>{isPending ? 'CREATING...' : 'CREATE CIRCLE'}</button>
          </form>
        </Modal>

        <Modal show={showJoin} onClose={() => setShowJoin(false)} title="Join a Circle">
          <form action={handleJoin} className="flex flex-col gap-4">
            <div>
              <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">INVITE CODE</label>
              <input name="code" required placeholder="e.g. ABC123" className={`${inputCls} uppercase tracking-widest`} maxLength={6} />
            </div>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button type="submit" disabled={isPending} className={btnCls}>{isPending ? 'JOINING...' : 'JOIN CIRCLE'}</button>
          </form>
        </Modal>
      </div>
    )
  }

  return (
    <div className="max-w-[600px] mx-auto px-5 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[9px] font-black tracking-[0.14em] text-[#D4AF37] mb-1">
            {circles.map(c => c.name).join(' · ')}
          </p>
          <h1 className="text-3xl font-black text-[#EFEFEF] tracking-tight">Circle</h1>
        </div>
        <button
          onClick={() => setShowPost(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black text-xs font-black tracking-wider"
        >
          + POST
        </button>
      </div>

      {/* Invite code hint */}
      {primaryCircle && (
        <div className="mb-6 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
          <span className="text-xs text-[#555]">Invite code: <span className="font-black text-[#D4AF37] tracking-wider">{primaryCircle.code}</span></span>
          <button
            onClick={() => { setShowJoin(true) }}
            className="text-xs text-[#555] hover:text-[#EFEFEF]"
          >Join another →</button>
        </div>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-bold text-[#EFEFEF] mb-1">No posts yet</p>
          <p className="text-sm text-[#555]">Be the first to share a win or update.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map(post => (
            <PostCard key={post.id} post={post} userId={userId} onReact={handleReaction} />
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      <Modal show={showPost} onClose={() => setShowPost(false)} title="Share with Your Circle">
        <form action={handlePost} className="flex flex-col gap-4">
          <div>
            <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">TYPE</label>
            <select name="type" className={inputCls}>
              <option value="win">🏆 Win</option>
              <option value="lesson">💡 Lesson</option>
              <option value="milestone">🎯 Milestone</option>
              <option value="progress">📈 Progress update</option>
              <option value="question">❓ Question</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">WHAT&apos;S HAPPENING?</label>
            <textarea name="content" required rows={4} placeholder="Share with your circle..." className={`${inputCls} resize-none`} />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button type="submit" disabled={isPending} className={btnCls}>{isPending ? 'POSTING...' : 'POST TO CIRCLE'}</button>
        </form>
      </Modal>

      <Modal show={showJoin} onClose={() => setShowJoin(false)} title="Join Another Circle">
        <form action={handleJoin} className="flex flex-col gap-4">
          <div>
            <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">INVITE CODE</label>
            <input name="code" required placeholder="e.g. ABC123" className={`${inputCls} uppercase tracking-widest`} maxLength={6} />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button type="submit" disabled={isPending} className={btnCls}>{isPending ? 'JOINING...' : 'JOIN CIRCLE'}</button>
        </form>
      </Modal>
    </div>
  )
}

function PostCard({ post, userId, onReact }: {
  post: PostWithMeta
  userId: string
  onReact: (id: string, type: 'fire' | 'strong' | 'relate') => void
}) {
  const typeEmoji: Record<string, string> = { win: '🏆', lesson: '💡', milestone: '🎯', progress: '📈', question: '❓' }
  const isOwn = post.user_id === userId

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-sm font-black text-[#D4AF37] flex-shrink-0">
          {(post.author_name ?? 'A').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#EFEFEF]">{isOwn ? 'You' : (post.author_name ?? 'Member')}</span>
            <span className="text-xs">{typeEmoji[post.type] ?? '📝'}</span>
            <span className="text-xs text-[#444] ml-auto">{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-[#EFEFEF]/90 leading-relaxed mb-4">{post.content}</p>

      <div className="flex gap-2">
        <ReactionBtn emoji="🔥" label="Fire" count={post.reactions.fire} active={post.my_reactions.fire} onClick={() => onReact(post.id, 'fire')} />
        <ReactionBtn emoji="💪" label="Strong" count={post.reactions.strong} active={post.my_reactions.strong} onClick={() => onReact(post.id, 'strong')} />
        <ReactionBtn emoji="🤝" label="Relate" count={post.reactions.relate} active={post.my_reactions.relate} onClick={() => onReact(post.id, 'relate')} />
      </div>
    </div>
  )
}

function ReactionBtn({ emoji, label, count, active, onClick }: {
  emoji: string; label: string; count: number; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
        active ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30' : 'bg-white/[0.04] text-[#555] border border-white/[0.06] hover:text-[#EFEFEF]'
      }`}
    >
      {emoji} {count > 0 && <span>{count}</span>}
    </button>
  )
}

function Modal({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl bg-[#111] border border-white/[0.08] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-[#EFEFEF]">{title}</h2>
          <button onClick={onClose} className="text-[#555] hover:text-[#EFEFEF] text-2xl leading-none">×</button>
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

const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#444] focus:outline-none focus:border-[#D4AF37]/50'
const btnCls = 'w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black text-xs font-black tracking-wider disabled:opacity-50 mt-2'
