'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleGoalReaction, addGoalComment, removeGoalComment } from '@/app/(app)/goals/actions'

export type GoalComment = { id: string; user_id: string; author_name: string | null; content: string; created_at: string }
export type GoalReactionCounts = { fire: number; believe: number; cheer: number }
export type GoalMyReactions = { fire: boolean; believe: boolean; cheer: boolean }

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return '1d ago'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_GRADS = [
  'linear-gradient(135deg,#22c55e,#0ea5e9)',
  'linear-gradient(135deg,#f472b6,#fb923c)',
  'linear-gradient(135deg,#a78bfa,#38bdf8)',
  'linear-gradient(135deg,#D4AF37,#f97316)',
  'linear-gradient(135deg,#f87171,#d946ef)',
  'linear-gradient(135deg,#4ade80,#D4AF37)',
]
function avatarGrad(id: string) {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_GRADS[h % AVATAR_GRADS.length]
}

function Reaction({ emoji, count, active, activeColor, activeBg, activeBorder, onClick }: {
  emoji: string; count: number; active: boolean
  activeColor: string; activeBg: string; activeBorder: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999,
      fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Satoshi,sans-serif',
      background: active ? activeBg : 'rgba(255,255,255,0.04)',
      border: active ? `1px solid ${activeBorder}` : '1px solid rgba(255,255,255,0.07)',
      color: active ? activeColor : 'rgba(255,255,255,0.52)',
    }}>
      {emoji} <span style={{ fontWeight: 700 }}>{count}</span>
    </button>
  )
}

export function GoalSocialBar({ goalId, currentUserId, initialReactions, initialMyReactions, initialComments }: {
  goalId: string
  currentUserId: string
  initialReactions: GoalReactionCounts
  initialMyReactions: GoalMyReactions
  initialComments: GoalComment[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [reactions, setReactions] = useState(initialReactions)
  const [myReactions, setMyReactions] = useState(initialMyReactions)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState(initialComments)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleReaction(type: 'fire' | 'believe' | 'cheer') {
    const wasActive = myReactions[type]
    setMyReactions(prev => ({ ...prev, [type]: !wasActive }))
    setReactions(prev => ({ ...prev, [type]: wasActive ? prev[type] - 1 : prev[type] + 1 }))
    startTransition(async () => { await toggleGoalReaction(goalId, type); router.refresh() })
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    const optimistic: GoalComment = {
      id: 'temp-' + Date.now(), user_id: currentUserId,
      author_name: 'You', content: commentText.trim(), created_at: new Date().toISOString(),
    }
    setComments(prev => [...prev, optimistic])
    setCommentText('')
    const result = await addGoalComment(goalId, optimistic.content)
    if (result.error) {
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
    } else {
      startTransition(() => { router.refresh() })
    }
    setSubmitting(false)
  }

  function handleDeleteComment(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    startTransition(async () => { await removeGoalComment(commentId); router.refresh() })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <Reaction emoji="🔥" count={reactions.fire}    active={myReactions.fire}    activeColor="#FF9500" activeBg="rgba(255,149,0,0.12)"  activeBorder="rgba(255,149,0,0.3)"  onClick={() => handleReaction('fire')} />
        <Reaction emoji="⚡" count={reactions.believe} active={myReactions.believe} activeColor="#a78bfa" activeBg="rgba(139,92,246,0.12)" activeBorder="rgba(139,92,246,0.3)" onClick={() => handleReaction('believe')} />
        <Reaction emoji="🎉" count={reactions.cheer}   active={myReactions.cheer}   activeColor="#4ade80" activeBg="rgba(34,197,94,0.12)"  activeBorder="rgba(34,197,94,0.3)"  onClick={() => handleReaction('cheer')} />
        <button onClick={() => { setShowComments(o => !o); setTimeout(() => inputRef.current?.focus(), 100) }} style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
          fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s',
          background: showComments ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
          border: showComments ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.07)',
          color: showComments ? '#EFEFEF' : 'rgba(255,255,255,0.42)',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ fontWeight: 700 }}>{comments.length > 0 ? comments.length : 'Reply'}</span>
        </button>
      </div>

      {showComments && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {comments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              {comments.map(comment => {
                const isMyComment = comment.user_id === currentUserId
                const name = isMyComment ? 'You' : (comment.author_name ?? 'Member')
                return (
                  <div key={comment.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: isMyComment ? 'linear-gradient(135deg,#D4AF37,#f97316)' : avatarGrad(comment.user_id), color: '#FFF', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {isMyComment ? 'ME' : initials(comment.author_name)}
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.025)', borderRadius: 10, padding: '8px 11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF' }}>{name}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{timeAgo(comment.created_at)}</span>
                        {isMyComment && (
                          <button onClick={() => handleDeleteComment(comment.id)} style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', padding: 0 }}>✕</button>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: '#999', lineHeight: 1.5 }}>{comment.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <form onSubmit={handleComment} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Encourage them…"
              maxLength={500}
              style={{ flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#EFEFEF', fontFamily: 'Satoshi,sans-serif', outline: 'none' }}
            />
            <button type="submit" disabled={!commentText.trim() || submitting} style={{
              padding: '9px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
              cursor: commentText.trim() ? 'pointer' : 'default', fontFamily: 'Satoshi,sans-serif',
              background: commentText.trim() ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
              border: commentText.trim() ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.07)',
              color: commentText.trim() ? '#D4AF37' : 'rgba(255,255,255,0.35)', transition: 'all 0.15s',
            }}>
              {submitting ? '…' : '→'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
