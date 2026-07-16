'use client'
import { useState, useTransition, useRef, useEffect, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { createCircle, joinCircle, createPost, toggleReaction, followUser, unfollowUser, addComment, deleteComment, createSession, rsvpSession, deleteSession } from './actions'
import { requestCircleAccess } from './module/actions'
import { createHomePost } from '@/app/(app)/home/actions'
import { sendMessage } from '@/app/(app)/inbox/actions'
import { postCommitment, witnessCommitment, updateCommitmentStatus } from './commitment-actions'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { toggleGoalReaction, addGoalComment, removeGoalComment } from '@/app/(app)/goals/actions'
import type { LeaderboardEntry, MemberStatus, CircleCommitment } from './page'
import { ExploreClient } from '@/app/(app)/explore/ExploreClient'
import type { Builder, PublicGoal } from '@/app/(app)/explore/ExploreClient'

// ── Types ──
type PostComment = { id: string; user_id: string; author_name: string | null; author_avatar: string | null; content: string; created_at: string }
type Session = { id: string; circle_id: string; created_by: string; title: string; description: string | null; scheduled_at: string; meeting_url: string | null; status: string }
type SessionRsvp = { session_id: string; user_id: string; status: string }
type RsvpProfile = { id: string; full_name: string | null }
type PostWithMeta = {
  id: string; content: string; type: string; created_at: string
  user_id: string; circle_id: string | null; author_name: string | null; author_avatar: string | null
  media_url: string | null; media_type: string | null
  reactions: { fire: number; strong: number; relate: number }
  my_reactions: { fire: boolean; strong: boolean; relate: boolean }
  comments: PostComment[]
}
type CircleInfo = { id: string; name: string; code: string }
type CalGoal = { id: string; title: string; category: string | null; deadline: string }
type DiscoverProfile = { id: string; full_name: string | null; username: string | null; streak: number; tagline: string | null; goals_complete: number; avatar_url?: string | null }
type MemberAssessment = { user_id: string; week_start: string; week_title: string | null; rating: number | null; full_name: string | null }
type CircleGoalComment = { id: string; user_id: string; author_name: string | null; content: string; created_at: string }
type CircleGoal = {
  id: string; title: string; category: string | null; progress: number
  deadline: string | null; user_id: string; author_name: string | null
  reactions: { fire: number; believe: number; cheer: number }
  my_reactions: { fire: boolean; believe: boolean; cheer: boolean }
  comments: CircleGoalComment[]
}

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

const ENERGY_MAP: Record<number, string> = { 2: '😴 Low', 4: '😐 Okay', 6: '🙂 Good', 8: '😤 Great', 10: '⚡ Peak' }
function getEnergyLabel(e: number | null): string | null {
  if (!e) return null
  const keys = [2, 4, 6, 8, 10]
  const closest = keys.reduce((a, b) => Math.abs(b - e) < Math.abs(a - e) ? b : a)
  return ENERGY_MAP[closest] ?? null
}

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

type NewBuilder = {
  id: string; full_name: string | null; username: string | null; avatar_url: string | null
  xp: number; level: number; created_at: string; streak: number; goals_complete: number
}

const GRADS = [
  'linear-gradient(135deg,#22c55e,#0ea5e9)',
  'linear-gradient(135deg,#f472b6,#fb923c)',
  'linear-gradient(135deg,#a78bfa,#38bdf8)',
  'linear-gradient(135deg,#D4AF37,#f97316)',
  'linear-gradient(135deg,#f87171,#d946ef)',
  'linear-gradient(135deg,#4ade80,#D4AF37)',
]
function builderGrad(id: string) {
  return GRADS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % GRADS.length]
}

