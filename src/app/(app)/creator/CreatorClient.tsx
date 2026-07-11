'use client'
import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { approveCircleRequest, denyCircleRequest } from './actions'

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

const AVATAR_GRADS = [
  'linear-gradient(135deg,#22c55e,#0ea5e9)', 'linear-gradient(135deg,#f472b6,#fb923c)',
  'linear-gradient(135deg,#a78bfa,#38bdf8)', 'linear-gradient(135deg,#D4AF37,#f97316)',
  'linear-gradient(135deg,#f87171,#d946ef)', 'linear-gradient(135deg,#4ade80,#D4AF37)',
]
function avatarGrad(id: string) { return AVATAR_GRADS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADS.length] }
function initials(n: string | null) { return n ? n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?' }
function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n) }

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

      {/* Stats */}
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

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          disabled={pending}
          onClick={() => startPending(async () => { await approveCircleRequest(req.id); setResolved('approved') })}
          style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: pending ? 'rgba(74,222,128,0.1)' : 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', fontSize: 12, fontWeight: 800, color: '#4ade80', cursor: pending ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}
        >
          APPROVE ✓
        </button>
        <button
          disabled={pending}
          onClick={() => startPending(async () => { await denyCircleRequest(req.id); setResolved('denied') })}
          style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.35)', cursor: pending ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}
        >
          DENY ✕
        </button>
      </div>
    </div>
  )
}

export function CreatorClient({ stats, topBuilders, signupChart, categoryBreakdown, journalBreakdown, circleRequests }: {
  stats: Stats
  topBuilders: Builder[]
  signupChart: { date: string; count: number }[]
  categoryBreakdown: [string, number][]
  journalBreakdown: [string, number][]
  circleRequests: CircleReq[]
}) {
  const completionRate = stats.totalGoals > 0 ? Math.round((stats.goalsCompleted / stats.totalGoals) * 100) : 0
  const totalCatGoals = categoryBreakdown.reduce((s, [, n]) => s + n, 0)
  const totalJournalEntries = journalBreakdown.reduce((s, [, n]) => s + n, 0)

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px 100px' }} className="view-panel">

      {/* Header */}
      <div style={{ marginBottom: 32, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#22c55e' }}>CREATOR DASHBOARD</p>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: '#EFEFEF', marginBottom: 4 }}>App Analytics</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Live overview · only you can see this</p>
      </div>

      {/* ── OVERVIEW CARDS ── */}
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>OVERVIEW</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
        <StatCard label="TOTAL BUILDERS" value={stats.totalUsers} sub={`+${stats.newUsers7d} this week`} color="#D4AF37" icon="👥" />
        <StatCard label="GOALS CREATED" value={stats.totalGoals} sub={`+${stats.goalsCreated7d} this week`} color="#22c55e" icon="🎯" />
        <StatCard label="POSTS PUBLISHED" value={stats.totalPosts} sub={`+${stats.posts7d} this week`} color="#a78bfa" icon="📣" />
        <StatCard label="JOURNAL ENTRIES" value={stats.totalJournal} sub={`+${stats.journal7d} this week`} color="#38bdf8" icon="📓" />
      </div>

      {/* ── ENGAGEMENT ROW ── */}
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>ENGAGEMENT</p>
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
            {s.sub && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── SIGNUP CHART ── */}
      <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 18px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)' }}>NEW BUILDERS · LAST 30 DAYS</p>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#D4AF37' }}>{signupChart.reduce((s, d) => s + d.count, 0)} total</span>
        </div>
        <BarChart data={signupChart} color="#D4AF37" />
      </div>

      {/* ── GOAL CATEGORIES ── */}
      <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 18px', marginBottom: 28 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 16 }}>POPULAR GOAL CATEGORIES</p>
        {categoryBreakdown.map(([cat, count]) => (
          <HorizBar key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)} count={count} total={totalCatGoals}
            color={CAT_COLOR[cat] ?? '#D4AF37'} emoji={CAT_EMOJI[cat] ?? '🎯'} />
        ))}
      </div>

      {/* ── JOURNAL BREAKDOWN ── */}
      <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '20px 18px', marginBottom: 28 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 16 }}>JOURNAL TYPE BREAKDOWN</p>
        {journalBreakdown.map(([type, count]) => (
          <HorizBar key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} count={count} total={totalJournalEntries}
            color={JOURNAL_COLOR[type] ?? '#D4AF37'} emoji={JOURNAL_EMOJI[type] ?? '📝'} />
        ))}
      </div>

      {/* ── CIRCLE REQUESTS ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)' }}>CIRCLE CREATOR REQUESTS</p>
          {circleRequests.length > 0 && (
            <div style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#D4AF37' }}>{circleRequests.length} pending</span>
            </div>
          )}
        </div>
        {circleRequests.length === 0 ? (
          <div style={{ padding: '20px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', margin: 0 }}>No pending requests</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {circleRequests.map(r => <CircleRequestCard key={r.id} req={r} />)}
          </div>
        )}
      </div>

      {/* ── TOP BUILDERS ── */}
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>TOP BUILDERS BY XP</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {topBuilders.map((b, i) => (
          <Link key={b.id} href={`/profile/${b.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 16, background: i === 0 ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${i === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: i === 0 ? '#D4AF37' : i === 1 ? '#aaa' : i === 2 ? '#fb923c' : '#444', minWidth: 18, textAlign: 'center' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarGrad(b.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
              {b.avatar_url ? <Image src={b.avatar_url} alt={b.full_name ?? ''} fill style={{ objectFit: 'cover' }} /> : initials(b.full_name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.full_name ?? 'Builder'}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{b.username ? `@${b.username}` : `Level ${b.level}`} · joined {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexShrink: 0, textAlign: 'right' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 900, color: '#D4AF37', lineHeight: 1 }}>{b.xp.toLocaleString()}</p>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>XP</p>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>{b.streak}</p>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>WKS</p>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 900, color: '#4ade80', lineHeight: 1 }}>{b.goals_complete}</p>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>DONE</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}
