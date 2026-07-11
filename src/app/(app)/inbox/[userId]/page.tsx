import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { MessageThread } from './MessageThread'
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

type RawMessage = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string; read_at: string | null }

export default async function ThreadPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: otherId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (user.id === otherId) redirect('/inbox')

  // Fetch other user's profile
  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('id, full_name, username, streak')
    .eq('id', otherId)
    .single()

  if (!otherProfile) notFound()

  const profile = otherProfile as { id: string; full_name: string | null; username: string | null; streak: number }

  // Fetch all messages where current user is sender or recipient, then filter to this thread
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: msgRows } = await (supabase.from('messages') as any)
    .select('id, sender_id, recipient_id, content, created_at, read_at')
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: true })

  const messages = ((msgRows ?? []) as RawMessage[]).filter(
    m => (m.sender_id === user.id && m.recipient_id === otherId) ||
         (m.sender_id === otherId && m.recipient_id === user.id)
  )

  // Mark unread messages in this thread as read (inline — no revalidatePath during render)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('messages') as any)
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', otherId)
    .eq('recipient_id', user.id)
    .is('read_at', null)

  const recipientName = profile.full_name ?? profile.username ?? 'Member'

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100dvh' }} className="view-panel">
      {/* Thread header */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/inbox" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.48)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </Link>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarGrad(otherId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#FFF' }}>
              {initials(profile.full_name)}
            </div>
            <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid #080808' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', lineHeight: 1 }}>{recipientName}</p>
            {profile.username && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 3 }}>@{profile.username}</p>}
          </div>
          {profile.streak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 10, background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.2)', flexShrink: 0 }}>
              <span style={{ fontSize: 12 }}>🔥</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#FF9500' }}>{profile.streak}w</span>
            </div>
          )}
        </div>
      </div>

      {/* Thread body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <MessageThread
          messages={messages.map(m => ({ id: m.id, sender_id: m.sender_id, content: m.content, created_at: m.created_at, read_at: m.read_at }))}
          currentUserId={user.id}
          recipientId={otherId}
          recipientName={recipientName}
        />
      </div>
    </div>
  )
}