function NewBuilderCard({ builder, isFollowing: init, circleCode }: { builder: NewBuilder; isFollowing: boolean; circleCode: string | null }) {
  const [following, setFollowing] = useState(init)
  const [pending, setPending] = useState(false)
  const [invited, setInvited] = useState(false)
  const grad = builderGrad(builder.id)
  const nameInit = builder.full_name ? builder.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'
  const days = Math.floor((Date.now() - new Date(builder.created_at).getTime()) / 86400000)
  const joinLabel = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days}d ago` : days < 30 ? `${Math.floor(days / 7)}w ago` : days < 365 ? `${Math.floor(days / 30)}mo ago` : `${Math.floor(days / 365)}yr ago`
  const isNew = days <= 7
  const ringColor = builder.streak >= 13 ? '#D4AF37' : builder.streak >= 4 ? '#f97316' : 'rgba(255,255,255,0.18)'
  const ringGlow = builder.streak >= 13 ? '0 0 14px rgba(212,175,55,0.6)' : builder.streak >= 4 ? '0 0 14px rgba(249,115,22,0.5)' : 'none'

  async function handleFollow() {
    setPending(true)
    if (following) await unfollowUser(builder.id)
    else await followUser(builder.id)
    setFollowing(f => !f)
    setPending(false)
  }

  function handleInvite() {
    if (!circleCode) return
    const link = `https://confirmedcreations.com/join/${circleCode}`
    const text = `Hey ${builder.full_name?.split(' ')[0] ?? 'there'}, join my Circle on Confirmed Creations! ${link}`
    if (navigator.share) navigator.share({ text })
    else navigator.clipboard.writeText(text)
    setInvited(true); setTimeout(() => setInvited(false), 2500)
  }

  return (
    <div style={{ borderRadius: 22, border: '1px solid rgba(255,255,255,0.08)', background: '#0d0d0d', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      {/* Banner */}
      <div style={{ height: 100, background: grad, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg,rgba(0,0,0,0.07) 0px,rgba(0,0,0,0.07) 1px,transparent 1px,transparent 12px)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(to top,rgba(13,13,13,0.7),transparent)' }} />
        {/* Join badge */}
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {isNew && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />}
          <span style={{ fontSize: 9, color: isNew ? '#4ade80' : '#999', fontWeight: 800, letterSpacing: '0.07em', fontFamily: 'Satoshi,sans-serif' }}>{isNew ? 'NEW  ·  ' : ''}{joinLabel.toUpperCase()}</span>
        </div>
      </div>

      <div style={{ padding: '0 18px 20px' }}>
        {/* Avatar + level row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -32, marginBottom: 14 }}>
          <div style={{ width: 66, height: 66, borderRadius: '50%', border: `3px solid ${ringColor}`, boxShadow: ringGlow, background: grad, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            {builder.avatar_url
              ? <img src={builder.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff' }}>{nameInit}</span>
            }
          </div>
          <div style={{ marginBottom: 4, padding: '5px 13px', borderRadius: 999, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', letterSpacing: '0.05em' }}>LEVEL {builder.level}</span>
          </div>
        </div>

        {/* Name */}
        <Link href={`/profile/${builder.id}`} style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: 19, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 2 }}>{builder.full_name ?? 'Builder'}</p>
          {builder.username && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>@{builder.username}</p>}
        </Link>

        {/* Stats chips */}
        {(builder.streak > 0 || builder.goals_complete > 0 || builder.xp > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
            {builder.streak > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 10, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.22)' }}>
                <span style={{ fontSize: 12 }}>🔥</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37' }}>{builder.streak} wk streak</span>
              </div>
            )}
            {builder.goals_complete > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 10, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                <span style={{ fontSize: 11 }}>✅</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>{builder.goals_complete} done</span>
              </div>
            )}
            {builder.xp > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 10, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>{builder.xp} XP</span>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleFollow}
            disabled={pending}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 14,
              border: following ? '1px solid rgba(255,255,255,0.1)' : 'none',
              background: following ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#D4AF37,#9A7010)',
              color: following ? 'rgba(255,255,255,0.42)' : '#000',
              fontSize: 13, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.04em',
              opacity: pending ? 0.5 : 1, transition: 'all 0.2s',
              boxShadow: following ? 'none' : '0 4px 16px rgba(212,175,55,0.3)',
            }}
          >
            {following ? 'Following ✓' : '+ Follow'}
          </button>
          {circleCode && (
            <button
              onClick={handleInvite}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 14,
                border: `1px solid ${invited ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
                background: invited ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
                color: invited ? '#4ade80' : '#ccc',
                fontSize: 13, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.04em', transition: 'all 0.2s',
              }}
            >
              {invited ? 'Invited ✓' : 'Invite to ○'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function BuilderSpotlight({ builders, followingIds, circleCode }: { builders: NewBuilder[]; followingIds: string[]; circleCode: string | null }) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const filtered = q
    ? builders.filter(b => b.full_name?.toLowerCase().includes(q) || b.username?.toLowerCase().includes(q))
    : builders

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Search bar */}
      <div style={{ position: 'relative', padding: '0 20px', marginBottom: 20 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2.5" strokeLinecap="round" style={{ position: 'absolute', left: 34, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search builders by name or @handle…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 40px 13px 42px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#EFEFEF', fontSize: 14, fontFamily: 'Satoshi,sans-serif', outline: 'none' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
        )}
      </div>

      {/* Header */}
      <div style={{ padding: '0 20px', marginBottom: 18 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 3 }}>
          {q ? `${filtered.length} BUILDER${filtered.length !== 1 ? 'S' : ''} FOUND` : `${builders.length} BUILDERS`}
        </p>
        {!q && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', fontWeight: 300 }}>Everyone building on Confirmed Creations</p>}
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', textAlign: 'center', paddingTop: 40 }}>No builders match &ldquo;{search}&rdquo;</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 20px' }}>
          {filtered.map(b => (
            <NewBuilderCard key={b.id} builder={b} isFollowing={followingIds.includes(b.id)} circleCode={circleCode} />
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Circle unlock / progress card
// ══════════════════════════════════════════════════════
function CircleUnlockCard({ eligibility, requested }: { eligibility: CircleEligibility; requested: boolean }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(requested)

  const allMet = eligibility.goalsComplete && eligibility.journalEntries && eligibility.streakReached && eligibility.moduleComplete
  const metCount = [eligibility.goalsComplete, eligibility.journalEntries, eligibility.streakReached, eligibility.moduleComplete].filter(Boolean).length

  async function handleRequest() {
    setSending(true)
    await requestCircleAccess()
    setSent(true)
    setSending(false)
  }

  const REQ = [
    {
      done: eligibility.goalsComplete,
      label: 'Complete 1 goal',
      sub: eligibility.goalsComplete ? 'Done' : `${eligibility.goalsCompleteCount} of 1`,
      link: null,
    },
    {
      done: eligibility.journalEntries,
      label: '10 journal entries',
      sub: eligibility.journalEntries ? 'Done' : `${eligibility.journalCount} of 10`,
      link: null,
    },
    {
      done: eligibility.streakReached,
      label: '7-day streak',
      sub: eligibility.streakReached ? 'Done' : `${eligibility.streakCount}-day streak`,
      link: null,
    },
    {
      done: eligibility.moduleComplete,
      label: 'Complete the Circle Module',
      sub: eligibility.moduleComplete ? 'Done' : 'Start the module →',
      link: eligibility.moduleComplete ? null : '/circle/module',
    },
  ]

  return (
    <div style={{ borderRadius: 20, border: '1px solid rgba(212,175,55,0.2)', background: 'linear-gradient(135deg,rgba(212,175,55,0.06),rgba(212,175,55,0.02))', padding: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⭕</div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#EFEFEF', marginBottom: 2 }}>Earn Your Circle</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 400 }}>Prove you&apos;re ready to lead — {metCount} of 4 done</p>
        </div>
        <div style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 99, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#D4AF37', letterSpacing: '0.06em' }}>{metCount}/4</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)', marginBottom: 18, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(metCount / 4) * 100}%`, background: 'linear-gradient(90deg,#D4AF37,#f97316)', borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>

      {/* Requirements list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {REQ.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: r.done ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${r.done ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {r.done
                ? <span style={{ fontSize: 12, color: '#4ade80' }}>✓</span>
                : <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>○</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: r.done ? '#EFEFEF' : 'rgba(255,255,255,0.42)', margin: 0 }}>{r.label}</p>
            </div>
            {r.link ? (
              <Link href={r.link} style={{ fontSize: 11, color: '#D4AF37', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>{r.sub}</Link>
            ) : (
              <span style={{ fontSize: 11, color: r.done ? '#4ade80' : 'rgba(255,255,255,0.28)', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.sub}</span>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      {sent ? (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', margin: 0 }}>✓ Request sent — we&apos;ll review and get back to you</p>
        </div>
      ) : allMet ? (
        <button
          onClick={handleRequest}
          disabled={sending}
          style={{ width: '100%', padding: '13px 0', borderRadius: 13, background: sending ? 'rgba(212,175,55,0.2)' : 'linear-gradient(135deg,#D4AF37,#f97316)', border: 'none', fontSize: 13, fontWeight: 800, color: sending ? 'rgba(255,255,255,0.55)' : '#0A0A0A', cursor: sending ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', fontFamily: 'Satoshi,sans-serif' }}
        >
          {sending ? 'SENDING...' : 'REQUEST CIRCLE ACCESS →'}
        </button>
      ) : (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', textAlign: 'center', margin: 0 }}>Finish the remaining requirements to unlock Circle access.</p>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════
type CircleEligibility = {
  goalsComplete: boolean; journalEntries: boolean; streakReached: boolean; moduleComplete: boolean
  goalsCompleteCount: number; journalCount: number; streakCount: number
}

type BirthdayProfile = { id: string; full_name: string | null; date_of_birth: string | null }

export function CircleClient({
  posts, circles, userId, discoverProfiles, followingIds, followingPosts, memberAssessments, leaderboard, memberStatuses, userName, userStreak, userAvatar, userUsername, sessions, rsvps, rsvpProfiles, exploreBuilders, exploreGoals, circleGoals, newBuilders,
  circleEligibility, circleRequested, circleApproved, birthdayProfiles,
  weekCommitments, myWitnessedIds,
}: {
  posts: PostWithMeta[]; circles: CircleInfo[]; userId: string
  discoverProfiles: DiscoverProfile[]
  followingIds: string[]
  followingPosts: PostWithMeta[]
  memberAssessments: MemberAssessment[]
  leaderboard: LeaderboardEntry[]
  memberStatuses: MemberStatus[]
  userName: string | null; userStreak: number; userAvatar: string | null; userUsername: string | null
  sessions: Session[]; rsvps: SessionRsvp[]; rsvpProfiles: RsvpProfile[]
  exploreBuilders: Builder[]
  exploreGoals: PublicGoal[]
  circleGoals: CircleGoal[]
  newBuilders: NewBuilder[]
  circleEligibility: CircleEligibility
  circleRequested: boolean
  circleApproved: boolean
  birthdayProfiles: BirthdayProfile[]
  weekCommitments: CircleCommitment[]
  myWitnessedIds: string[]
}) {
  const [mainTab, setMainTab] = useState<'board' | 'feed' | 'sessions'>('board')
  const [feedFilter, setFeedFilter] = useState<'circle' | 'following'>('circle')
  const [showPost, setShowPost] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState('all')
  const [successCode, setSuccessCode] = useState('')
  const [postType, setPostType] = useState<keyof typeof TYPE_META>('win')
  const [postContent, setPostContent] = useState('')
  const [postFile, setPostFile] = useState<File | null>(null)
  const [postPreview, setPostPreview] = useState<string | null>(null)
  const [postIsVideo, setPostIsVideo] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteSent, setInviteSent] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    // Load persisted invites for this circle
    const key = `manifest_invites_${circles[0]?.code ?? ''}`
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
      if (stored.length) setInviteSent(new Set(stored))
    } catch {}
  }, [])
  const [expandedPost, setExpandedPost] = useState<PostWithMeta | null>(null)
  const [commitmentText, setCommitmentText] = useState('')
  const [submittingCommit, setSubmittingCommit] = useState(false)
  const [localCommitments, setLocalCommitments] = useState<CircleCommitment[]>(weekCommitments)
  const [localWitnessed, setLocalWitnessed] = useState<Set<string>>(new Set(myWitnessedIds))
  const router = useRouter()
  const postFileRef = useRef<HTMLInputElement>(null)

  const primaryCircle = circles[0]
  const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.type === filter)
  const selectedMeta = TYPE_META[postType]
  const memberIdSet = new Set(memberStatuses.map(s => s.user_id))
  const nonMemberProfiles = discoverProfiles.filter(p => !memberIdSet.has(p.id))
  const myCommitment = localCommitments.find(c => c.user_id === userId) ?? null
  const othersCommitments = localCommitments.filter(c => c.user_id !== userId)

  function handlePostFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setPostFile(f); setPostIsVideo(f.type.startsWith('video/'))
    setPostPreview(URL.createObjectURL(f))
  }

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
    if (!postContent.trim() && !postFile) return
    startTransition(async () => {
      let mediaUrl: string | undefined; let mediaType: 'image' | 'video' | undefined
      if (postFile) {
        const supabase = createBrowserClient()
        const ext = postFile.name.split('.').pop() ?? 'jpg'
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('post-media').upload(`${userId}/${Date.now()}.${ext}`, postFile, { upsert: true })
        if (uploadErr || !uploadData) { setError('Photo upload failed'); return }
        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(uploadData.path)
        mediaUrl = publicUrl; mediaType = postFile.type.startsWith('video/') ? 'video' : 'image'
      }
      const result = await createHomePost({ content: postContent, type: postType, visibility: 'circle', mediaUrl, mediaType })
      if (result.error) { setError(result.error); return }
      setShowPost(false); setPostContent(''); setPostType('win'); setPostFile(null); setPostPreview(null)
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
    { k: 'board' as const,    l: '⚔️ Board' },
    { k: 'feed' as const,     l: '💬 Feed' },
    { k: 'sessions' as const, l: '📅 Sessions' },
  ]

  const inviteLink = primaryCircle ? `https://confirmedcreations.com/join/${primaryCircle.code}` : ''

  function handleCopy() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
  }

  async function handleShare() {
    if (!primaryCircle) return
    if (navigator.share) {
      await navigator.share({
        title: `Join my Circle on Confirmed Creations`,
        text: `${userName ?? 'Someone'} invited you to join their accountability circle. Use code ${primaryCircle.code} or tap the link.`,
        url: inviteLink,
      })
    } else {
      handleCopy()
    }
  }

  async function handlePostCommitment() {
    if (!primaryCircle || !commitmentText.trim()) return
    setSubmittingCommit(true)
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const optimistic: CircleCommitment = {
      id: `temp-${Date.now()}`,
      circle_id: primaryCircle.id,
      user_id: userId,
      week_start: weekStart.toISOString().split('T')[0],
      text: commitmentText.trim(),
      status: 'active',
      witness_count: 0,
      full_name: userName,
      avatar_url: userAvatar,
      username: userUsername,
      created_at: new Date().toISOString(),
    }
    const saved = commitmentText.trim()
    setLocalCommitments(prev => [...prev, optimistic])
    setCommitmentText('')
    const result = await postCommitment(primaryCircle.id, saved)
    if (result?.error) {
      setLocalCommitments(prev => prev.filter(c => c.id !== optimistic.id))
      setCommitmentText(saved)
    }
    setSubmittingCommit(false)
  }

  async function handleWitness(commitmentId: string, toUserId: string) {
    setLocalWitnessed(prev => new Set([...prev, commitmentId]))
    setLocalCommitments(prev => prev.map(c => c.id === commitmentId ? { ...c, witness_count: c.witness_count + 1 } : c))
    await witnessCommitment(commitmentId, toUserId)
  }

  async function handleCommitStatus(commitmentId: string, status: 'done' | 'failed') {
    setLocalCommitments(prev => prev.map(c => c.id === commitmentId ? { ...c, status } : c))
    await updateCommitmentStatus(commitmentId, status)
  }

  async function handleInviteUser(toId: string, toName: string | null) {
    if (!primaryCircle) return
    const firstName = toName?.split(' ')[0]
    const msg = `👋 Hey${firstName ? ` ${firstName}` : ''}! ${userName ?? 'Someone'} wants you to join their accountability circle "${primaryCircle.name}". Use code **${primaryCircle.code}** or join here: ${inviteLink}`
    await sendMessage(toId, msg)
    setInviteSent(prev => {
      const next = new Set([...prev, toId])
      try {
        const key = `manifest_invites_${primaryCircle.code}`
        localStorage.setItem(key, JSON.stringify([...next]))
      } catch {}
      return next
    })
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 20px' }} className="view-panel">


      {/* ── Invite modal (portal) ── */}
      {mounted && showInvite && primaryCircle && createPortal(
        <>
          {/* Backdrop — tap anywhere outside card to close */}
          <div
            className="modal-open"
            onClick={() => { setShowInvite(false); setInviteSearch('') }}
            style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)' }}
          />
          {/* Card — above backdrop, pointer-events re-enabled on card only */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto', width: '100%', maxWidth: 520, background: '#0E0E0E', borderRadius: 24, border: '1px solid rgba(212,175,55,0.2)', maxHeight: '85dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'scaleIn 0.2s ease both' }}>

              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg,#18120A,#0F0C03)', borderBottom: '1px solid rgba(212,175,55,0.15)', padding: '20px 24px 20px', position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2, margin: '0 auto 16px' }} />
                <button onClick={() => { setShowInvite(false); setInviteSearch('') }} style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#EFEFEF', fontSize: 20, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Satoshi,sans-serif' }}>×</button>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 4 }}>INVITE TO {primaryCircle.name.toUpperCase()}</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {userName ? `${userName.split(' ')[0]} is building.` : 'Join the Circle.'}
                </p>
                {userStreak > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 10px', borderRadius: 999, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <span style={{ fontSize: 12 }}>🔥</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#D4AF37' }}>{userStreak}-week streak</span>
                  </div>
                )}
              </div>

              {/* Scrollable body */}
              <div style={{ padding: '20px 24px 24px', overflowY: 'auto', flex: 1 }}>
                {/* QR code */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <div style={{ background: '#fff', borderRadius: 16, padding: 12, display: 'inline-block' }}>
                    <QRCodeSVG value={inviteLink} size={120} fgColor="#080808" bgColor="#ffffff" />
                  </div>
                </div>

                {/* Code display */}
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.42)', marginBottom: 4 }}>INVITE CODE</p>
                  <p style={{ fontSize: 32, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.35em' }}>{primaryCircle.code}</p>
                </div>

                {/* Link + copy */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{inviteLink}</p>
                  <button onClick={handleCopy} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: copied ? '#4ade80' : 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.2s' }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>

                {/* Share button */}
                <button onClick={handleShare} style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg,#D4AF37,#9A7010)', border: 'none', color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.02em', marginBottom: 20 }}>
                  Share Invite ↗
                </button>

                {/* In-app invite */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 12 }}>OR SEND DIRECTLY IN THE APP</p>
                  <input
                    value={inviteSearch}
                    onChange={e => setInviteSearch(e.target.value)}
                    placeholder="Search by name or username…"
                    className="cc-input"
                    style={{ marginBottom: 10, fontSize: 13 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {nonMemberProfiles
                      .filter(p => {
                        if (!inviteSearch.trim()) return true
                        const q = inviteSearch.toLowerCase()
                        return (p.full_name ?? '').toLowerCase().includes(q) || (p.username ?? '').toLowerCase().includes(q)
                      })
                      .slice(0, 20)
                      .map(p => {
                        const sent = inviteSent.has(p.id)
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarGrad(p.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                              {p.avatar_url
                                ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                : initials(p.full_name)
                              }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name ?? 'Anonymous'}</p>
                              {p.username && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>@{p.username}</p>}
                            </div>
                            <button
                              onClick={() => { if (!sent) handleInviteUser(p.id, p.full_name) }}
                              disabled={sent}
                              style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 10, border: sent ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(212,175,55,0.3)', background: sent ? 'rgba(74,222,128,0.1)' : 'rgba(212,175,55,0.1)', color: sent ? '#4ade80' : '#D4AF37', fontSize: 11, fontWeight: 800, cursor: sent ? 'default' : 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.2s' }}
                            >
                              {sent ? '✓ Sent' : 'Invite'}
                            </button>
                          </div>
                        )
                      })
                    }
                    {nonMemberProfiles.filter(p => {
                      if (!inviteSearch.trim()) return true
                      const q = inviteSearch.toLowerCase()
                      return (p.full_name ?? '').toLowerCase().includes(q) || (p.username ?? '').toLowerCase().includes(q)
                    }).length === 0 && (
                      <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '16px 0' }}>
                        {inviteSearch ? 'No users found' : 'No other users to invite yet'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>
            {circles.length > 0 ? (primaryCircle?.name.toUpperCase() ?? 'YOUR CIRCLE') : 'YOUR CIRCLE'}
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {circles.length > 0 ? '⚔️ War Room' : 'Find Your\nPeople.'}
          </h1>
        </div>
        {circles.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowInvite(true)} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Invite</button>
            <button onClick={() => setShowPost(true)} className="btn-gold" style={{ width: 'auto', padding: '10px 18px', fontSize: 11 }}>+ Share</button>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      {circles.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.k} onClick={() => setMainTab(t.k)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 12, background: mainTab === t.k ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)', color: mainTab === t.k ? '#EFEFEF' : 'rgba(255,255,255,0.35)', transition: 'all 0.2s', boxShadow: mainTab === t.k ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }}>
              {t.l}
            </button>
          ))}
        </div>
      )}

      {/* ══════════ NO CIRCLE ══════════ */}
      {circles.length === 0 && (
        <>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300, marginBottom: 20 }}>Most people fail alone. The ones who don&apos;t have a Circle.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {circleApproved ? (
              <button onClick={() => setShowCreate(true)} style={{ width: '100%', padding: 24, borderRadius: 18, border: '1px solid rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.05)', textAlign: 'left', cursor: 'pointer' }}>
                <p style={{ fontSize: 28, marginBottom: 10 }}>✨</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', marginBottom: 4 }}>Start a Circle</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', fontWeight: 300 }}>Lead a private group of up to 10 people. You set the standard.</p>
              </button>
            ) : (
              <CircleUnlockCard eligibility={circleEligibility} requested={circleRequested} />
            )}
            <button onClick={() => setShowJoin(true)} style={{ width: '100%', padding: 24, borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', cursor: 'pointer' }}>
              <p style={{ fontSize: 28, marginBottom: 10 }}>🔑</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', marginBottom: 4 }}>Join a Circle</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', fontWeight: 300 }}>Got a code? Get in. Someone who believes in you is waiting.</p>
            </button>
          </div>
          {successCode && (
            <div style={{ padding: 20, borderRadius: 18, border: '1px solid rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.05)' }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>CIRCLE CREATED — SHARE THIS CODE</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.3em' }}>{successCode}</p>
            </div>
          )}
        </>
      )}

      {/* ══════════ BOARD TAB (WAR ROOM) ══════════ */}
      {circles.length > 0 && mainTab === 'board' && (
        <>
          {/* ── Weekly Commitments ── */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 14 }}>THIS WEEK&apos;S COMMITMENTS</p>

            {/* My commitment or input */}
            {myCommitment ? (
              <CommitmentCard
                commitment={myCommitment}
                isOwn
                witnessed={false}
                onStatus={handleCommitStatus}
              />
            ) : (
              <div style={{ borderRadius: 16, background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.15)', padding: '14px 16px', marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#D4AF37', marginBottom: 10 }}>WHAT&apos;S YOUR #1 COMMITMENT?</p>
                <textarea
                  value={commitmentText}
                  onChange={e => setCommitmentText(e.target.value)}
                  maxLength={200}
                  placeholder="I commit to _____ by end of week."
                  rows={2}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: '#EFEFEF', fontSize: 14, fontFamily: 'Satoshi,sans-serif', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    onClick={handlePostCommitment}
                    disabled={!commitmentText.trim() || submittingCommit}
                    style={{ padding: '8px 18px', borderRadius: 10, background: commitmentText.trim() ? 'linear-gradient(135deg,#D4AF37,#9A7010)' : 'rgba(255,255,255,0.06)', border: 'none', color: commitmentText.trim() ? '#000' : 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 800, cursor: commitmentText.trim() ? 'pointer' : 'default', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.2s' }}
                  >
                    {submittingCommit ? 'Posting…' : 'Post it →'}
                  </button>
                </div>
              </div>
            )}

            {/* Others' commitments */}
            {othersCommitments.map(c => (
              <CommitmentCard
                key={c.id}
                commitment={c}
                isOwn={false}
                witnessed={localWitnessed.has(c.id)}
                onWitness={handleWitness}
              />
            ))}

            {localCommitments.length === 0 && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', textAlign: 'center', paddingTop: 4 }}>
                Be the first to post your commitment this week.
              </p>
            )}
          </div>

          {/* Who's Showing Up — member status grid */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 14 }}>WHO&apos;S SHOWING UP</p>
            {memberStatuses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>👥</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>Just you so far</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>Invite people to your circle to see their progress here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {memberStatuses.map(s => (
                  <MemberStatusCard key={s.user_id} status={s} userId={userId} />
                ))}
              </div>
            )}
          </div>

          {/* Weekly leaderboard */}
          {leaderboard.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>THIS WEEK&apos;S BOARD</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {leaderboard.map((entry, i) => (
                  <div key={entry.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: i === 0 ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${i === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: i === 0 ? '#D4AF37' : i === 1 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)', width: 18, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.user_id === userId ? 'You' : (entry.full_name ?? 'Member')}
                      </p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                        {entry.post_count} post{entry.post_count !== 1 ? 's' : ''} · {entry.assessment_count} reflection{entry.assessment_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: i === 0 ? '#D4AF37' : '#EFEFEF' }}>{entry.score}pts</span>
                      {entry.streak > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>🔥{entry.streak}w</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reflections strip */}
          {memberAssessments.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>THIS WEEK&apos;S REFLECTIONS</p>
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
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>Read reflection →</p>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Next upcoming session */}
          {sessions.length > 0 && (() => {
            const next = sessions[0]
            const sDate = new Date(next.scheduled_at)
            const isLive = Date.now() >= sDate.getTime() - 5 * 60000 && Date.now() <= sDate.getTime() + 60 * 60000
            return (
              <div style={{ marginBottom: 24, padding: '14px 16px', borderRadius: 14, background: isLive ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isLive ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: isLive ? '#4ade80' : 'rgba(255,255,255,0.42)', marginBottom: 4 }}>
                      {isLive ? '🔴 LIVE NOW' : '📅 COMING UP'}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.title}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{sDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {sDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                  <button onClick={() => setMainTab('sessions')} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                    View all →
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Birthday strip */}
          {(() => {
            const today = new Date()
            const upcoming = birthdayProfiles
              .map(p => {
                if (!p.date_of_birth) return null
                const [, bMm, bDd] = p.date_of_birth.split('-').map(Number)
                const thisYear = new Date(today.getFullYear(), bMm - 1, bDd)
                if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1)
                const diffMs = thisYear.getTime() - today.setHours(0,0,0,0)
                const daysAway = Math.round(diffMs / 86400000)
                return { ...p, month: bMm, day: bDd, daysAway }
              })
              .filter((x): x is NonNullable<typeof x> => x !== null)
              .sort((a, b) => a.daysAway - b.daysAway)
              .slice(0, 5)
            if (upcoming.length === 0) return null
            return (
              <div style={{ marginBottom: 24, padding: '14px 16px', borderRadius: 18, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.14)' }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#fbbf24', marginBottom: 12 }}>🎂 UPCOMING BIRTHDAYS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {upcoming.map(p => {
                    const isToday = p.daysAway === 0
                    const isSoon = p.daysAway <= 7
                    const monthName = new Date(2000, p.month - 1).toLocaleString('en-US', { month: 'short' })
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarGrad(p.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                          {initials(p.full_name)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: isToday ? '#fbbf24' : '#EFEFEF' }}>{p.full_name ?? 'Member'}</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{monthName} {p.day}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: isToday ? '#fbbf24' : isSoon ? '#f97316' : 'rgba(255,255,255,0.28)', flexShrink: 0 }}>
                          {isToday ? '🎉 Today!' : `${p.daysAway}d`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* ══════════ FEED TAB ══════════ */}
      {circles.length > 0 && mainTab === 'feed' && (
        <>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)' }}>
                POSTS {feedFilter === 'circle' ? filteredPosts.length : followingPosts.length}
              </p>
            </div>
            <button onClick={() => setShowPost(true)} style={{ padding: '7px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#D4AF37,#9A7010)', border: 'none', color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.02em' }}>
              + NEW POST
            </button>
          </div>

          {/* Circle / Following toggle */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 3 }}>
            {([
              { k: 'circle' as const,    l: '👥 My Circle' },
              { k: 'following' as const, l: `Following${followingPosts.length > 0 ? ` (${followingPosts.length})` : ''}` },
            ] as const).map(({ k, l }) => (
              <button key={k} onClick={() => { setFeedFilter(k); if (k === 'circle') setFilter('all') }} style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', fontWeight: 700, fontSize: 13, background: feedFilter === k ? 'rgba(255,255,255,0.08)' : 'transparent', color: feedFilter === k ? '#EFEFEF' : 'rgba(255,255,255,0.35)', transition: 'all 0.2s', boxShadow: feedFilter === k ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }}>{l}</button>
            ))}
          </div>

          {feedFilter === 'circle' ? (
            <>
              {/* Type filter chips */}
              <div style={{ margin: '0 -20px', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 20px 4px', scrollbarWidth: 'none' }}>
                  {FILTER_TABS.map(t => (
                    <button key={t.k} onClick={() => setFilter(t.k)} style={{ whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: 'Satoshi,sans-serif', cursor: 'pointer', flexShrink: 0, background: filter === t.k ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)', color: filter === t.k ? '#D4AF37' : 'rgba(255,255,255,0.42)', border: filter === t.k ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255,255,255,0.07)', transition: 'all 0.15s' }}>{t.l}</button>
                  ))}
                </div>
              </div>
              {filteredPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <p style={{ fontSize: 40, marginBottom: 14 }}>💬</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No posts yet</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>Be the first to share a win or update.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {filteredPosts.map(post => (
                    <FeedGridCell key={post.id} post={post} onClick={() => setExpandedPost(post)} />
                  ))}
                </div>
              )}
            </>
          ) : (
            followingPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontSize: 40, marginBottom: 14 }}>✦</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No following posts yet</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>Follow builders in Explore to see their updates here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {followingPosts.map(post => (
                  <FeedGridCell key={post.id} post={post} onClick={() => setExpandedPost(post)} />
                ))}
              </div>
            )
          )}

          {/* Invite strip at bottom */}
          {primaryCircle && feedFilter === 'circle' && (
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <button onClick={() => setShowInvite(true)} style={{ flex: 1, padding: '12px 16px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.04))', border: '1px solid rgba(212,175,55,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Satoshi,sans-serif' }}>
                <span style={{ fontSize: 16 }}>✉️</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', marginBottom: 1 }}>Invite to {primaryCircle.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 300 }}>Share link · QR · code</p>
                </div>
              </button>
              <button onClick={() => setShowJoin(true)} style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.42)', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap' }}>Join another</button>
            </div>
          )}
        </>
      )}

      {/* ── Expanded post bottom sheet (portal) ── */}
      {mounted && expandedPost && createPortal(
        <>
          <div onClick={() => setExpandedPost(null)} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100000, maxHeight: '88dvh', display: 'flex', flexDirection: 'column', background: '#0E0E0E', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ flexShrink: 0, padding: '14px 0 8px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 32px' }}>
              <PostCard post={expandedPost} userId={userId} myAvatar={userAvatar} myName={userUsername ?? userName} shareMembers={discoverProfiles.map(p => ({ id: p.id, name: p.full_name, avatar: p.avatar_url ?? null }))} onReact={handleReaction} />
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ══════════ SESSIONS TAB ══════════ */}
      {circles.length > 0 && mainTab === 'sessions' && (
        <SessionsTab
          sessions={sessions}
          rsvps={rsvps}
          rsvpProfiles={rsvpProfiles}
          userId={userId}
          primaryCircle={primaryCircle ?? null}
        />
      )}

      {/* ══ Share Modal ══ */}
      {showPost && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', padding: '20px 16px' }} onClick={() => { setShowPost(false); setPostContent('') }}>
          <div style={{ width: '100%', maxWidth: 520, borderRadius: 28, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: 24, maxHeight: '85dvh', overflowY: 'auto', animation: 'scaleIn 0.2s ease both' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 32, height: 3, borderRadius: 2, background: '#222', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', lineHeight: 1 }}>Share with your Circle</h2>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>What&apos;s worth celebrating today?</p>
              </div>
              <button onClick={() => { setShowPost(false); setPostContent('') }} style={{ fontSize: 22, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 12 }}>WHAT TYPE OF UPDATE?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                {TYPE_KEYS.map(k => {
                  const m = TYPE_META[k]; const active = postType === k
                  return (
                    <button key={k} type="button" onClick={() => setPostType(k)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 4px', borderRadius: 14, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', background: active ? m.bg : 'rgba(255,255,255,0.03)', border: active ? `1px solid ${m.border}` : '1px solid rgba(255,255,255,0.07)', transform: active ? 'scale(1.04)' : 'scale(1)' }}>
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{m.emoji}</span>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: active ? m.color : 'rgba(255,255,255,0.42)' }}>{m.label.toUpperCase()}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: '11px 14px', borderRadius: 10, background: selectedMeta.bg, border: `1px solid ${selectedMeta.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{selectedMeta.emoji}</span>
              <p style={{ fontSize: 12, color: selectedMeta.color, fontWeight: 500, lineHeight: 1.5 }}>{selectedMeta.prompt}</p>
            </div>
            <textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="Be specific. Be honest." rows={4} maxLength={500} autoFocus className="cc-input" style={{ marginBottom: 6, fontSize: 14, lineHeight: 1.65, resize: 'none' }} />
            <p style={{ fontSize: 10, color: postContent.length > 450 ? '#f87171' : 'rgba(255,255,255,0.35)', textAlign: 'right', marginBottom: 14 }}>{postContent.length}/500</p>

            {/* Media preview */}
            {postPreview && (
              <div style={{ position: 'relative', marginBottom: 14, borderRadius: 14, overflow: 'hidden' }}>
                {postIsVideo
                  ? <video src={postPreview} controls playsInline style={{ width: '100%', maxHeight: 260, display: 'block', background: '#000' }} />
                  : <img src={postPreview} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
                }
                <button onClick={() => { setPostFile(null); setPostPreview(null) }} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#FFF', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Satoshi,sans-serif' }}>×</button>
              </div>
            )}

            {/* Add photo */}
            {!postPreview && (
              <button type="button" onClick={() => postFileRef.current?.click()} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                📷 Add Photo or Video
              </button>
            )}
            <input ref={postFileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handlePostFileChange} />

            {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-ghost" style={{ width: 'auto', padding: '13px 20px' }} onClick={() => { setShowPost(false); setPostContent(''); setPostFile(null); setPostPreview(null) }}>Cancel</button>
              <button type="button" disabled={isPending || (!postContent.trim() && !postFile)} onClick={handlePost} style={{ flex: 1, padding: '13px 20px', borderRadius: 14, cursor: (postContent.trim() || postFile) ? 'pointer' : 'default', fontFamily: 'Satoshi,sans-serif', fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', transition: 'all 0.2s', border: `1px solid ${selectedMeta.border}`, background: (postContent.trim() || postFile) ? selectedMeta.bg : 'rgba(255,255,255,0.03)', color: (postContent.trim() || postFile) ? selectedMeta.color : 'rgba(255,255,255,0.35)', opacity: isPending ? 0.6 : 1, boxShadow: (postContent.trim() || postFile) ? `0 0 20px ${selectedMeta.border}` : 'none' }}>
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
            <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', display: 'block', marginBottom: 8 }}>CIRCLE NAME</label>
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
            <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', display: 'block', marginBottom: 8 }}>INVITE CODE</label>
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
function FollowingTab({ followingIds, discoverProfiles, followingPosts, userId, myAvatar, onReact, onDiscover }: {
  followingIds: string[]; discoverProfiles: DiscoverProfile[]; followingPosts: PostWithMeta[]
  userId: string; myAvatar: string | null; onReact: (id: string, type: 'fire' | 'strong' | 'relate') => void
  onDiscover: () => void
}) {
  const followedProfiles = discoverProfiles.filter(p => followingIds.includes(p.id))

  if (followingIds.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: 40, marginBottom: 14 }}>👤</p>
        <p style={{ fontSize: 17, fontWeight: 800, color: '#EFEFEF', marginBottom: 6 }}>No one followed yet</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300, marginBottom: 24 }}>Follow builders doing incredible things.</p>
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
            <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.50)', maxWidth: 52, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.username ?? p.full_name?.split(' ')[0] ?? '?'}
            </p>
          </div>
        ))}
      </div>

      {/* Posts */}
      {followingPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)' }}>No posts from people you follow yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {followingPosts.map((post, idx) => (
            <div key={post.id}>
              <PostCard post={post} userId={userId} myAvatar={myAvatar} myName={null} shareMembers={[]} onReact={onReact} />
              {idx < followingPosts.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Sessions Tab
// ══════════════════════════════════════════════════════
function SessionsTab({ sessions, rsvps, rsvpProfiles, userId, primaryCircle }: {
  sessions: Session[]; rsvps: SessionRsvp[]; rsvpProfiles: RsvpProfile[]
  userId: string; primaryCircle: { id: string; name: string; code: string } | null
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [localRsvps, setLocalRsvps] = useState<SessionRsvp[]>(rsvps)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function handleRsvp(sessionId: string, status: 'going' | 'maybe' | 'cant_make_it') {
    setLocalRsvps(prev => {
      const without = prev.filter(r => !(r.session_id === sessionId && r.user_id === userId))
      return [...without, { session_id: sessionId, user_id: userId, status }]
    })
    startTransition(async () => { await rsvpSession(sessionId, status); router.refresh() })
  }

  function handleDelete(sessionId: string) {
    startTransition(async () => { await deleteSession(sessionId); router.refresh() })
  }

  const profileMap = Object.fromEntries(rsvpProfiles.map(p => [p.id, p.full_name]))
  const upcoming = sessions.filter(s => new Date(s.scheduled_at) >= new Date(Date.now() - 2 * 3600_000))
  const past     = sessions.filter(s => new Date(s.scheduled_at) <  new Date(Date.now() - 2 * 3600_000))

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 20px' }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>ACCOUNTABILITY</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)' }}>{upcoming.length === 0 ? 'No sessions scheduled' : `${upcoming.length} upcoming`}</p>
        </div>
        {primaryCircle && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 12,
              background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)',
              color: '#D4AF37', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            New Session
          </button>
        )}
      </div>

      {/* No circle state */}
      {!primaryCircle && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>⚡</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#EFEFEF', marginBottom: 8 }}>Join a Circle first</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)' }}>Sessions are created within your Circle.</p>
        </div>
      )}

      {/* Upcoming sessions */}
      {upcoming.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {upcoming.map(s => (
            <SessionCard
              key={s.id} session={s}
              rsvps={localRsvps.filter(r => r.session_id === s.id)}
              profileMap={profileMap}
              userId={userId}
              onRsvp={status => handleRsvp(s.id, status)}
              onDelete={() => handleDelete(s.id)}
            />
          ))}
        </div>
      )}

      {/* Empty upcoming */}
      {primaryCircle && upcoming.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 20, marginBottom: 24 }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>📅</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#EFEFEF', marginBottom: 8 }}>No sessions yet</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>Create a session and your circle will be notified to show up.</p>
        </div>
      )}

      {/* Past sessions */}
      {past.length > 0 && (
        <>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', marginBottom: 12 }}>PAST</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {past.map(s => (
              <SessionCard
                key={s.id} session={s} isPast
                rsvps={localRsvps.filter(r => r.session_id === s.id)}
                profileMap={profileMap}
                userId={userId}
                onRsvp={status => handleRsvp(s.id, status)}
                onDelete={() => handleDelete(s.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Create Session Modal */}
      {showCreate && primaryCircle && (
        <CreateSessionModal circleId={primaryCircle.id} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}

function sessionTiming(scheduledAt: string): { label: string; color: string; isLive: boolean } {
  const t = new Date(scheduledAt).getTime()
  const now = Date.now()
  const diffMs = t - now
  const diffMin = Math.round(diffMs / 60000)

  if (diffMs > -2 * 3600_000 && diffMs < 2 * 3600_000) {
    if (diffMs < 0) return { label: 'Live now', color: '#4ade80', isLive: true }
    if (diffMin <= 15) return { label: `Starting in ${diffMin}m`, color: '#D4AF37', isLive: false }
  }
  if (diffMs < 0) return { label: new Date(scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), color: 'rgba(255,255,255,0.28)', isLive: false }

  const days = Math.floor(diffMs / 86400000)
  const timeStr = new Date(scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (days === 0) return { label: `Today · ${timeStr}`, color: '#D4AF37', isLive: false }
  if (days === 1) return { label: `Tomorrow · ${timeStr}`, color: '#a78bfa', isLive: false }
  const dateStr = new Date(scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return { label: `${dateStr} · ${timeStr}`, color: 'rgba(255,255,255,0.58)', isLive: false }
}

function SessionCard({ session: s, rsvps, profileMap, userId, onRsvp, onDelete, isPast }: {
  session: Session; rsvps: SessionRsvp[]; profileMap: Record<string, string | null>
  userId: string; onRsvp: (status: 'going' | 'maybe' | 'cant_make_it') => void
  onDelete: () => void; isPast?: boolean
}) {
  const timing = sessionTiming(s.scheduled_at)
  const myRsvp = rsvps.find(r => r.user_id === userId)?.status
  const goingList = rsvps.filter(r => r.status === 'going')
  const maybeCount = rsvps.filter(r => r.status === 'maybe').length
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const RSVP_OPTS: { k: 'going' | 'maybe' | 'cant_make_it'; l: string; color: string; bg: string }[] = [
    { k: 'going',        l: 'Going',      color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
    { k: 'maybe',        l: 'Maybe',      color: '#D4AF37', bg: 'rgba(212,175,55,0.12)' },
    { k: 'cant_make_it', l: "Can't go",   color: 'rgba(255,255,255,0.42)',    bg: 'rgba(255,255,255,0.04)' },
  ]

  return (
    <div style={{
      background: isPast ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${timing.isLive ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 20, overflow: 'hidden',
      boxShadow: timing.isLive ? '0 0 24px rgba(74,222,128,0.08)' : 'none',
      opacity: isPast ? 0.6 : 1,
    }}>
      {/* Live pulse bar */}
      {timing.isLive && (
        <div style={{ height: 2, background: 'linear-gradient(90deg, #4ade80, #22c55e, #4ade80)', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
      )}

      <div style={{ padding: '16px 18px' }}>
        {/* Top row: timing + delete */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
            color: timing.color, padding: '3px 10px', borderRadius: 20,
            background: `${timing.color}18`, border: `1px solid ${timing.color}30`,
          }}>{timing.label}{timing.isLive && ' 🔴'}</span>
          {s.created_by === userId && (
            <div>
              {showConfirmDelete ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={onDelete} style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Delete</button>
                  <button onClick={() => setShowConfirmDelete(false)} style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowConfirmDelete(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>···</button>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <p style={{ fontSize: 17, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.3, marginBottom: s.description ? 6 : 14 }}>{s.title}</p>
        {s.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5, marginBottom: 14 }}>{s.description}</p>}

        {/* Join meeting button */}
        {s.meeting_url && (
          <a href={s.meeting_url} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px',
            borderRadius: 11, marginBottom: 16, textDecoration: 'none',
            background: timing.isLive ? 'rgba(74,222,128,0.15)' : 'rgba(96,165,250,0.12)',
            border: `1px solid ${timing.isLive ? 'rgba(74,222,128,0.35)' : 'rgba(96,165,250,0.3)'}`,
            color: timing.isLive ? '#4ade80' : '#60a5fa',
            fontSize: 12, fontWeight: 700, fontFamily: 'Satoshi,sans-serif',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            {timing.isLive ? 'Join Now' : 'Join Meeting'}
          </a>
        )}

        {/* RSVP avatars */}
        {goingList.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex' }}>
              {goingList.slice(0, 5).map((r, i) => (
                <div key={r.user_id} style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: AVATAR_GRADS[r.user_id.charCodeAt(0) % AVATAR_GRADS.length],
                  border: '2px solid #0a0a0a', marginLeft: i === 0 ? 0 : -8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: '#fff',
                  zIndex: goingList.length - i,
                }}>
                  {(profileMap[r.user_id] ?? '?').charAt(0).toUpperCase()}
                </div>
              ))}
              {goingList.length > 5 && (
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '2px solid #0a0a0a', marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.42)', zIndex: 0 }}>
                  +{goingList.length - 5}
                </div>
              )}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>
              {goingList.length} going{maybeCount > 0 ? ` · ${maybeCount} maybe` : ''}
            </span>
          </div>
        )}

        {/* RSVP buttons */}
        {!isPast && (
          <div style={{ display: 'flex', gap: 7 }}>
            {RSVP_OPTS.map(opt => (
              <button key={opt.k} onClick={() => onRsvp(opt.k)} style={{
                flex: 1, padding: '8px 0', borderRadius: 10, border: '1px solid',
                borderColor: myRsvp === opt.k ? `${opt.color}55` : 'rgba(255,255,255,0.07)',
                background: myRsvp === opt.k ? opt.bg : 'transparent',
                color: myRsvp === opt.k ? opt.color : 'rgba(255,255,255,0.35)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif',
                transition: 'all 0.18s',
              }}>
                {myRsvp === opt.k && opt.k === 'going' ? '✓ ' : ''}{opt.l}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateSessionModal({ circleId, onClose }: { circleId: string; onClose: () => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Default to tomorrow at 7pm
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split('T')[0]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setLoading(true)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const r = await createSession(circleId, fd)
      setLoading(false)
      if (r.error) { setError(r.error); return }
      onClose(); router.refresh()
    })
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}
      className="modal-open"
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24, padding: '28px 24px',
          animation: 'scaleIn 0.2s ease both',
          maxHeight: '85dvh', overflowY: 'auto',
        }}
      >
        <style>{``}</style>

        {/* Handle bar */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', margin: '0 auto 24px' }} />

        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>NEW SESSION</p>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF', marginBottom: 24, letterSpacing: '-0.02em' }}>Schedule a Session</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TITLE *</label>
            <input name="title" required placeholder="Weekly Goal Check-in" maxLength={100} className="cc-input" style={{ fontSize: 15 }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>DATE *</label>
              <input name="date" type="date" required defaultValue={defaultDate} className="cc-input" style={{ fontSize: 14, colorScheme: 'dark' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>TIME *</label>
              <input name="time" type="time" required defaultValue="19:00" className="cc-input" style={{ fontSize: 14, colorScheme: 'dark' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>MEETING LINK <span style={{ color: 'rgba(255,255,255,0.28)' }}>(optional)</span></label>
            <input name="meeting_url" type="url" placeholder="https://zoom.us/j/..." className="cc-input" style={{ fontSize: 14 }} />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.42)', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>DESCRIPTION <span style={{ color: 'rgba(255,255,255,0.28)' }}>(optional)</span></label>
            <textarea name="description" placeholder="What will you focus on this session?" maxLength={500} rows={2} className="cc-input" style={{ fontSize: 14, resize: 'none', lineHeight: 1.5 }} />
          </div>

          {error && <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            padding: '14px', borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.2)',
            color: '#D4AF37', fontWeight: 800, fontSize: 15, fontFamily: 'Satoshi,sans-serif',
            marginTop: 4,
          }}>
            {loading ? 'Scheduling…' : 'Schedule Session ⚡'}
          </button>
        </form>
      </div>
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
        <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontSize: 18, color: 'rgba(255,255,255,0.50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1 }}>{monthLabel}</p>
          {monthGoals.length > 0 && (
            <p style={{ fontSize: 10, color: '#D4AF37', fontWeight: 600, marginTop: 3 }}>
              {monthGoals.length} deadline{monthGoals.length !== 1 ? 's' : ''} this month
            </p>
          )}
        </div>
        <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontSize: 18, color: 'rgba(255,255,255,0.50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>›</button>
        <button onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); setSelectedDate(null) }} style={{ padding: '7px 12px', borderRadius: 10, fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', background: 'rgba(212,175,55,0.07)', flexShrink: 0, letterSpacing: '0.04em' }}>TODAY</button>
      </div>

      {/* Day of week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
        {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', padding: '6px 0' }}>{d}</div>
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
                color: cell.isToday ? '#000' : cell.inCurrentMonth ? (cell.isPast ? 'rgba(255,255,255,0.35)' : '#EFEFEF') : 'rgba(255,255,255,0.18)',
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
                    <div style={{ fontSize: 7, fontWeight: 800, color: 'rgba(255,255,255,0.42)', lineHeight: 1, marginTop: 1 }}>+{cell.goals.length - 3}</div>
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
            <button onClick={() => setSelectedDate(null)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.42)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Satoshi,sans-serif' }}>×</button>
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
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.06em' }}>DAYS</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming deadlines */}
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>UPCOMING DEADLINES</p>
      {upcoming.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>📅</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No upcoming deadlines</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>Set deadlines on your goals and they&apos;ll appear here.</p>
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
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.42)', textTransform: 'capitalize' }}>{g.category ?? 'Goal'}</p>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>·</span>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{new Date(g.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
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
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>Invite others to join Confirmed Creations to discover people to follow.</p>
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
            <button key={f} onClick={() => setDiscFilter(f)} style={{ padding: '5px 13px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', border: 'none', transition: 'all 0.15s', background: discFilter === f ? 'rgba(212,175,55,0.15)' : 'transparent', color: discFilter === f ? '#D4AF37' : 'rgba(255,255,255,0.42)' }}>
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
              <a href={`/profile/${spotlight.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, textDecoration: 'none' }}>
                <div style={{ width: 66, height: 66, borderRadius: '50%', background: avatarGrad(spotlight.id), color: '#FFF', fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.12)', boxShadow: '0 0 28px rgba(0,0,0,0.6)', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                  {spotlight.avatar_url ? <img src={spotlight.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} /> : initials(spotlight.full_name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{spotlight.full_name ?? 'Builder'}</p>
                  {spotlight.username && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>@{spotlight.username}</p>}
                </div>
              </a>
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.48)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
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
              <div className="disc-av-float" style={{ width: 52, height: 52, fontSize: 14, background: avatarGrad(p.id), overflow: 'hidden', position: 'relative' }}>
                {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} /> : initials(p.full_name)}
              </div>
            </div>
            <div style={{ padding: '30px 16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <a href={`/profile/${p.id}`} style={{ minWidth: 0, textDecoration: 'none' }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.15 }}>{p.full_name ?? 'Builder'}</p>
                  {p.username && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>@{p.username}</p>}
                </a>
                <FollowBtn id={p.id} userId={userId} followingIds={followingIds} isPending={isPending} onFollow={onFollow} onUnfollow={onUnfollow} />
              </div>
              {p.tagline && (
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.50)', fontStyle: 'italic', lineHeight: 1.55, marginBottom: 12, paddingLeft: 10, borderLeft: '2px solid rgba(212,175,55,0.25)' }}>
                  &ldquo;{p.tagline}&rdquo;
                </p>
              )}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden', marginBottom: 10 }}>
                <div className="disc-stat" style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                  <p className="disc-stat-n">{p.streak}</p>
                  <p className="disc-stat-l">STREAK</p>
                </div>
                <div className="disc-stat">
                  <p className="disc-stat-n" style={{ color: '#D4AF37' }}>{p.goals_complete}</p>
                  <p className="disc-stat-l">DONE</p>
                </div>
              </div>
              <a href={`/inbox/${p.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', textDecoration: 'none', color: 'rgba(255,255,255,0.58)', fontSize: 12, fontWeight: 600, fontFamily: 'Satoshi,sans-serif' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Message
              </a>
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
// Commitment Card
// ══════════════════════════════════════════════════════
function CommitmentCard({
  commitment, isOwn, witnessed, onWitness, onStatus,
}: {
  commitment: CircleCommitment; isOwn: boolean; witnessed: boolean
  onWitness?: (id: string, userId: string) => void
  onStatus?: (id: string, status: 'done' | 'failed') => void
}) {
  const isDone = commitment.status === 'done'
  const isFailed = commitment.status === 'failed'
  const profileHref = `/profile/${commitment.user_id}`
  return (
    <div style={{ borderRadius: 16, background: isOwn ? 'rgba(212,175,55,0.04)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isOwn ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.07)'}`, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Link href={profileHref} style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarGrad(commitment.user_id), overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff' }}>
            {commitment.avatar_url
              ? <img src={commitment.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : initials(commitment.full_name)
            }
          </div>
        </Link>
        <p style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isOwn ? 'You' : (commitment.full_name ?? 'Member')}
        </p>
        {isDone && <span style={{ fontSize: 10, fontWeight: 800, color: '#4ade80', padding: '2px 8px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', flexShrink: 0 }}>✓ Done</span>}
        {isFailed && <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>Didn&apos;t make it</span>}
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: isFailed ? 'rgba(255,255,255,0.35)' : '#EFEFEF', lineHeight: 1.5, marginBottom: 12, fontStyle: 'italic' }}>
        &ldquo;{commitment.text}&rdquo;
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
          {commitment.witness_count > 0 ? `👁 ${commitment.witness_count} witnessing` : '👁 No witnesses yet'}
        </p>
        {isOwn && commitment.status === 'active' && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onStatus?.(commitment.id, 'done')} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#4ade80', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>✓ Done</button>
            <button onClick={() => onStatus?.(commitment.id, 'failed')} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Nope</button>
          </div>
        )}
        {!isOwn && commitment.status === 'active' && (
          <button
            onClick={() => { if (!witnessed) onWitness?.(commitment.id, commitment.user_id) }}
            disabled={witnessed}
            style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${witnessed ? 'rgba(34,197,94,0.3)' : 'rgba(212,175,55,0.35)'}`, background: witnessed ? 'rgba(34,197,94,0.1)' : 'rgba(212,175,55,0.08)', color: witnessed ? '#4ade80' : '#D4AF37', fontSize: 11, fontWeight: 800, cursor: witnessed ? 'default' : 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.2s', flexShrink: 0 }}
          >
            {witnessed ? '✓ Witnessing' : 'I see you'}
          </button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// Member Status Card (War Room board)
// ══════════════════════════════════════════════════════
function MemberStatusCard({ status, userId }: { status: MemberStatus; userId: string }) {
  const isYou = status.user_id === userId
  const activeToday = status.posted_today || status.energy_today !== null
  const activeWeek = status.post_count_week > 0
  const dotColor = activeToday ? '#4ade80' : activeWeek ? '#D4AF37' : '#444'
  const borderColor = activeToday ? 'rgba(74,222,128,0.3)' : activeWeek ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)'
  const glowShadow = activeToday ? '0 0 20px rgba(74,222,128,0.1)' : 'none'
  const energyTxt = getEnergyLabel(status.energy_today)
  const profileHref = `/profile/${status.user_id}`

  return (
    <Link href={profileHref} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ padding: '14px 12px', borderRadius: 16, background: '#111', border: `1px solid ${borderColor}`, boxShadow: glowShadow }}>
        {/* Avatar + status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: avatarGrad(status.user_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff' }}>
              {status.avatar_url
                ? <img src={status.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : initials(status.full_name)
              }
            </div>
            <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: dotColor, border: '2px solid #111', boxShadow: activeToday ? '0 0 5px rgba(74,222,128,0.9)' : 'none' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
              {isYou ? 'You' : (status.full_name ?? 'Member')}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', lineHeight: 1.3 }}>
              {status.streak > 0 ? `🔥 ${status.streak}w` : 'Starting out'}
            </p>
          </div>
        </div>

        {/* Active goal */}
        {status.active_goal ? (
          <div style={{ marginBottom: 6 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5, lineHeight: 1.3 }}>
              {status.active_goal.title}
            </p>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, status.active_goal.progress))}%`, background: catColor(status.active_goal.category), borderRadius: 2 }} />
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 6 }}>No active goal</p>
        )}

        {/* Post count */}
        <p style={{ fontSize: 10, color: activeWeek ? '#D4AF37' : 'rgba(255,255,255,0.28)', fontWeight: activeWeek ? 700 : 400 }}>
          {status.post_count_week > 0 ? `✓ ${status.post_count_week} post${status.post_count_week !== 1 ? 's' : ''} this week` : 'No posts yet'}
        </p>
      </div>
    </Link>
  )
}

