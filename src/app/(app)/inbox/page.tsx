import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

type RawMessage = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string; read_at: string | null }

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: msgRows } = await (supabase.from('messages') as any)
    .select('id, sender_id, recipient_id, content, created_at, read_at')
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const messages = (msgRows ?? []) as RawMessage[]

  const convMap = new Map<string, { msg: RawMessage; unread: number }>()
  for (const msg of messages) {
    const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
    if (!convMap.has(otherId)) convMap.set(otherId, { msg, unread: 0 })
    if (msg.recipient_id === user.id && !msg.read_at) convMap.get(otherId)!.unread++
  }

  const conversations = [...convMap.entries()]
  const totalUnread = conversations.reduce((s, [, { unread }]) => s + unread, 0)

  const otherIds = conversations.map(([id]) => id)
  const { data: profileRows } = otherIds.length
    ? await supabase.from('profiles').select('id, full_name, username').in('id', otherIds)
    : { data: [] }
  const profileMap = Object.fromEntries(
    ((profileRows ?? []) as { id: string; full_name: string | null; username: string | null }[]).map(p => [p.id, p])
  )

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 100 }} className="view-panel">

      {/* Header */}
      <div style={{ padding: '28px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1 }}>Inbox</h2>
          {totalUnread > 0
            ? <p style={{ fontSize: 12, color: '#D4AF37', fontWeight: 600, marginTop: 4 }}>{totalUnread} unread</p>
            : <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>All caught up</p>
          }
        </div>
        {/* Compose button - links to circle discover to find someone to message */}
        <Link href="/circle" style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#D4AF37,#9A7010)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </Link>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input placeholder="Search messages…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#EFEFEF', fontFamily: 'Satoshi,sans-serif' }} />
        </div>
      </div>

      {/* Conversation list */}
      <div style={{ padding: '12px 0' }}>
        {conversations.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>No messages yet</p>
            <p style={{ fontSize: 13, color: '#555', fontWeight: 300 }}>Your circle members are just a message away.</p>
          </div>
        ) : (
          conversations.map(([otherId, { msg, unread }]) => {
            const profile = profileMap[otherId]
            const name = profile?.full_name ?? 'Member'
            const isMine = msg.sender_id === user.id
            const preview = (isMine ? 'You: ' : '') + msg.content

            return (
              <Link key={otherId} href={`/inbox/${otherId}`} style={{ textDecoration: 'none', width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, background: unread > 0 ? 'rgba(212,175,55,0.02)' : 'none', borderLeft: `2px solid ${unread > 0 ? 'rgba(212,175,55,0.5)' : 'transparent'}`, paddingLeft: unread > 0 ? 18 : 20, transition: 'background 0.12s' }}>
                {/* Avatar with online dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: avatarGrad(otherId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#FFF' }}>
                    {initials(name)}
                  </div>
                  <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: '2px solid #080808' }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#EFEFEF' }}>{name}</span>
                    <span style={{ fontSize: 11, color: '#555' }}>{timeAgo(msg.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 12.5, color: '#777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220, fontWeight: unread > 0 ? 500 : 300 }}>
                      {preview.length > 55 ? preview.slice(0, 55) + '…' : preview}
                    </p>
                    {unread > 0 && (
                      <span style={{ flexShrink: 0, minWidth: 20, height: 20, borderRadius: 999, background: 'linear-gradient(135deg,#D4AF37,#9A7010)', color: '#000', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
