'use client'
import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { sendMessage } from '../actions'

type Message = {
  id: string; sender_id: string; content: string; created_at: string; read_at: string | null
}

type SharedPost = {
  id: string; type: string; content: string; author: string
  authorAvatar: string | null; mediaUrl: string | null; mediaType: string | null
}

const TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  win:       { emoji: '🏆', label: 'Win',       color: '#4ade80' },
  lesson:    { emoji: '💡', label: 'Lesson',    color: '#D4AF37' },
  progress:  { emoji: '📈', label: 'Progress',  color: '#a78bfa' },
  milestone: { emoji: '🎯', label: 'Milestone', color: '#7dd3fc' },
  question:  { emoji: '❓', label: 'Support',   color: '#f472b6' },
}

function parsePost(content: string): SharedPost | null {
  if (!content.startsWith('[[POST]]')) return null
  try { return JSON.parse(content.slice(8)) } catch { return null }
}

function SharedPostCard({ post, isMine }: { post: SharedPost; isMine: boolean }) {
  const meta = TYPE_META[post.type] ?? { emoji: '📌', label: 'Post', color: '#D4AF37' }
  const GRADS = ['linear-gradient(135deg,#22c55e,#0ea5e9)','linear-gradient(135deg,#f472b6,#fb923c)','linear-gradient(135deg,#a78bfa,#38bdf8)','linear-gradient(135deg,#D4AF37,#f97316)']
  const grad = GRADS[(post.id?.charCodeAt(0) ?? 0) % GRADS.length]
  const av = post.author.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ width: 240, borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {/* Post header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px 8px' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#D4AF37,#a78bfa)', padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {post.authorAvatar
            ? <img src={post.authorAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#FFF' }}>{av}</div>
          }
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.author}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${meta.color}20`, color: meta.color, flexShrink: 0 }}>{meta.emoji} {meta.label}</span>
      </div>
      {/* Media */}
      {post.mediaUrl && post.mediaType === 'image' && (
        <img src={post.mediaUrl} alt="" style={{ width: '100%', display: 'block', maxHeight: 220, objectFit: 'cover' }} />
      )}
      {/* Text content */}
      {post.content && (
        <p style={{ fontSize: 13, color: '#C8C8C8', lineHeight: 1.55, padding: '8px 12px 12px', margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {post.content}
        </p>
      )}
      {/* Footer */}
      <div style={{ padding: '0 12px 10px' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Shared from Circle · Confirmed Creations</span>
      </div>
    </div>
  )
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
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function sameDay(a: string, b: string) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}
function dateSeparatorLabel(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((today.getTime() - msgDay.getTime()) / 86400000)
  if (diff === 0) return 'TODAY'
  if (diff === 1) return 'YESTERDAY'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: diff > 365 ? 'numeric' : undefined }).toUpperCase()
}
function bubbleTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function MessageThread({
  messages, currentUserId, recipientId, recipientName,
}: {
  messages: Message[]; currentUserId: string; recipientId: string; recipientName: string
}) {
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState<Message[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const allMessages = [...messages, ...optimistic]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages.length])

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 8000)
    return () => clearInterval(interval)
  }, [router])

  function handleSend() {
    const content = text.trim()
    if (!content || isPending) return
    setText('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    }
    setOptimistic(prev => [...prev, tempMsg])

    startTransition(async () => {
      await sendMessage(recipientId, content)
      setOptimistic([])
      router.refresh()
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const firstName = recipientName.split(' ')[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {allMessages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 20px', minHeight: 280 }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>👋</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>Say something to {firstName}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>This is the start of your conversation.</p>
          </div>
        )}

        {allMessages.map((msg, i) => {
          const isMine = msg.sender_id === currentUserId
          const isTemp = msg.id.startsWith('temp-')

          const prevMsg = i > 0 ? allMessages[i - 1] : null
          const nextMsg = i < allMessages.length - 1 ? allMessages[i + 1] : null

          const showDateSep = !prevMsg || !sameDay(prevMsg.created_at, msg.created_at)
          const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || showDateSep
          const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id || !sameDay(msg.created_at, nextMsg.created_at)

          const br = isMine
            ? `18px 18px ${isLastInGroup ? '4px' : '18px'} 18px`
            : `18px 18px 18px ${isLastInGroup ? '4px' : '18px'}`

          return (
            <div key={msg.id}>
              {/* Date separator */}
              {showDateSep && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em' }}>
                    {dateSeparatorLabel(msg.created_at)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>
              )}

              {/* Bubble row */}
              <div style={{
                display: 'flex',
                justifyContent: isMine ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: 8,
                marginBottom: isLastInGroup ? 10 : 2,
                paddingLeft: isMine ? 48 : 0,
                paddingRight: isMine ? 0 : 48,
              }}>
                {/* Their avatar — left of incoming, only on last bubble in group */}
                {!isMine && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: isLastInGroup ? avatarGrad(recipientId) : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#FFF', marginBottom: 0 }}>
                    {isLastInGroup ? initials(recipientName) : ''}
                  </div>
                )}

                {/* Bubble */}
                {(() => {
                  const sharedPost = parsePost(msg.content)
                  if (sharedPost) {
                    return (
                      <div style={{ opacity: isTemp ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                        <SharedPostCard post={sharedPost} isMine={isMine} />
                        <p style={{ fontSize: 9.5, textAlign: isMine ? 'right' : 'left', marginTop: 4, opacity: 0.45, color: '#EFEFEF', letterSpacing: '0.01em' }}>
                          {bubbleTime(msg.created_at)}{isTemp ? ' · sending…' : ''}
                        </p>
                      </div>
                    )
                  }
                  return (
                    <div style={{
                      maxWidth: '100%',
                      padding: '9px 13px 12px',
                      borderRadius: br,
                      wordBreak: 'break-word',
                      opacity: isTemp ? 0.6 : 1,
                      transition: 'opacity 0.2s',
                      background: isMine
                        ? 'linear-gradient(135deg,#D4AF37,#9A7010)'
                        : 'rgba(255,255,255,0.06)',
                      color: isMine ? '#000' : '#EFEFEF',
                      border: isMine ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    }}>
                      <p style={{ fontSize: 14, fontWeight: isMine ? 500 : 300, lineHeight: 1.5, margin: 0 }}>
                        {msg.content}
                      </p>
                      <p style={{ fontSize: 9.5, textAlign: 'right', marginTop: 4, marginBottom: 0, opacity: 0.55, color: isMine ? '#000' : '#EFEFEF', letterSpacing: '0.01em' }}>
                        {bubbleTime(msg.created_at)}{isTemp ? ' · sending…' : ''}
                      </p>
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 16px 28px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          {/* Textarea container */}
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${text ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 22, padding: '10px 16px', transition: 'border-color 0.15s' }}>
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${firstName}…`}
              rows={1}
              maxLength={1000}
              style={{
                width: '100%',
                background: 'none', border: 'none', outline: 'none',
                color: '#EFEFEF', fontSize: 14, fontFamily: 'Satoshi,sans-serif',
                fontWeight: 300, lineHeight: 1.5, resize: 'none',
                maxHeight: 120, overflowY: 'auto', display: 'block',
              }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
              }}
            />
          </div>

          {/* Send button — 44x44 rounded rect */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || isPending}
            style={{
              width: 44, height: 44, borderRadius: 14, border: 'none',
              cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
              background: text.trim()
                ? 'linear-gradient(135deg,#D4AF37,#9A7010)'
                : 'rgba(255,255,255,0.06)',
              boxShadow: text.trim() ? '0 0 18px rgba(212,175,55,0.35)' : 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? '#000' : '#333'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 19-4-8-8-4 19-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
