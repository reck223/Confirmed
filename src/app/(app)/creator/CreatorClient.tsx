'use client'
import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { approveCircleRequest, denyCircleRequest, deletePost, sendBroadcast } from './actions'

// ── Types ────────────────────────────────────────────────────────────────────

type Stats = {
  totalUsers: number; newUsers7d: number
  totalGoals: number; goalsCreated7d: number; goalsCompleted: number
  totalPosts: number; posts7d: number
  totalJournal: number; journal7d: number
  totalFollows: number; follows7d: number
  totalCircleJoins: number
}
type Builder = { id: string; full_name: string | null; username: string | null; avatar_url: string | null; xp: number; level: number; streak: number; goals_complete: number; created_at: string }
type CircleReq = { id: string; full_name: string | null; username: string | null; avatar_url: string | null; streak: number; goals_complete: number; circle_module_complete: boolean; created_at: string }
type RetentionData = { dau: number; wau: number; mau: number }
type ToolUsage = { tool: string; emoji: string; count: number; color: string }
type PlaybookLesson = { lessonId: string; title: string; moduleTitle: string; moduleEmoji: string; color: string; completed: number }
type FunnelStep = { label: string; count: number; icon: string; pct: number }
type RecentPost = { id: string; user_id: string; type: string; content: string; created_at: string }
type ActiveCircle = { id: string; name: string; memberCount: number; postCount: number }

// ── Helpers ──────────────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  health: '#22c55e', career: '#8b5cf6', business: '#3b82f6', finance: '#D4AF37',
  learning: '#38bdf8', creative: '#f97316', relationships: '#f43f5e',
  personal: '#14b8a6', adventure: '#84cc16', material: '#ef4444', spiritual: '#c084fc',
}
const CAT_EMOJI: Record<string, string> = {
  health: '💪', career: '🚀', business: '💼', finance: '💰',
  learning: '📚', creative: '🎨', relationships: '❤️',
  personal: '🌱', adventure: '🌍', material: '🏠', spiritual: '✨',
}
const JOURNAL_COLOR: Record<string, string> = { checkin: '#fbbf24', gratitude: '#f472b6', cbt: '#a78bfa', write: '#38bdf8', letters: '#d946ef' }
const JOURNAL_EMOJI: Record<string, string> = { checkin: '☀️', gratitude: '🌸', cbt: '🧠', write: '✍️', letters: '✉️' }
const POST_COLOR: Record<string, string> = { win: '#22c55e', lesson: '#a78bfa', milestone: '#D4AF37', progress: '#38bdf8', question: '#f97316' }
const POST_EMOJI: Record<string, string> = { win: '🏆', lesson: '📚', milestone: '🎯', progress: '📈', question: '❓' }

const AVATAR_GRADS = [
  'linear-gradient(135deg,#22c55e,#0ea5e9)', 'linear-gradient(135deg,#f472b6,#fb923c)',
  'linear-gradient(135deg,#a78bfa,#38bdf8)', 'linear-gradient(135deg,#D4AF37,#f97316)',
  'linear-gradient(135deg,#f87171,#d946ef)', 'linear-gradient(135deg,#4ade80,#D4AF37)',
]
function avatarGrad(id: string) { return AVATAR_GRADS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADS.length] }
function initials(n: string | null) { return n ? n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?' }
function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n) }
function timeAgo(s: string) {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label, color = '#D4AF37' }: { label: string; color?: string }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ display: 'inline-block', width: 2, height: 12, borderRadius: 1, background: color }} />
      {label}
    </p>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#D4AF37', icon }: { label: string; value: number | string; sub?: string; color?: string; icon: string }) {
  return (
    <div style={{ borderRadius: 20, background: `linear-gradient(135deg, ${color}0d 0%, #0d0d0d 60%)`, border: `1px solid ${color}25`, padding: '20px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -24, right: -16, width: 80, height: 80, borderRadius: '50%', background: color, filter: 'blur(32px)', opacity: 0.25, pointerEvents: 'none' }} />
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 32, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.03em' }}>{typeof value === 'number' ? fmt(value) : value}</span>
      </div>
      {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 6 }}>{sub}</p>}
    </div>
  )
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

