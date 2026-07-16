'use client'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getLevelInfo } from '@/lib/xp'


// ── Types ──────────────────────────────────────────────────────────────────
export type Builder = {
  id: string; full_name: string | null; avatar_url: string | null
  xp: number; level: number; goalCategories: string[]; goalCount: number
}
export type PublicGoal = {
  id: string; title: string; category: string | null; progress: number
  created_at: string; user_id: string
  authorName: string | null; authorAvatar: string | null; authorLevel: number
}

// ── Category meta — exact match with GoalsClient ──────────────────────────
const CAT: Record<string, { accent: string; text: string; bg: string; border: string; emoji: string; label: string }> = {
  health:        { accent: '#22c55e', text: '#4ade80', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   emoji: '💪', label: 'Health'        },
  career:        { accent: '#8b5cf6', text: '#a78bfa', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)',  emoji: '🚀', label: 'Career'        },
  business:      { accent: '#3b82f6', text: '#60a5fa', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  emoji: '💼', label: 'Business'      },
  finance:       { accent: '#D4AF37', text: '#D4AF37', bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.22)', emoji: '💰', label: 'Finance'       },
  learning:      { accent: '#38bdf8', text: '#7dd3fc', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.2)',  emoji: '📚', label: 'Learning'      },
  creative:      { accent: '#f97316', text: '#fb923c', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  emoji: '🎨', label: 'Creative'      },
  relationships: { accent: '#f43f5e', text: '#fb7185', bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)',   emoji: '❤️', label: 'Relationships' },
  personal:      { accent: '#14b8a6', text: '#2dd4bf', bg: 'rgba(20,184,166,0.08)',  border: 'rgba(20,184,166,0.2)',  emoji: '🌱', label: 'Personal'      },
  adventure:     { accent: '#84cc16', text: '#a3e635', bg: 'rgba(132,204,22,0.08)',  border: 'rgba(132,204,22,0.2)',  emoji: '🌍', label: 'Adventure'     },
  material:      { accent: '#ef4444', text: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   emoji: '🏠', label: 'Material'      },
  spiritual:     { accent: '#c084fc', text: '#d8b4fe', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)', emoji: '✨', label: 'Spiritual'     },
}
const fallbackCat = { accent: '#D4AF37', text: '#D4AF37', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.22)', emoji: '🎯', label: 'Goal' }
function cat(c: string | null) { return CAT[c ?? ''] ?? fallbackCat }

// ── Avatar helpers ─────────────────────────────────────────────────────────
const GRADS = [
  'linear-gradient(135deg,#22c55e,#0ea5e9)',
  'linear-gradient(135deg,#f472b6,#fb923c)',
  'linear-gradient(135deg,#a78bfa,#38bdf8)',
  'linear-gradient(135deg,#D4AF37,#f97316)',
  'linear-gradient(135deg,#f87171,#d946ef)',
  'linear-gradient(135deg,#4ade80,#D4AF37)',
]
function avatarGrad(id: string) {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return GRADS[h % GRADS.length]
}
function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return '1d ago'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

