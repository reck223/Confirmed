import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { InboxClient } from './InboxClient'

type RawMessage = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string; read_at: string | null }
type RawNotif = { id: string; type: string; from_user_id: string | null; data: Record<string, string> | null; read_at: string | null; created_at: string }

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [msgResult, notifResult, memberResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('messages') as any)
      .select('id, sender_id, recipient_id, content, created_at, read_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('notifications') as any)
      .select('id, type, from_user_id, data, read_at, created_at')
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('circle_members').select('circle_id').eq('user_id', user.id),
  ])

  const messages = (msgResult.data ?? []) as RawMessage[]
  const notifications = (notifResult.data ?? []) as RawNotif[]
  // Circle IDs the user is already in — used to mark invite buttons as joined
  const myCircleCodes = ((memberResult.data ?? []) as { circle_id: string }[]).map(r => r.circle_id)

  // Build conversation list
  const convMap = new Map<string, { msg: RawMessage; unread: number }>()
  for (const msg of messages) {
    const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
    if (!convMap.has(otherId)) convMap.set(otherId, { msg, unread: 0 })
    if (msg.recipient_id === user.id && !msg.read_at) convMap.get(otherId)!.unread++
  }
  const conversations = [...convMap.entries()]

  const otherIds = conversations.map(([id]) => id)
  const { data: profileRows } = otherIds.length
    ? await supabase.from('profiles').select('id, full_name, username').in('id', otherIds)
    : { data: [] }
  const profileMap = Object.fromEntries(
    ((profileRows ?? []) as { id: string; full_name: string | null; username: string | null }[]).map(p => [p.id, p])
  )

  // Fetch from_user profiles for notifications
  const fromIds = [...new Set(notifications.map(n => n.from_user_id).filter(Boolean))] as string[]
  const { data: fromProfiles } = fromIds.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', fromIds)
    : { data: [] }
  const fromProfileMap = Object.fromEntries(
    ((fromProfiles ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]).map(p => [p.id, { name: p.full_name, avatar: p.avatar_url }])
  )

  const unreadNotifs = notifications.filter(n => !n.read_at).length

  return (
    <InboxClient
      conversations={conversations.map(([otherId, { msg, unread }]) => ({
        otherId,
        profile: profileMap[otherId] ?? null,
        lastMessage: msg,
        unread,
        isMine: msg.sender_id === user.id,
      }))}
      notifications={notifications.map(n => ({
        ...n,
        data: n.data ?? {},
        from_name: n.from_user_id ? (fromProfileMap[n.from_user_id]?.name ?? null) : null,
        from_avatar: n.from_user_id ? (fromProfileMap[n.from_user_id]?.avatar ?? null) : null,
      }))}
      currentUserId={user.id}
      unreadNotifs={unreadNotifs}
      myCircleCodes={myCircleCodes}
    />
  )
}