function BarChart({ data, color = '#D4AF37' }: { data: { date: string; count: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const [hovered, setHovered] = useState<number | null>(null)
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.count / max) * 80)
          const isHov = hovered === i
          return (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: 'default' }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {isHov && (
                <div style={{ position: 'absolute', bottom: 88, left: `${(i / data.length) * 100}%`, transform: 'translateX(-40%)', background: '#1a1a1a', border: `1px solid ${color}44`, borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 700, color, whiteSpace: 'nowrap', zIndex: 10 }}>
                  {d.count} · {d.date.slice(5)}
                </div>
              )}
              <div style={{ height: h, background: isHov ? color : `${color}55`, borderRadius: '3px 3px 0 0', transition: 'background 0.15s' }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{data[0]?.date.slice(5)}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  )
}

// ── Horizontal bar ────────────────────────────────────────────────────────────

function HorizBar({ label, count, total, color, emoji }: { label: string; count: number; total: number; color: string; emoji: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#EFEFEF' }}>{emoji} {label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{count} <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>({pct.toFixed(0)}%)</span></span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 999 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, boxShadow: `0 0 8px ${color}66`, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ── Builder avatar row ────────────────────────────────────────────────────────

function BuilderRow({ b, rank }: { b: Builder; rank: number }) {
  return (
    <Link href={`/profile/${b.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 16, background: rank === 0 ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${rank === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
      <span style={{ fontSize: 11, fontWeight: 900, color: rank === 0 ? '#D4AF37' : rank === 1 ? '#aaa' : rank === 2 ? '#fb923c' : 'rgba(255,255,255,0.35)', minWidth: 18, textAlign: 'center' }}>
        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
      </span>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarGrad(b.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        {b.avatar_url ? <Image src={b.avatar_url} alt={b.full_name ?? ''} fill style={{ objectFit: 'cover' }} /> : initials(b.full_name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.full_name ?? 'Builder'}</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{b.username ? `@${b.username}` : `Level ${b.level}`} · joined {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
      </div>
      <div style={{ display: 'flex', gap: 12, flexShrink: 0, textAlign: 'right' }}>
        <div><p style={{ fontSize: 13, fontWeight: 900, color: '#D4AF37', lineHeight: 1 }}>{b.xp.toLocaleString()}</p><p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>XP</p></div>
        <div><p style={{ fontSize: 13, fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>{b.streak}</p><p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>WKS</p></div>
        <div><p style={{ fontSize: 13, fontWeight: 900, color: '#4ade80', lineHeight: 1 }}>{b.goals_complete}</p><p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>DONE</p></div>
      </div>
    </Link>
  )
}

// ── Circle request card ───────────────────────────────────────────────────────

function CircleRequestCard({ req }: { req: CircleReq }) {
  const [pending, startPending] = useTransition()
  const [resolved, setResolved] = useState<'approved' | 'denied' | null>(null)
  const initials_ = req.full_name ? req.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'
  const days = Math.floor((Date.now() - new Date(req.created_at).getTime()) / 86400000)

  if (resolved === 'approved') return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 16 }}>✅</span>
      <p style={{ fontSize: 13, color: '#4ade80', fontWeight: 700, margin: 0 }}>{req.full_name ?? 'Builder'} — approved</p>
    </div>
  )
  if (resolved === 'denied') return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 16 }}>❌</span>
      <p style={{ fontSize: 13, color: '#f87171', fontWeight: 700, margin: 0 }}>{req.full_name ?? 'Builder'} — denied</p>
    </div>
  )

  return (
    <div style={{ borderRadius: 18, background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.18)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarGrad(req.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          {req.avatar_url ? <Image src={req.avatar_url} alt={req.full_name ?? ''} fill style={{ objectFit: 'cover' }} /> : initials_}
        </div>
        <div style={{ flex: 1 }}>
          <Link href={`/profile/${req.id}`} style={{ textDecoration: 'none' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', marginBottom: 2 }}>{req.full_name ?? 'Builder'}</p>
          </Link>
          {req.username && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>@{req.username}</p>}
        </div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{days === 0 ? 'today' : `${days}d ago`}</p>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.12)', textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#4ade80', lineHeight: 1, marginBottom: 2 }}>{req.goals_complete}</p>
          <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)' }}>GOALS DONE</p>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)', textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#D4AF37', lineHeight: 1, marginBottom: 2 }}>{req.streak}</p>
          <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)' }}>WK STREAK</p>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: req.circle_module_complete ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${req.circle_module_complete ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.06)'}`, textAlign: 'center' }}>
          <p style={{ fontSize: 16, lineHeight: 1, marginBottom: 2 }}>{req.circle_module_complete ? '✅' : '⬜'}</p>
          <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)' }}>MODULE</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={pending} onClick={() => startPending(async () => { await approveCircleRequest(req.id); setResolved('approved') })}
          style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', fontSize: 12, fontWeight: 800, color: '#4ade80', cursor: pending ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}>
          APPROVE ✓
        </button>
        <button disabled={pending} onClick={() => startPending(async () => { await denyCircleRequest(req.id); setResolved('denied') })}
          style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.35)', cursor: pending ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}>
          DENY ✕
        </button>
      </div>
    </div>
  )
}