// ── Main Component ─────────────────────────────────────────────────────────
export function ExploreClient({
  builders, goals, currentUserId, circleCode, embedded,
}: {
  builders: Builder[]
  goals: PublicGoal[]
  currentUserId: string
  circleCode?: string | null
  embedded?: boolean
}) {
  void currentUserId
  const [tab, setTab] = useState<'goals' | 'builders' | 'leaders'>('goals')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const availableCats = useMemo(() => {
    const s = new Set<string>()
    goals.forEach(g => { if (g.category) s.add(g.category) })
    builders.forEach(b => b.goalCategories.forEach(c => s.add(c)))
    return [...s].sort()
  }, [goals, builders])

  const filteredBuilders = useMemo(() => builders.filter(b => {
    if (search && !b.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter && !b.goalCategories.includes(catFilter)) return false
    return true
  }), [builders, search, catFilter])

  const filteredGoals = useMemo(() => goals.filter(g => {
    if (catFilter && g.category !== catFilter) return false
    if (search && !g.title.toLowerCase().includes(search.toLowerCase()) &&
        !g.authorName?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [goals, search, catFilter])

  // "New this week" = goals created in last 7 days
  const weekMs = 7 * 86400 * 1000
  const newGoals = useMemo(() => filteredGoals.filter(g => Date.now() - new Date(g.created_at).getTime() < weekMs), [filteredGoals])
  const olderGoals = useMemo(() => filteredGoals.filter(g => Date.now() - new Date(g.created_at).getTime() >= weekMs), [filteredGoals])

  // Category leaderboard: top 3 builders per category
  const leaderboard = useMemo(() => {
    const map = new Map<string, Builder[]>()
    for (const b of builders) {
      for (const c of b.goalCategories) {
        if (!map.has(c)) map.set(c, [])
        map.get(c)!.push(b)
      }
    }
    const result: { category: string; top: Builder[] }[] = []
    for (const [category, bList] of map.entries()) {
      result.push({ category, top: [...bList].sort((a, b) => b.xp - a.xp).slice(0, 3) })
    }
    return result.sort((a, b) => a.category.localeCompare(b.category))
  }, [builders])

  const isEmpty = tab === 'builders' ? filteredBuilders.length === 0 : filteredGoals.length === 0

  // Top 5 builders for featured strip
  const featuredBuilders = useMemo(() => [...builders].sort((a, b) => b.xp - a.xp).slice(0, 5), [builders])

  return (
    <div style={embedded ? { paddingBottom: 40 } : { maxWidth: 560, margin: '0 auto', padding: '32px 16px 100px' }} className={embedded ? undefined : 'view-panel'}>

      {/* Header */}
      {!embedded && <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>EXPLORE</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 4 }}>What people<br />are building.</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 500 }}>
          {goals.length} public goal{goals.length !== 1 ? 's' : ''} · {builders.length} builder{builders.length !== 1 ? 's' : ''} · {availableCats.length} categor{availableCats.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>}

      {/* Featured Builders strip */}
      {featuredBuilders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>TOP BUILDERS</p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
            {featuredBuilders.map((b, idx) => {
              const li = getLevelInfo(b.xp)
              const rank = idx + 1
              const rankColor = rank === 1 ? '#D4AF37' : rank === 2 ? '#a8a8a8' : rank === 3 ? '#cd7f32' : 'rgba(255,255,255,0.35)'
              return (
                <Link key={b.id} href={`/profile/${b.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div style={{
                    width: 90, borderRadius: 16, padding: '14px 10px 12px', textAlign: 'center',
                    background: rank <= 3 ? `${rankColor}08` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${rank <= 3 ? rankColor + '25' : 'rgba(255,255,255,0.06)'}`,
                    position: 'relative',
                  }}>
                    {rank <= 3 && (
                      <div style={{ position: 'absolute', top: -6, right: -4, fontSize: 14, lineHeight: 1, filter: `drop-shadow(0 0 4px ${rankColor}aa)` }}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                      </div>
                    )}
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', margin: '0 auto 8px',
                      background: avatarGrad(b.id),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 800, color: '#fff',
                      boxShadow: `0 0 0 2px #0d0d0d, 0 0 0 3.5px ${li.color}55`,
                      overflow: 'hidden', position: 'relative',
                    }}>
                      {b.avatar_url
                        ? <Image src={b.avatar_url} alt={b.full_name ?? ''} fill style={{ objectFit: 'cover' }} />
                        : <span>{initials(b.full_name)}</span>}
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{b.full_name?.split(' ')[0] ?? 'Builder'}</p>
                    <p style={{ fontSize: 9, fontWeight: 700, color: li.color, letterSpacing: '0.04em' }}>{li.title}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{b.xp.toLocaleString()} XP</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'leaders' ? 'Filter by category…' : tab === 'builders' ? 'Search builders…' : 'Search goals…'}
          style={{
            width: '100%', padding: '12px 16px 12px 40px', borderRadius: 14,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#EFEFEF', fontSize: 14, fontFamily: 'Satoshi,sans-serif', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
          }}>×</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
        {([
          { k: 'goals' as const,    l: goals.length > 0    ? `Goals (${goals.length})`       : 'Goals'    },
          { k: 'builders' as const, l: builders.length > 0 ? `Builders (${builders.length})` : 'Builders' },
          { k: 'leaders' as const,  l: 'Leaders' },
        ]).map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 12,
            background: tab === k ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: tab === k ? '#EFEFEF' : 'rgba(255,255,255,0.35)',
            transition: 'all 0.2s',
            boxShadow: tab === k ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
          }}>
            {l}
          </button>
        ))}
      </div>

      {/* Category filter pills — Goals and Builders tabs only */}
      {tab !== 'leaders' && availableCats.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4, scrollbarWidth: 'none' }}>
          <button onClick={() => setCatFilter(null)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: '1px solid',
            borderColor: catFilter === null ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)',
            background: catFilter === null ? 'rgba(212,175,55,0.12)' : 'transparent',
            color: catFilter === null ? '#D4AF37' : 'rgba(255,255,255,0.42)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif',
            transition: 'all 0.2s',
          }}>All</button>
          {availableCats.map(c => {
            const m = cat(c); const active = catFilter === c
            return (
              <button key={c} onClick={() => setCatFilter(active ? null : c)} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 20, border: '1px solid',
                borderColor: active ? m.border : 'rgba(255,255,255,0.08)',
                background: active ? m.bg : 'transparent',
                color: active ? m.text : 'rgba(255,255,255,0.42)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif',
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: 14 }}>{m.emoji}</span> {m.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── BUILDERS TAB ─────────────────────────────────────────────────── */}
      {tab === 'builders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredBuilders.map(b => <BuilderCard key={b.id} builder={b} circleCode={circleCode} />)}
          {isEmpty && <EmptyState tab="builders" hasFilter={!!catFilter || !!search} />}
        </div>
      )}

      {/* ── GOALS TAB ────────────────────────────────────────────────────── */}
      {tab === 'goals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* New this week section */}
          {newGoals.length > 0 && !search && !catFilter && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#4ade80' }}>NEW THIS WEEK</p>
                <div style={{ flex: 1, height: 1, background: 'rgba(74,222,128,0.12)' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 700 }}>{newGoals.length}</span>
              </div>
              {newGoals.map(g => <GoalCard key={g.id} goal={g}  />)}
              {olderGoals.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 2 }}>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)' }}>ALL GOALS</p>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 700 }}>{olderGoals.length}</span>
                </div>
              )}
              {olderGoals.map(g => <GoalCard key={g.id} goal={g}  />)}
            </>
          )}
          {/* Flat list when searching/filtering */}
          {(search || catFilter || newGoals.length === 0) && filteredGoals.map(g => <GoalCard key={g.id} goal={g}  />)}
          {isEmpty && <EmptyState tab="goals" hasFilter={!!catFilter || !!search} />}
        </div>
      )}

      {/* ── LEADERS TAB ──────────────────────────────────────────────────── */}
      {tab === 'leaders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {leaderboard
            .filter(entry => !search || entry.category.includes(search.toLowerCase()))
            .map(({ category, top }) => {
              const m = cat(category)
              return (
                <div key={category}>
                  {/* Category header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: m.bg, border: `1px solid ${m.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{m.emoji}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em' }}>{m.label}</p>
                      <p style={{ fontSize: 9, color: m.text, fontWeight: 700, letterSpacing: '0.08em' }}>TOP BUILDERS</p>
                    </div>
                  </div>
                  {/* Top 3 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {top.map((b, idx) => {
                      const li = getLevelInfo(b.xp)
                      const rankColor = idx === 0 ? '#D4AF37' : idx === 1 ? '#a8a8a8' : '#cd7f32'
                      return (
                        <Link key={b.id} href={`/profile/${b.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px', borderRadius: 14,
                            background: idx === 0 ? `${rankColor}08` : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${idx === 0 ? rankColor + '25' : 'rgba(255,255,255,0.05)'}`,
                          }}>
                            <span style={{ fontSize: 16, lineHeight: 1, width: 20, textAlign: 'center', flexShrink: 0 }}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                            </span>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                              background: avatarGrad(b.id),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 800, color: '#fff',
                              overflow: 'hidden', position: 'relative',
                              boxShadow: `0 0 0 2px #0d0d0d, 0 0 0 3px ${li.color}55`,
                            }}>
                              {b.avatar_url
                                ? <Image src={b.avatar_url} alt={b.full_name ?? ''} fill style={{ objectFit: 'cover' }} />
                                : <span>{initials(b.full_name)}</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 800, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.full_name ?? 'Builder'}</p>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{b.xp.toLocaleString()} XP · {b.goalCount} goal{b.goalCount !== 1 ? 's' : ''}</p>
                            </div>
                            <div style={{ flexShrink: 0, padding: '3px 9px', borderRadius: 999, background: `${li.color}15`, border: `1px solid ${li.color}30` }}>
                              <p style={{ fontSize: 9, fontWeight: 800, color: li.color, letterSpacing: '0.06em' }}>{li.title.toUpperCase()}</p>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          {leaderboard.length === 0 && <EmptyState tab="leaders" hasFilter={!!search} />}
        </div>
      )}
    </div>
  )
}

// ── Builder Card ───────────────────────────────────────────────────────────
function BuilderCard({ builder: b, circleCode }: { builder: Builder; circleCode?: string | null }) {
  const levelInfo = getLevelInfo(b.xp)
  const [invited, setInvited] = useState(false)

  function handleInvite(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://confirmedcreations.com'}/join/${circleCode}`
    const text = `Hey ${b.full_name?.split(' ')[0] ?? 'there'}, join my Circle on Confirmed Creations! ${link}`
    if (navigator.share) { navigator.share({ text }) } else { navigator.clipboard.writeText(text) }
    setInvited(true); setTimeout(() => setInvited(false), 2500)
  }

  return (
    <Link href={`/profile/${b.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18, padding: '16px',
        transition: 'border-color 0.2s, background 0.2s',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

          {/* Avatar with level ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: avatarGrad(b.id),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: '#fff',
              boxShadow: `0 0 0 2px #111, 0 0 0 4px ${levelInfo.color}55`,
              overflow: 'hidden',
              position: 'relative',
            }}>
              {b.avatar_url ? (
                <Image src={b.avatar_url} alt={b.full_name ?? ''} fill style={{ objectFit: 'cover' }} />
              ) : (
                <span>{initials(b.full_name)}</span>
              )}
            </div>
            {/* Level badge */}
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              background: levelInfo.color, color: '#000',
              borderRadius: '50%', width: 18, height: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 900,
              boxShadow: '0 0 0 2px #111',
            }}>{b.level}</div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.full_name ?? 'Builder'}
              </p>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', padding: '2px 7px',
                borderRadius: 20, background: `${levelInfo.color}20`, color: levelInfo.color,
                flexShrink: 0,
              }}>{levelInfo.title.toUpperCase()}</span>
            </div>

            {/* Goal category chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {b.goalCategories.slice(0, 3).map(c => {
                const m = cat(c)
                return (
                  <span key={c} style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: m.bg, color: m.text, border: `1px solid ${m.border}`,
                  }}>{m.emoji} {m.label}</span>
                )
              })}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>⚡ {b.xp.toLocaleString()} XP</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>·</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>{b.goalCount} goal{b.goalCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Invite button */}
          {circleCode && (
            <div style={{ flexShrink: 0 }}>
              <button
                onClick={handleInvite}
                style={{
                  padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(56,189,248,0.35)',
                  background: invited ? 'rgba(56,189,248,0.15)' : 'rgba(56,189,248,0.07)',
                  color: '#38bdf8',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif',
                  transition: 'all 0.2s',
                }}
              >
                {invited ? 'Sent ✓' : 'Invite'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Goal Card ──────────────────────────────────────────────────────────────
function GoalCard({ goal: g }: { goal: PublicGoal }) {
  const m = cat(g.category)
  const authorLevel = getLevelInfo(g.authorLevel === 1 ? 0 : g.authorLevel === 2 ? 150 : g.authorLevel === 3 ? 350 : g.authorLevel === 4 ? 700 : g.authorLevel === 5 ? 1200 : g.authorLevel === 6 ? 2000 : 3500)
  const dotsFilled = Math.round(g.progress / 10)

  return (
    <div style={{
      borderRadius: 18, overflow: 'hidden', position: 'relative', cursor: 'default',
      borderLeft: `3px solid ${m.accent}`,
      background: `linear-gradient(120deg, ${m.bg} 0%, #0d0d0d 50%)`,
      border: `1px solid ${m.border}`,
      borderLeftWidth: 3,
    }}>
      {/* Blurred glow orb — same as Goals page */}
      <div style={{ position: 'absolute', top: -30, left: -20, width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(40px)', opacity: 0.45, background: m.accent }} />

      <div style={{ padding: '16px 18px', position: 'relative', zIndex: 1 }}>
        {/* Category badge + time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6,
            background: m.bg, color: m.text, border: `1px solid ${m.border}`,
            letterSpacing: '0.05em',
          }}>{m.emoji} {m.label.toUpperCase()}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{timeAgo(g.created_at)}</span>
        </div>

        {/* Goal title */}
        <p style={{
          fontSize: 15, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.35, letterSpacing: '-0.01em',
          marginBottom: 14,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{g.title}</p>

        {/* Dot progress — same style as Goals page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 14 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0, transition: 'background 0.3s',
              background: i < dotsFilled ? m.accent : 'rgba(255,255,255,0.07)',
              boxShadow: i < dotsFilled ? `0 0 5px ${m.accent}` : 'none',
            }} />
          ))}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 300, marginLeft: 4 }}>{g.progress}%</span>
        </div>

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <Link href={`/profile/${g.user_id}`} onClick={e => e.stopPropagation()} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: avatarGrad(g.user_id),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#fff', overflow: 'hidden', position: 'relative',
              flexShrink: 0,
              boxShadow: `0 0 0 1.5px #0d0d0d, 0 0 0 2.5px ${authorLevel.color}66`,
            }}>
              {g.authorAvatar
                ? <Image src={g.authorAvatar} alt={g.authorName ?? ''} fill style={{ objectFit: 'cover' }} />
                : <span>{initials(g.authorName)}</span>}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.58)' }}>{g.authorName ?? 'Builder'}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────
function EmptyState({ tab, hasFilter }: { tab: string; hasFilter: boolean }) {
  const icon = hasFilter ? '🔍' : tab === 'builders' ? '👥' : tab === 'leaders' ? '🏆' : '🎯'
  const title = hasFilter ? 'No results' : tab === 'builders' ? 'No builders yet' : tab === 'leaders' ? 'No leaders yet' : 'No public goals yet'
  const desc = hasFilter
    ? 'Try a different filter or clear your search.'
    : tab === 'builders'
      ? 'Builders appear here when they share public goals. Invite your circle!'
      : tab === 'leaders'
        ? 'Leaders appear once members start sharing public goals.'
        : 'Goals appear here when members set their visibility to Public.'
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <p style={{ fontSize: 36, marginBottom: 12 }}>{icon}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#EFEFEF', marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}
