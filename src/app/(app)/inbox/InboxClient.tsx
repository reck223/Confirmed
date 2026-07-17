'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { markAllNotifsRead } from './actions'
import { acceptConnection, declineConnection } from '@/app/(app)/profile/connection-actions'
import { acceptCircleInvite } from '@/app/(app)/circle/actions'

type Conversation = {
  otherId: string
  profile: { id: string; full_name: string | null; username: string | null } | null
  lastMessage: { id: string; sender_id: string; content: string; created_at: string }
  unread: number
  isMine: boolean
}

type Notification = {
  id: string; type: string; from_user_id: string | null; from_name: string | null; from_avatar: string | null
  data: Record<string, string>; read_at: string | null; created_at: string; ref_id?: string | null
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
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const NOTIF_META: Record<string, { emoji: string; color: string; label: (n: Notification) => string; sub: (n: Notification) => string; href: (n: Notification) => string }> = {
  follow: {
    emoji: '👤',
    color: '#a78bfa',
    label: n => `${n.data.follower_name ?? n.from_name ?? 'Someone'} followed you`,
    sub: () => 'Tap to view their profile',
    href: n => n.from_user_id ? `/profile/${n.from_user_id}` : '/circle',
  },
  circle_join: {
    emoji: '✦',
    color: '#D4AF37',
    label: n => `${n.data.joiner_name ?? n.from_name ?? 'Someone'} joined ${n.data.circle_name ?? 'your circle'}`,
    sub: () => 'Your circle is growing',
    href: n => n.from_user_id ? `/profile/${n.from_user_id}` : '/circle',
  },
  message: {
    emoji: '💬',
    color: '#38bdf8',
    label: n => `${n.data.sender_name ?? n.from_name ?? 'Someone'} sent you a message`,
    sub: n => n.data.preview ?? '',
    href: n => n.from_user_id ? `/inbox/${n.from_user_id}` : '/inbox',
  },
  reaction: {
    emoji: '🔥',
    color: '#f97316',
    label: n => `${n.data.reactor_name ?? n.from_name ?? 'Someone'} reacted ${n.data.reaction_type === 'fire' ? '🔥' : n.data.reaction_type === 'strong' ? '💪' : '🤝'} to your post`,
    sub: n => n.data.post_preview ? `"${n.data.post_preview}${n.data.post_preview.length >= 60 ? '…' : ''}"` : '',
    href: () => '/circle',
  },
  assessment: {
    emoji: '📋',
    color: '#a78bfa',
    label: n => `${n.data.author_name ?? n.from_name ?? 'Someone'} posted their weekly reflection`,
    sub: n => n.data.week_title ? `"${n.data.week_title}"` : 'Tap to read it',
    href: n => n.from_user_id ? `/assess/${n.from_user_id}` : '/circle',
  },
  comment: {
    emoji: '💬',
    color: '#38bdf8',
    label: n => `${n.data.commenter_name ?? n.from_name ?? 'Someone'} commented on your reflection`,
    sub: n => n.data.preview ? `"${n.data.preview}${n.data.preview.length >= 60 ? '…' : ''}"` : '',
    href: n => n.from_user_id ? `/assess/${n.from_user_id}` : '/assess',
  },
  goal_complete: {
    emoji: '🏆',
    color: '#D4AF37',
    label: n => `${n.data.name ?? n.from_name ?? 'Someone'} completed a goal`,
    sub: n => n.data.goal_title ? `"${n.data.goal_title}"` : '',
    href: n => n.from_user_id ? `/profile/${n.from_user_id}` : '/circle',
  },
  new_session: {
    emoji: '⚡',
    color: '#a78bfa',
    label: n => `${n.data.creator_name ?? n.from_name ?? 'Your circle'} started a new session`,
    sub: n => n.data.session_title ? `"${n.data.session_title}"` : 'Tap to join',
    href: () => '/circle',
  },
  win_posted: {
    emoji: '🔥',
    color: '#f97316',
    label: n => `${n.data.poster_name ?? n.from_name ?? 'Someone'} shared a ${n.data.post_type === 'lesson' ? 'lesson' : n.data.post_type === 'milestone' ? 'milestone' : 'win'}`,
    sub: n => n.data.preview ? `"${n.data.preview}${n.data.preview.length >= 60 ? '…' : ''}"` : '',
    href: () => '/circle',
  },
  goal_reaction: {
    emoji: '⚡',
    color: '#a78bfa',
    label: n => `${n.from_name ?? 'Someone'} reacted to your goal`,
    sub: n => n.data.goal_title ? `"${n.data.goal_title}"` : '',
    href: () => '/goals',
  },
  goal_comment: {
    emoji: '💬',
    color: '#38bdf8',
    label: n => `${n.from_name ?? 'Someone'} commented on your goal`,
    sub: n => n.data.preview ? `"${n.data.preview}"` : '',
    href: () => '/goals',
  },
  witness: {
    emoji: '👁',
    color: '#a78bfa',
    label: n => `${n.data.author_name ?? n.from_name ?? 'Someone'} is witnessing your commitment`,
    sub: () => 'They see you — keep going',
    href: () => '/circle',
  },
  connection_request: {
    emoji: '🤝',
    color: '#38bdf8',
    label: n => `${n.data.author_name ?? n.from_name ?? 'Someone'} wants to Connect with you`,
    sub: n => n.data.title ? `"${n.data.title}" · ${n.data.duration_days}d` : '',
    href: n => n.from_user_id ? `/profile/${n.from_user_id}` : '/inbox',
  },
  connection_accepted: {
    emoji: '✅',
    color: '#4ade80',
    label: n => `${n.data.author_name ?? n.from_name ?? 'Someone'} accepted your Connection`,
    sub: n => n.data.message ?? '',
    href: n => n.from_user_id ? `/profile/${n.from_user_id}` : '/inbox',
  },
  circle_invite: {
    emoji: '✦',
    color: '#D4AF37',
    label: n => `${n.data.inviter_name ?? n.from_name ?? 'Someone'} invited you to their circle`,
    sub: n => n.data.circle_name ? `"${n.data.circle_name}"` : 'Tap to join',
    href: () => '/circle',
  },
}

export function InboxClient({ conversations, notifications, currentUserId: _currentUserId, unreadNotifs, myCircleCodes = [] }: {
  conversations: Conversation[]
  notifications: Notification[]
  currentUserId: string
  unreadNotifs: number
  myCircleCodes?: string[]
}) {
  const [tab, setTab] = useState<'messages' | 'activity'>('messages')
  const [, startTransition] = useTransition()
  const router = useRouter()
  const [handledConnections, setHandledConnections] = useState<Record<string, 'accepted' | 'declined'>>({})
  const [handledInvites, setHandledInvites] = useState<Record<string, 'joining' | 'joined'>>({})

  const totalUnreadMessages = conversations.reduce((s, c) => s + c.unread, 0)

  function handleMarkRead() {
    startTransition(async () => {
      await markAllNotifsRead()
      router.refresh()
    })
  }

  function handleAcceptConnection(connectionId: string, notifId: string) {
    setHandledConnections(prev => ({ ...prev, [notifId]: 'accepted' }))
    startTransition(async () => {
      await acceptConnection(connectionId)
      router.refresh()
    })
  }

  function handleDeclineConnection(connectionId: string, notifId: string) {
    setHandledConnections(prev => ({ ...prev, [notifId]: 'declined' }))
    startTransition(async () => {
      await declineConnection(connectionId)
      router.refresh()
    })
  }

  function handleJoinCircle(code: string, notifId: string) {
    setHandledInvites(prev => ({ ...prev, [notifId]: 'joining' }))
    startTransition(async () => {
      await acceptCircleInvite(code)
      router.push('/circle')
    })
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 100 }} className="view-panel">
      {/* Header */}
      <div style={{ padding: '28px 20px 0' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 16 }}>Inbox</h2>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
          <button onClick={() => setTab('messages')} style={{ flex: 1, padding: '10px', borderRadius: 9, fontFamily: 'Satoshi,sans-serif', cursor: 'pointer', fontWeight: 700, fontSize: 13, border: 'none', transition: 'all 0.15s', background: tab === 'messages' ? 'rgba(255,255,255,0.07)' : 'transparent', color: tab === 'messages' ? '#EFEFEF' : 'rgba(255,255,255,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            💬 Messages
            {totalUnreadMessages > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: '#38bdf8', color: '#000', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{totalUnreadMessages}</span>}
          </button>
          <button onClick={() => { setTab('activity'); if (unreadNotifs > 0) handleMarkRead() }} style={{ flex: 1, padding: '10px', borderRadius: 9, fontFamily: 'Satoshi,sans-serif', cursor: 'pointer', fontWeight: 700, fontSize: 13, border: 'none', transition: 'all 0.15s', background: tab === 'activity' ? 'rgba(255,255,255,0.07)' : 'transparent', color: tab === 'activity' ? '#EFEFEF' : 'rgba(255,255,255,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            ✦ Activity
            {unreadNotifs > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: '#D4AF37', color: '#000', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{unreadNotifs}</span>}
          </button>
        </div>
      </div>

      {/* Messages tab */}
      {tab === 'messages' && (
        <div>
          {/* Compose */}
          <div style={{ padding: '0 20px 12px', display: 'flex', justifyContent: 'flex-end' }}>
            <Link href="/circle?tab=discover" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#D4AF37,#9A7010)', textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#000' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              New Message
            </Link>
          </div>

          {conversations.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>💬</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No messages yet</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300, marginBottom: 20 }}>Your circle members are just a message away.</p>
              <Link href="/circle" style={{ color: '#D4AF37', fontWeight: 700, fontSize: 13 }}>Go to Circle →</Link>
            </div>
          ) : (
            conversations.map(({ otherId, profile, lastMessage, unread, isMine }) => {
              const name = profile?.full_name ?? 'Member'
              const preview = (isMine ? 'You: ' : '') + lastMessage.content
              return (
                <Link key={otherId} href={`/inbox/${otherId}`} style={{ textDecoration: 'none', width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, background: unread > 0 ? 'rgba(56,189,248,0.02)' : 'none', borderLeft: `2px solid ${unread > 0 ? 'rgba(56,189,248,0.4)' : 'transparent'}`, transition: 'background 0.12s' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 50, height: 50, borderRadius: '50%', background: avatarGrad(otherId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#FFF' }}>{initials(name)}</div>
                    <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: '2px solid #080808' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#EFEFEF' }}>{name}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{timeAgo(lastMessage.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220, fontWeight: unread > 0 ? 500 : 300 }}>
                        {preview.length > 55 ? preview.slice(0, 55) + '…' : preview}
                      </p>
                      {unread > 0 && <span style={{ flexShrink: 0, minWidth: 20, height: 20, borderRadius: 999, background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', color: '#000', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{unread}</span>}
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      )}

      {/* Activity tab */}
      {tab === 'activity' && (
        <div style={{ padding: '0 0 20px' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>✦</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No activity yet</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>When someone follows you, joins your circle, or reacts to your posts — it shows up here.</p>
            </div>
          ) : (
            notifications.map(notif => {
              const meta = NOTIF_META[notif.type]
              if (!meta) return null
              const isUnread = !notif.read_at

              // Connection requests get inline accept/decline buttons
              if (notif.type === 'connection_request') {
                const connectionId = notif.data.connection_id
                const handled = connectionId ? handledConnections[notif.id] : null
                return (
                  <div key={notif.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 20px', background: isUnread ? `${meta.color}0a` : 'none', borderLeft: `2px solid ${isUnread ? meta.color + '60' : 'transparent'}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 14, background: `${meta.color}18`, border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {meta.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                        <p style={{ fontSize: 13.5, fontWeight: isUnread ? 600 : 400, color: '#EFEFEF', lineHeight: 1.4, marginBottom: 3 }}>{meta.label(notif)}</p>
                        {notif.data.title && <p style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600, lineHeight: 1.4 }}>{notif.data.title}</p>}
                        {notif.data.commitment && <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.5, marginTop: 3 }}>{notif.data.commitment}</p>}
                        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{timeAgo(notif.created_at)}</p>
                      </div>
                    </div>
                    {connectionId && !handled && (
                      <div style={{ display: 'flex', gap: 8, paddingLeft: 56 }}>
                        <button
                          onClick={() => handleAcceptConnection(connectionId, notif.id)}
                          style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineConnection(connectionId, notif.id)}
                          style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {handled && (
                      <p style={{ paddingLeft: 56, fontSize: 12, color: handled === 'accepted' ? '#4ade80' : 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                        {handled === 'accepted' ? '✓ Accepted' : 'Declined'}
                      </p>
                    )}
                  </div>
                )
              }

              // Circle invites get an inline Join button
              if (notif.type === 'circle_invite') {
                const code = notif.data.circle_code
                const circleName = notif.data.circle_name
                const inviterName = notif.data.inviter_name ?? notif.from_name ?? 'Someone'
                const inviterAvatar = notif.from_avatar
                const inviterInitials = inviterName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                const alreadyIn = code ? myCircleCodes.includes(code) : false
                const inviteState = code ? handledInvites[notif.id] : null
                const isJoining = inviteState === 'joining'
                return (
                  <div key={notif.id} style={{ margin: '8px 16px', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(212,175,55,0.3)', background: 'linear-gradient(145deg,#18140A,#0F0C03)', boxShadow: isUnread ? '0 0 24px rgba(212,175,55,0.12)' : 'none' }}>
                    {/* Gold top bar */}
                    <div style={{ height: 3, background: 'linear-gradient(90deg,#D4AF37,#9A7010,#D4AF37)' }} />
                    <div style={{ padding: '16px 18px 18px' }}>
                      {/* Header row: avatar + who + time */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarGrad(notif.from_user_id ?? notif.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0, overflow: 'hidden', border: '2px solid rgba(212,175,55,0.4)' }}>
                          {inviterAvatar
                            ? <img src={inviterAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            : inviterInitials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.2 }}>{inviterName}</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{timeAgo(notif.created_at)}</p>
                        </div>
                        {isUnread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4AF37', boxShadow: '0 0 8px #D4AF37', flexShrink: 0 }} />}
                      </div>

                      {/* Invite headline */}
                      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>PRIVATE CIRCLE INVITATION</p>
                      <p style={{ fontSize: 17, fontWeight: 900, color: '#EFEFEF', lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: 4 }}>
                        You&apos;ve been personally selected to join
                      </p>
                      {circleName && (
                        <p style={{ fontSize: 22, fontWeight: 900, color: '#D4AF37', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 14, textShadow: '0 0 24px rgba(212,175,55,0.4)' }}>
                          {circleName}
                        </p>
                      )}
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.6, marginBottom: 16 }}>
                        {inviterName.split(' ')[0]} chose you. This circle is private — a small group of people committed to holding each other accountable.
                      </p>

                      {/* CTA */}
                      {alreadyIn ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                          <span style={{ fontSize: 16 }}>✓</span>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>You&apos;re in the circle</p>
                        </div>
                      ) : code && (
                        <button
                          onClick={() => handleJoinCircle(code, notif.id)}
                          disabled={isJoining}
                          style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: isJoining ? 'rgba(212,175,55,0.2)' : 'linear-gradient(135deg,#D4AF37,#9A7010)', color: isJoining ? 'rgba(255,255,255,0.4)' : '#000', fontSize: 14, fontWeight: 800, cursor: isJoining ? 'default' : 'pointer', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.02em' }}
                        >
                          {isJoining ? 'Joining…' : '✦ Accept Invitation'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              }

              const href = meta.href(notif)
              return (
                <Link key={notif.id} href={href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px', background: isUnread ? `${meta.color}0a` : 'none', borderLeft: `2px solid ${isUnread ? meta.color + '60' : 'transparent'}`, transition: 'background 0.12s' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: `${meta.color}18`, border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {meta.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                    <p style={{ fontSize: 13.5, fontWeight: isUnread ? 600 : 400, color: '#EFEFEF', lineHeight: 1.4, marginBottom: 3 }}>{meta.label(notif)}</p>
                    {meta.sub(notif) && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.sub(notif)}</p>}
                    <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{timeAgo(notif.created_at)}</p>
                  </div>
                  {isUnread && <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 6, boxShadow: `0 0 6px ${meta.color}` }} />}
                </Link>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
