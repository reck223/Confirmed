'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addComment, deleteComment } from './commentActions'

type Comment = {
  id: string
  user_id: string
  field: string
  content: string
  created_at: string
  author_name: string | null
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
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function FieldComments({
  assessmentId, field, comments, currentUserId, ownerUserId, accent,
}: {
  assessmentId: string; field: string; comments: Comment[]
  currentUserId: string; ownerUserId: string; accent: string
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const fieldComments = comments.filter(c => c.field === field)
  const count = fieldComments.length

  function handleAdd() {
    if (!text.trim()) return
    startTransition(async () => {
      await addComment(assessmentId, field, text, ownerUserId)
      setText('')
      router.refresh()
    })
  }

  function handleDelete(commentId: string) {
    startTransition(async () => {
      await deleteComment(commentId, ownerUserId)
      router.refresh()
    })
  }

  return (
    <div style={{ borderTop: `1px solid ${accent}14`, marginTop: 0 }}>
      {/* Toggle row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', textAlign: 'left' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={count > 0 ? accent : 'rgba(255,255,255,0.35)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: count > 0 ? accent : 'rgba(255,255,255,0.35)' }}>
          {count > 0 ? `${count} comment${count !== 1 ? 's' : ''}` : 'Add a comment'}
        </span>
        {count > 0 && (
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>{open ? '▲' : '▼'}</span>
        )}
      </button>

      {/* Comments expanded */}
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          {/* Existing comments */}
          {fieldComments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {fieldComments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarGrad(c.user_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#FFF', flexShrink: 0 }}>
                    {initials(c.author_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '9px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#EFEFEF' }}>{c.author_name ?? 'Member'}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{timeAgo(c.created_at)}</span>
                      {c.user_id === currentUserId && (
                        <button onClick={() => handleDelete(c.id)} style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', padding: 0 }}>
                          ×
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: '#AAA', fontWeight: 300, lineHeight: 1.6, margin: 0 }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarGrad(currentUserId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#FFF', flexShrink: 0 }}>
              ME
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Leave a comment…"
                rows={1}
                maxLength={280}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() } }}
                style={{ width: '100%', borderRadius: 10, border: `1px solid ${text ? accent + '40' : 'rgba(255,255,255,0.08)'}`, background: 'rgba(255,255,255,0.03)', color: '#EFEFEF', padding: '9px 40px 9px 12px', fontSize: 12, fontFamily: 'Satoshi,sans-serif', fontWeight: 300, lineHeight: 1.5, resize: 'none', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
              />
              <button
                onClick={handleAdd}
                disabled={isPending || !text.trim()}
                style={{ position: 'absolute', right: 8, bottom: 8, width: 24, height: 24, borderRadius: 7, border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', background: text.trim() ? accent : 'rgba(255,255,255,0.05)', opacity: isPending ? 0.5 : 1 }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? '#000' : 'rgba(255,255,255,0.35)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 19-4-8-8-4 19-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-open when there are no comments so the input is always visible */}
      {!open && count === 0 && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarGrad(currentUserId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#FFF', flexShrink: 0 }}>
              ME
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                value={text}
                onChange={e => { setText(e.target.value); if (!open) setOpen(true) }}
                onFocus={() => setOpen(true)}
                placeholder="Leave a comment…"
                rows={1}
                maxLength={280}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() } }}
                style={{ width: '100%', borderRadius: 10, border: `1px solid ${text ? accent + '40' : 'rgba(255,255,255,0.08)'}`, background: 'rgba(255,255,255,0.03)', color: '#EFEFEF', padding: '9px 40px 9px 12px', fontSize: 12, fontFamily: 'Satoshi,sans-serif', fontWeight: 300, lineHeight: 1.5, resize: 'none', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
              />
              <button
                onClick={handleAdd}
                disabled={isPending || !text.trim()}
                style={{ position: 'absolute', right: 8, bottom: 8, width: 24, height: 24, borderRadius: 7, border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', background: text.trim() ? accent : 'rgba(255,255,255,0.05)', opacity: isPending ? 0.5 : 1 }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? '#000' : 'rgba(255,255,255,0.35)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 19-4-8-8-4 19-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