// ── Post card (moderation) ────────────────────────────────────────────────────

function PostCard({ post, authorName, onDelete }: { post: RecentPost; authorName: string; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startPending] = useTransition()
  const color = POST_COLOR[post.type] ?? '#D4AF37'
  const emoji = POST_EMOJI[post.type] ?? '📝'

  return (
    <div style={{ borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color, padding: '2px 8px', borderRadius: 999, background: `${color}18`, border: `1px solid ${color}30`, flexShrink: 0 }}>
            {emoji} {post.type}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {authorName}
          </span>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>{timeAgo(post.created_at)}</span>
      </div>
      <p style={{ fontSize: 13, color: '#EFEFEF', lineHeight: 1.6, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
        {post.content}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {confirming ? (
          <>
            <button onClick={() => setConfirming(false)} style={{ padding: '6px 14px', borderRadius: 8, background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
            <button disabled={pending} onClick={() => startPending(async () => { await deletePost(post.id); onDelete() })}
              style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 11, fontWeight: 800, cursor: pending ? 'not-allowed' : 'pointer' }}>
              {pending ? 'Deleting…' : 'Confirm delete'}
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ── User search ───────────────────────────────────────────────────────────────

function UserSearch({ builders }: { builders: Builder[] }) {
  const [q, setQ] = useState('')
  const results = q.trim().length < 2 ? [] : builders.filter(b => {
    const term = q.toLowerCase()
    return (b.full_name ?? '').toLowerCase().includes(term) || (b.username ?? '').toLowerCase().includes(term)
  }).slice(0, 10)

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or @username…"
          style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 13, fontFamily: 'Satoshi,sans-serif', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      {q.trim().length >= 2 && (
        results.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '12px 0', textAlign: 'center' }}>No builders found for &quot;{q}&quot;</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {results.map((b, i) => <BuilderRow key={b.id} b={b} rank={builders.indexOf(b)} />)}
          </div>
        )
      )}
      {q.trim().length < 2 && q.trim().length > 0 && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>Type at least 2 characters…</p>
      )}
    </div>
  )
}

// ── Broadcast panel ───────────────────────────────────────────────────────────

function BroadcastPanel() {
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, startPending] = useTransition()

  function handleSend() {
    if (!msg.trim()) return
    startPending(async () => {
      await sendBroadcast(msg.trim())
      setMsg('')
      setSent(true)
      setTimeout(() => setSent(false), 4000)
    })
  }

  return (
    <div style={{ borderRadius: 20, background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.18)', padding: '20px 18px' }}>
      {sent ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontSize: 22, marginBottom: 8 }}>📡</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>Broadcast sent to all users</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>They&apos;ll see it in their notifications.</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.6 }}>
            Sends a notification to every user. Use for announcements, feature drops, outages.
          </p>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="Write your broadcast message…"
            rows={3}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 13, fontFamily: 'Satoshi,sans-serif', resize: 'vertical', outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
          />
          <button
            disabled={!msg.trim() || pending}
            onClick={handleSend}
            style={{ width: '100%', padding: '12px', borderRadius: 12, background: msg.trim() ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${msg.trim() ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.08)'}`, color: msg.trim() ? '#D4AF37' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 900, letterSpacing: '0.1em', cursor: msg.trim() && !pending ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.2s' }}
          >
            {pending ? 'SENDING…' : '📡 SEND TO ALL USERS'}
          </button>
        </>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CreatorClient({ stats, topBuilders, signupChart, categoryBreakdown, journalBreakdown, circleRequests, retention, toolUsage, playbookFunnel, funnelSteps, allBuilders, recentPosts, activeCircles }: {
  stats: Stats; topBuilders: Builder[]; signupChart: { date: string; count: number }[]
  categoryBreakdown: [string, number][]; journalBreakdown: [string, number][]; circleRequests: CircleReq[]
  retention: RetentionData; toolUsage: ToolUsage[]; playbookFunnel: PlaybookLesson[]
  funnelSteps: FunnelStep[]; allBuilders: Builder[]; recentPosts: RecentPost[]
  activeCircles: ActiveCircle[]
}) {
  const completionRate = stats.totalGoals > 0 ? Math.round((stats.goalsCompleted / stats.totalGoals) * 100) : 0
  const totalCatGoals = categoryBreakdown.reduce((s, [, n]) => s + n, 0)
  const totalJournalEntries = journalBreakdown.reduce((s, [, n]) => s + n, 0)
  const maxTool = Math.max(...toolUsage.map(t => t.count), 1)

  // Playbook grouped by module
  const playbookModules: Record<string, { emoji: string; color: string; lessons: PlaybookLesson[] }> = {}
  for (const l of playbookFunnel) {
    if (!playbookModules[l.moduleTitle]) playbookModules[l.moduleTitle] = { emoji: l.moduleEmoji, color: l.color, lessons: [] }
    playbookModules[l.moduleTitle].lessons.push(l)
  }

  // Builder lookup for post author names
  const builderMap = new Map(allBuilders.map(b => [b.id, b.full_name ?? b.username ?? 'Unknown']))

  // Visible posts (deletions remove them from list)
  const [visiblePosts, setVisiblePosts] = useState(recentPosts.map(p => p.id))
  const shownPosts = recentPosts.filter(p => visiblePosts.includes(p.id))

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px 100px', fontFamily: 'Satoshi,sans-serif' }} className="view-panel">

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 32, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#22c55e' }}>CREATOR DASHBOARD</p>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: '#EFEFEF', marginBottom: 4 }}>App Analytics</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Live overview · only you can see this</p>
      </div>

      {/* ── OVERVIEW ── */}
      <SectionLabel label="OVERVIEW" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
        <StatCard label="TOTAL BUILDERS" value={stats.totalUsers} sub={`+${stats.newUsers7d} this week`} color="#D4AF37" icon="👥" />
        <StatCard label="GOALS CREATED" value={stats.totalGoals} sub={`+${stats.goalsCreated7d} this week`} color="#22c55e" icon="🎯" />
        <StatCard label="POSTS PUBLISHED" value={stats.totalPosts} sub={`+${stats.posts7d} this week`} color="#a78bfa" icon="📣" />
        <StatCard label="JOURNAL ENTRIES" value={stats.totalJournal} sub={`+${stats.journal7d} this week`} color="#38bdf8" icon="📓" />
      </div>

      {/* ── RETENTION ── */}
      <SectionLabel label="ACTIVE USERS (CHECK-IN BASED)" color="#22c55e" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'DAILY', value: retention.dau, sub: 'today', color: '#4ade80' },
          { label: 'WEEKLY', value: retention.wau, sub: 'last 7 days', color: '#D4AF37' },
          { label: 'MONTHLY', value: retention.mau, sub: 'last 30 days', color: '#38bdf8' },
        ].map(r => (
          <div key={r.label} style={{ borderRadius: 16, background: `${r.color}0a`, border: `1px solid ${r.color}20`, padding: '16px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 900, color: r.color, lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 4 }}>{r.value}</p>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{r.label}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{r.sub}</p>
          </div>
        ))}
      </div>

      {/* ── ENGAGEMENT ── */}
      <SectionLabel label="ENGAGEMENT" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'COMPLETION RATE', value: `${completionRate}%`, color: '#4ade80', icon: '✅' },
          { label: 'CONNECTIONS', value: stats.totalFollows, color: '#f472b6', icon: '🤝', sub: `+${stats.follows7d} this week` },
          { label: 'CIRCLE JOINS', value: stats.totalCircleJoins, color: '#fb923c', icon: '⭕' },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 16, background: `${s.color}0a`, border: `1px solid ${s.color}20`, padding: '14px 12px', textAlign: 'center' }}>
            <span style={{ fontSize: 22, display: 'block', marginBottom: 6 }}>{s.icon}</span>
            <p style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 4 }}>{typeof s.value === 'number' ? fmt(s.value) : s.value}</p>
            <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
            {'sub' in s && s.sub && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── ONBOARDING FUNNEL ── */}
      <SectionLabel label="ONBOARDING FUNNEL" color="#a78bfa" />
      <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 18px', marginBottom: 28 }}>
        {funnelSteps.map((step, i) => (
          <div key={step.label} style={{ marginBottom: i < funnelSteps.length - 1 ? 14 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{step.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#EFEFEF' }}>{step.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#EFEFEF' }}>{fmt(step.count)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: step.pct >= 50 ? '#4ade80' : step.pct >= 25 ? '#D4AF37' : '#f87171', minWidth: 36, textAlign: 'right' }}>{step.pct}%</span>
              </div>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 999 }}>
              <div style={{ height: '100%', width: `${step.pct}%`, borderRadius: 999, transition: 'width 0.6s ease',
                background: step.pct >= 50 ? '#4ade80' : step.pct >= 25 ? '#D4AF37' : '#f87171',
                boxShadow: `0 0 8px ${step.pct >= 50 ? '#4ade8066' : step.pct >= 25 ? '#D4AF3766' : '#f8717166'}`,
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── SIGNUP CHART ── */}
      <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 18px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel label="NEW BUILDERS · LAST 30 DAYS" />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#D4AF37', marginBottom: 12 }}>{signupChart.reduce((s, d) => s + d.count, 0)} total</span>
        </div>
        <BarChart data={signupChart} color="#D4AF37" />
      </div>

      {/* ── TOOL USAGE ── */}
      <SectionLabel label="TOOL USAGE (ALL TIME)" color="#38bdf8" />
      <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 18px', marginBottom: 28 }}>
        {toolUsage.map(t => (
          <div key={t.tool} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#EFEFEF' }}>{t.emoji} {t.tool}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: t.color }}>{fmt(t.count)}</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 999 }}>
              <div style={{ height: '100%', width: `${(t.count / maxTool) * 100}%`, background: t.color, borderRadius: 999, boxShadow: `0 0 8px ${t.color}66`, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── PLAYBOOK ANALYTICS ── */}
      <SectionLabel label="PLAYBOOK COMPLETION" color="#a78bfa" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {Object.entries(playbookModules).map(([modTitle, mod]) => {
          const maxC = Math.max(...mod.lessons.map(l => l.completed), 1)
          const first = mod.lessons[0]?.completed ?? 0
          const last = mod.lessons[mod.lessons.length - 1]?.completed ?? 0
          const dropOff = first > 0 ? Math.round((1 - last / first) * 100) : 0
          return (
            <div key={modTitle} style={{ borderRadius: 16, background: '#0d0d0d', border: `1px solid ${mod.color}22`, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{mod.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#EFEFEF' }}>{modTitle}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, textAlign: 'right' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 900, color: mod.color, lineHeight: 1 }}>{first}</p>
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>started</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 900, color: dropOff > 50 ? '#f87171' : '#4ade80', lineHeight: 1 }}>{dropOff}%</p>
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>drop-off</p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 32 }}>
                {mod.lessons.map(l => (
                  <div key={l.lessonId} title={l.title} style={{ flex: 1, height: Math.max(3, (l.completed / maxC) * 32), background: `${mod.color}${l.completed > 0 ? 'cc' : '22'}`, borderRadius: '2px 2px 0 0' }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── GOAL CATEGORIES ── */}
      <SectionLabel label="POPULAR GOAL CATEGORIES" />
      <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 18px', marginBottom: 28 }}>
        {categoryBreakdown.map(([cat, count]) => (
          <HorizBar key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)} count={count} total={totalCatGoals}
            color={CAT_COLOR[cat] ?? '#D4AF37'} emoji={CAT_EMOJI[cat] ?? '🎯'} />
        ))}
      </div>

      {/* ── JOURNAL BREAKDOWN ── */}
      <SectionLabel label="JOURNAL TYPE BREAKDOWN" />
      <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 18px', marginBottom: 28 }}>
        {journalBreakdown.map(([type, count]) => (
          <HorizBar key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} count={count} total={totalJournalEntries}
            color={JOURNAL_COLOR[type] ?? '#D4AF37'} emoji={JOURNAL_EMOJI[type] ?? '📝'} />
        ))}
      </div>

      {/* ── ACTIVE CIRCLES ── */}
      <SectionLabel label="MOST ACTIVE CIRCLES" color="#fb923c" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {activeCircles.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 16 }}>No circles yet</p>
        ) : activeCircles.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, background: '#0d0d0d', border: `1px solid ${i === 0 ? 'rgba(251,146,60,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.35)', minWidth: 18 }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF' }}>{c.name}</p>
            </div>
            <div style={{ display: 'flex', gap: 14, textAlign: 'right' }}>
              <div><p style={{ fontSize: 13, fontWeight: 900, color: '#38bdf8', lineHeight: 1 }}>{c.memberCount}</p><p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>members</p></div>
              <div><p style={{ fontSize: 13, fontWeight: 900, color: '#fb923c', lineHeight: 1 }}>{c.postCount}</p><p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>posts/30d</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TOP BUILDERS ── */}
      <SectionLabel label="TOP BUILDERS BY XP" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {topBuilders.map((b, i) => <BuilderRow key={b.id} b={b} rank={i} />)}
      </div>

      {/* ── USER SEARCH ── */}
      <SectionLabel label="FIND A BUILDER" color="#38bdf8" />
      <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 18px', marginBottom: 28 }}>
        <UserSearch builders={allBuilders} />
      </div>

      {/* ── CONTENT MODERATION ── */}
      <SectionLabel label={`RECENT POSTS · MODERATION (${shownPosts.length})`} color="#f87171" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {shownPosts.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 16 }}>No posts yet</p>
        ) : shownPosts.map(p => (
          <PostCard
            key={p.id}
            post={p}
            authorName={builderMap.get(p.user_id) ?? 'Unknown'}
            onDelete={() => setVisiblePosts(prev => prev.filter(id => id !== p.id))}
          />
        ))}
      </div>

      {/* ── CIRCLE REQUESTS ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <SectionLabel label="CIRCLE CREATOR REQUESTS" color="#D4AF37" />
        {circleRequests.length > 0 && (
          <div style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#D4AF37' }}>{circleRequests.length} pending</span>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 28 }}>
        {circleRequests.length === 0 ? (
          <div style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>No pending requests</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {circleRequests.map(r => <CircleRequestCard key={r.id} req={r} />)}
          </div>
        )}
      </div>

      {/* ── BROADCAST ── */}
      <SectionLabel label="BROADCAST TO ALL USERS" color="#D4AF37" />
      <BroadcastPanel />

    </div>
  )
}