// ══════════════════════════════════════════════════════
// Shared sub-components
// ══════════════════════════════════════════════════════
type ShareMember = { id: string; name: string | null; avatar: string | null }

// ══════════════════════════════════════════════════════
// Feed Grid Cell
// ══════════════════════════════════════════════════════
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g
function extractFirstUrl(text: string): string | null {
  return text.match(URL_REGEX)?.[0] ?? null
}

function FeedGridCell({ post, onClick }: { post: PostWithMeta; onClick: () => void }) {
  const [ogImage, setOgImage] = useState<string | null>(null)
  const [siteName, setSiteName] = useState<string | null>(null)
  const firstUrl = extractFirstUrl(post.content)
  const hasMedia = !!post.media_url
  const isVideo = post.media_type === 'video' || (!!post.media_url && post.media_url.includes('.mp4'))
  const meta = TYPE_META[post.type] ?? TYPE_META['win']

  useEffect(() => {
    if (hasMedia || !firstUrl) return
    fetch(`/api/og-preview?url=${encodeURIComponent(firstUrl)}`)
      .then(r => r.json())
      .then((d: { ogImage?: string; siteName?: string }) => {
        if (d.ogImage) setOgImage(d.ogImage)
        if (d.siteName) setSiteName(d.siteName)
      })
      .catch(() => {})
  }, [firstUrl, hasMedia])

  const thumbSrc = hasMedia ? post.media_url : ogImage

  return (
    <div
      onClick={onClick}
      style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: thumbSrc ? '#111' : meta.bg, border: `1px solid ${thumbSrc ? 'rgba(255,255,255,0.07)' : meta.border}`, WebkitTapHighlightColor: 'transparent' }}
    >
      {thumbSrc ? (
        <img src={thumbSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
          <span style={{ fontSize: 22, marginBottom: 6 }}>{meta.emoji}</span>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' as const }}>{post.content}</p>
        </div>
      )}
      {/* Bottom overlay — site name or reaction count */}
      {thumbSrc && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)', padding: '20px 8px 7px' }}>
          {siteName && <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.03em' }}>{siteName}</p>}
        </div>
      )}
      {/* Video play icon */}
      {isVideo && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="14" viewBox="0 0 12 14" fill="white"><polygon points="0,0 12,7 0,14"/></svg>
        </div>
      )}
      {/* Reaction count badge */}
      {(post.reactions.fire + post.reactions.strong + post.reactions.relate) > 0 && (
        <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 99, padding: '2px 6px', fontSize: 10, fontWeight: 700, color: '#fff' }}>
          🔥{post.reactions.fire + post.reactions.strong + post.reactions.relate}
        </div>
      )}
    </div>
  )
}

function PostCard({ post, userId, myAvatar, myName, shareMembers, onReact }: { post: PostWithMeta; userId: string; myAvatar: string | null; myName: string | null; shareMembers: ShareMember[]; onReact: (id: string, type: 'fire' | 'strong' | 'relate') => void }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const isOwn = post.user_id === userId
  const displayName = isOwn ? 'You' : (post.author_name ?? 'Member')
  const av = displayName === 'You' ? 'ME' : initials(displayName)
  const grad = isOwn ? 'linear-gradient(135deg,#D4AF37,#f97316)' : avatarGrad(post.user_id)
  const meta = TYPE_META[post.type]

  const [showComments, setShowComments] = useState(false)
  const [localComments, setLocalComments] = useState<PostComment[]>(post.comments)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [fireActive, setFireActive] = useState(post.my_reactions.fire)
  const [fireCount, setFireCount] = useState(post.reactions.fire)
  const [showShare, setShowShare] = useState(false)
  const [shareSearch, setShareSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sent, setSent] = useState(false)

  const filteredShareMembers = shareMembers.filter(m =>
    !shareSearch || m.name?.toLowerCase().includes(shareSearch.toLowerCase())
  )

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleSend() {
    const payload = JSON.stringify({
      id: post.id,
      type: post.type,
      content: post.content,
      author: displayName,
      authorAvatar: post.author_avatar,
      mediaUrl: post.media_url,
      mediaType: post.media_type,
    })
    const message = `[[POST]]${payload}`
    setSent(true)
    await Promise.all([...selected].map(id => sendMessage(id, message)))
    setTimeout(() => { setShowShare(false); setSelected(new Set()); setSent(false); setShareSearch('') }, 1200)
  }

  function handleCopyLink() {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/circle`
    navigator.clipboard.writeText(url)
  }

  function handleNativeShare() {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/circle`
    if (navigator.share) { navigator.share({ title: 'Confirmed Creations', url }) }
    else { navigator.clipboard.writeText(url) }
  }

  function handleFire() {
    const wasActive = fireActive
    setFireActive(!wasActive)
    setFireCount(c => wasActive ? c - 1 : c + 1)
    onReact(post.id, 'fire')
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    // Optimistic add
    const optimistic: PostComment = {
      id: 'temp-' + Date.now(), user_id: userId,
      author_name: 'You', author_avatar: null, content: commentText.trim(), created_at: new Date().toISOString()
    }
    setLocalComments(prev => [...prev, optimistic])
    setCommentText('')
    const result = await addComment(post.id, optimistic.content)
    if (result.error) {
      setLocalComments(prev => prev.filter(c => c.id !== optimistic.id))
    } else {
      startTransition(() => { router.refresh() })
    }
    setSubmitting(false)
  }

  function handleDelete(commentId: string) {
    setLocalComments(prev => prev.filter(c => c.id !== commentId))
    startTransition(async () => { await deleteComment(commentId); router.refresh() })
  }

  const commentCount = localComments.length

  const avatarEl = (
    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#D4AF37,#a78bfa)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {post.author_avatar
        ? <img src={post.author_avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0A0A0A' }} />
        : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: grad, border: '2px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#FFF' }}>{av}</div>
      }
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 10px' }}>
        {isOwn ? avatarEl : <Link href={`/profile/${post.user_id}`} style={{ textDecoration: 'none' }}>{avatarEl}</Link>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            {isOwn
              ? <span style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em' }}>{displayName}</span>
              : <Link href={`/profile/${post.user_id}`} style={{ textDecoration: 'none', fontSize: 14, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em' }}>{displayName}</Link>
            }
            {meta && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: meta.color + '15', border: `1px solid ${meta.color}30`, color: meta.color, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'capitalize' }}>
                {meta.emoji} {meta.label}
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{timeAgo(post.created_at)}</span>
        </div>
      </div>

      {/* Full-bleed media — full width, natural height on mobile */}
      {post.media_url && post.media_type === 'image' && (
        <img src={post.media_url} alt="" style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
      )}
      {post.media_url && post.media_type === 'video' && (
        <video src={post.media_url} controls playsInline style={{ width: '100%', display: 'block', background: '#000' }} />
      )}

      {/* Text-only */}
      {!post.media_url && post.content && (
        <div style={{ padding: '0 20px 10px' }}>
          <p style={{ fontSize: 14, color: '#C8C8C8', fontWeight: 400, lineHeight: 1.65, margin: 0 }}>
            <span style={{ fontWeight: 800, color: '#EFEFEF', marginRight: 5 }}>@{isOwn ? (myName ?? post.author_name?.split(' ')[0] ?? 'me').toLowerCase() : (post.author_name ?? 'member').split(' ')[0].toLowerCase()}</span>
            {post.content}
          </p>
        </div>
      )}

      {/* Action bar — Instagram style */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px 6px' }}>
        {/* Handshake reaction */}
        <button onClick={handleFire} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px 4px 0' }}>
          <span style={{ fontSize: 22, lineHeight: 1, filter: fireActive ? 'drop-shadow(0 0 8px rgba(212,175,55,1)) drop-shadow(0 0 16px rgba(212,175,55,0.7))' : 'grayscale(1) opacity(0.35)', transition: 'filter 0.2s' }}>🤝</span>
          {fireCount > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: fireActive ? '#D4AF37' : 'rgba(255,255,255,0.55)', fontFamily: 'Satoshi,sans-serif', transition: 'color 0.2s' }}>{fireCount}</span>}
        </button>
        {/* Comment */}
        <button onClick={() => { setShowComments(o => !o); setTimeout(() => inputRef.current?.focus(), 100) }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {commentCount > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.58)', fontFamily: 'Satoshi,sans-serif' }}>{commentCount}</span>}
        </button>
        {/* Share / paper plane */}
        <button onClick={() => setShowShare(true)} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
        {/* Bookmark — flush right */}
        <button style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 4px 8px', marginLeft: 'auto' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>

      {/* Caption for media posts */}
      {post.media_url && post.content && (
        <p style={{ fontSize: 14, lineHeight: 1.65, padding: '8px 20px 10px', color: '#C8C8C8', margin: 0 }}>
          <span style={{ fontWeight: 800, color: '#EFEFEF', marginRight: 5 }}>@{isOwn ? (myName ?? post.author_name?.split(' ')[0] ?? 'me').toLowerCase() : (post.author_name ?? 'member').split(' ')[0].toLowerCase()}</span>
          {post.content}
        </p>
      )}

      {/* Comments — Instagram style */}
      {showComments && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4 }}>
          {localComments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {localComments.map(comment => {
                const isMyComment = comment.user_id === userId
                const name = isMyComment ? 'You' : (comment.author_name ?? 'Member')
                const commentGrad = isMyComment ? 'linear-gradient(135deg,#D4AF37,#f97316)' : avatarGrad(comment.user_id)
                return (
                  <div key={comment.id} style={{ display: 'flex', gap: 12, padding: '12px 20px', alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: commentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#FFF' }}>
                      {comment.author_avatar
                        ? <img src={comment.author_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (isMyComment ? 'ME' : initials(comment.author_name))
                      }
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#EFEFEF', lineHeight: 1.5, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, marginRight: 6 }}>{name}</span>
                        <span style={{ color: '#B0B0B0', fontWeight: 400 }}>{comment.content}</span>
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{timeAgo(comment.created_at)}</span>
                        {isMyComment && (
                          <button onClick={() => handleDelete(comment.id)} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', padding: 0 }}>Delete</button>
                        )}
                      </div>
                    </div>
                    {/* Heart placeholder */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 4 }}>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </div>
                )
              })}
            </div>
          )}
          {/* Reply input — Instagram style */}
          <form onSubmit={handleComment} style={{ display: 'flex', gap: 12, padding: '10px 20px 16px', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#D4AF37,#f97316)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#FFF', overflow: 'hidden' }}>
              {myAvatar ? <img src={myAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'ME'}
            </div>
            <input ref={inputRef} value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment…" maxLength={500} style={{
                flex: 1, padding: '0', fontSize: 13, background: 'none', border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                color: '#EFEFEF', fontFamily: 'Satoshi,sans-serif', outline: 'none',
                paddingBottom: 6,
              }}
            />
            <button type="submit" disabled={!commentText.trim() || submitting} style={{
              fontSize: 13, fontWeight: 800, cursor: commentText.trim() ? 'pointer' : 'default',
              fontFamily: 'Satoshi,sans-serif', background: 'none', border: 'none',
              color: commentText.trim() ? '#38bdf8' : 'rgba(255,255,255,0.28)', transition: 'color 0.15s', padding: 0,
            }}>{submitting ? '…' : 'Post'}</button>
          </form>
        </div>
      )}

      {/* ── Share Sheet ── */}
      {showShare && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', padding: '20px 16px' }} onClick={() => { setShowShare(false); setShareSearch(''); setSelected(new Set()); setSent(false) }}>
          <div style={{ width: '100%', maxWidth: 520, background: '#111', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85dvh', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.2s ease both', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#333', margin: '12px auto 16px' }} />

            {/* Search */}
            <div style={{ padding: '0 16px 16px', position: 'relative' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 30, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={shareSearch}
                onChange={e => setShareSearch(e.target.value)}
                placeholder="Search"
                autoFocus
                style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#EFEFEF', fontSize: 15, fontFamily: 'Satoshi,sans-serif', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* People grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px' }}>
              {filteredShareMembers.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, padding: '20px 0' }}>No people found</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px 8px' }}>
                  {filteredShareMembers.map(m => {
                    const isSelected = selected.has(m.id)
                    const grad = avatarGrad(m.id)
                    return (
                      <button key={m.id} onClick={() => toggleSelect(m.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px', borderRadius: 12 }}>
                        <div style={{ position: 'relative' }}>
                          <div style={{ width: 60, height: 60, borderRadius: '50%', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', overflow: 'hidden', outline: isSelected ? '2.5px solid #D4AF37' : '2.5px solid transparent', outlineOffset: 2, transition: 'outline 0.15s' }}>
                            {m.avatar ? <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{initials(m.name)}</span>}
                          </div>
                          {isSelected && (
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#000', boxShadow: '0 0 0 2px #111' }}>✓</div>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? '#D4AF37' : '#EFEFEF', textAlign: 'center', lineHeight: 1.3, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Satoshi,sans-serif' }}>
                          {m.name?.split(' ')[0] ?? 'Member'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bottom — Send button (when selected) or action row */}
            {selected.size > 0 ? (
              <div style={{ padding: '12px 16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={handleSend} style={{ width: '100%', padding: '14px', borderRadius: 14, background: sent ? 'rgba(74,222,128,0.15)' : 'rgba(212,175,55,0.15)', border: `1px solid ${sent ? 'rgba(74,222,128,0.4)' : 'rgba(212,175,55,0.4)'}`, color: sent ? '#4ade80' : '#D4AF37', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.2s', letterSpacing: '0.02em' }}>
                  {sent ? 'Sent ✓' : `Send to ${selected.size > 1 ? `${selected.size} people` : shareMembers.find(m => selected.has(m.id))?.name?.split(' ')[0] ?? 'Member'}`}
                </button>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px', display: 'flex', justifyContent: 'space-around' }}>
                {[
                  { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, label: 'Copy Link', action: handleCopyLink },
                  { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>, label: 'Share', action: handleNativeShare },
                ].map(({ icon, label, action }) => (
                  <button key={label} onClick={action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px' }}>
                    <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EFEFEF' }}>{icon}</div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.58)', fontFamily: 'Satoshi,sans-serif', fontWeight: 600 }}>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Reaction({ emoji, count, active, activeColor, activeBg, activeBorder, onClick }: { emoji: string; count: number; active: boolean; activeColor: string; activeBg: string; activeBorder: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Satoshi,sans-serif', background: active ? activeBg : 'rgba(255,255,255,0.04)', border: active ? `1px solid ${activeBorder}` : '1px solid rgba(255,255,255,0.07)', color: active ? activeColor : 'rgba(255,255,255,0.52)' }}>
      {emoji} <span style={{ fontWeight: 700 }}>{count}</span>
    </button>
  )
}

function CCModal({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!show) return null
  return (
    <div className="modal-open" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '20px 16px' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: 24, maxHeight: '85dvh', overflowY: 'auto', animation: 'scaleIn 0.2s ease both' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 32, height: 3, borderRadius: 2, background: '#222', margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF' }}>{title}</h2>
          <button onClick={onClose} style={{ fontSize: 24, color: 'rgba(255,255,255,0.42)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
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

// ══ Goals Tab ════════════════════════════════════════════════

const GOAL_CAT_KEYS = ['health','career','finance','learning','creative','relationships','mindset','business','personal','adventure','material','spiritual'] as const

function GoalsTab({ circleGoals, userId }: { circleGoals: CircleGoal[]; userId: string }) {
  const [catFilter, setCatFilter] = useState<string>('all')

  const filtered = catFilter === 'all' ? circleGoals : circleGoals.filter(g => g.category === catFilter)
  const activeCats = [...new Set(circleGoals.map(g => g.category).filter(Boolean))] as string[]

  if (circleGoals.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ fontSize: 40, marginBottom: 14 }}>🎯</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No circle goals yet</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>Circle members&apos; active goals will appear here.</p>
      </div>
    )
  }

  return (
    <>
      {/* Category filter pills */}
      {activeCats.length > 1 && (
        <div style={{ margin: '0 -20px', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', padding: '0 20px 4px' }}>
            <button onClick={() => setCatFilter('all')} style={{ whiteSpace: 'nowrap', padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Satoshi,sans-serif', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', background: catFilter === 'all' ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)', color: catFilter === 'all' ? '#D4AF37' : 'rgba(255,255,255,0.55)', border: catFilter === 'all' ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255,255,255,0.09)' }}>
              All
            </button>
            {GOAL_CAT_KEYS.filter(k => activeCats.includes(k)).map(cat => {
              const color = catColor(cat)
              const active = catFilter === cat
              return (
                <button key={cat} onClick={() => setCatFilter(cat)} style={{ whiteSpace: 'nowrap', padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Satoshi,sans-serif', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', background: active ? `${color}18` : 'rgba(255,255,255,0.03)', color: active ? color : 'rgba(255,255,255,0.55)', border: active ? `1px solid ${color}44` : '1px solid rgba(255,255,255,0.09)' }}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)' }}>No {catFilter} goals in your circle</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(goal => (
            <GoalFeedCard key={goal.id} goal={goal} userId={userId} />
          ))}
        </div>
      )}
    </>
  )
}

function GoalFeedCard({ goal, userId }: { goal: CircleGoal; userId: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const accent = catColor(goal.category)
  const isOwn = goal.user_id === userId
  const displayName = isOwn ? 'You' : (goal.author_name ?? 'Member')
  const av = isOwn ? 'ME' : initials(displayName)
  const grad = isOwn ? 'linear-gradient(135deg,#D4AF37,#f97316)' : avatarGrad(goal.user_id)

  const [localReactions, setLocalReactions] = useState(goal.reactions)
  const [myReactions, setMyReactions] = useState(goal.my_reactions)
  const [showComments, setShowComments] = useState(false)
  const [localComments, setLocalComments] = useState<CircleGoalComment[]>(goal.comments)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleReaction(type: 'fire' | 'believe' | 'cheer') {
    const wasActive = myReactions[type]
    setMyReactions(prev => ({ ...prev, [type]: !wasActive }))
    setLocalReactions(prev => ({ ...prev, [type]: wasActive ? prev[type] - 1 : prev[type] + 1 }))
    startTransition(async () => { await toggleGoalReaction(goal.id, type); router.refresh() })
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    const optimistic: CircleGoalComment = {
      id: 'temp-' + Date.now(), user_id: userId,
      author_name: 'You', content: commentText.trim(), created_at: new Date().toISOString()
    }
    setLocalComments(prev => [...prev, optimistic])
    setCommentText('')
    const result = await addGoalComment(goal.id, optimistic.content)
    if (result.error) {
      setLocalComments(prev => prev.filter(c => c.id !== optimistic.id))
    } else {
      startTransition(() => { router.refresh() })
    }
    setSubmitting(false)
  }

  function handleDeleteComment(commentId: string) {
    setLocalComments(prev => prev.filter(c => c.id !== commentId))
    startTransition(async () => { await removeGoalComment(commentId); router.refresh() })
  }

  const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000) : null
  const prog = Math.max(0, Math.min(100, Math.round(goal.progress)))

  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      {/* Category accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg,${accent},${accent}44)` }} />

      <div style={{ padding: 18 }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {isOwn
            ? <div style={{ width: 36, height: 36, borderRadius: 10, background: grad, color: '#FFF', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{av}</div>
            : <Link href={`/profile/${goal.user_id}`} style={{ textDecoration: 'none', flexShrink: 0 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: grad, color: '#FFF', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{av}</div></Link>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              {isOwn
                ? <span style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF' }}>{displayName}</span>
                : <Link href={`/profile/${goal.user_id}`} style={{ textDecoration: 'none' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF' }}>{displayName}</span></Link>
              }
              {goal.category && (
                <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 6, padding: '1px 7px' }}>
                  {goal.category}
                </span>
              )}
            </div>
            {daysLeft !== null && (
              <p style={{ fontSize: 10, color: daysLeft < 7 ? '#f87171' : 'rgba(255,255,255,0.42)' }}>
                {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
              </p>
            )}
          </div>
        </div>

        {/* Title */}
        <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.4, marginBottom: 12 }}>{goal.title}</p>

        {/* Progress bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', fontWeight: 600 }}>PROGRESS</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: accent }}>{prog}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${prog}%`, borderRadius: 999, background: `linear-gradient(90deg,${accent},${accent}99)`, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Reactions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <Reaction emoji="🔥" count={localReactions.fire}    active={myReactions.fire}    activeColor="#FF9500" activeBg="rgba(255,149,0,0.12)"   activeBorder="rgba(255,149,0,0.3)"   onClick={() => handleReaction('fire')} />
          <Reaction emoji="⚡" count={localReactions.believe} active={myReactions.believe} activeColor="#a78bfa" activeBg="rgba(139,92,246,0.12)"  activeBorder="rgba(139,92,246,0.3)"  onClick={() => handleReaction('believe')} />
          <Reaction emoji="🎉" count={localReactions.cheer}   active={myReactions.cheer}   activeColor="#4ade80" activeBg="rgba(34,197,94,0.12)"   activeBorder="rgba(34,197,94,0.3)"   onClick={() => handleReaction('cheer')} />
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
            <span style={{ fontWeight: 700 }}>{localComments.length > 0 ? localComments.length : 'Reply'}</span>
          </button>
        </div>

        {/* Comment thread */}
        {showComments && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {localComments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                {localComments.map(comment => {
                  const isMyComment = comment.user_id === userId
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
    </div>
  )
}
