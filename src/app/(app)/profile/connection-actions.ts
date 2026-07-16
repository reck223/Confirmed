'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function proposeConnection(
  receiverId: string,
  title: string,
  commitment: string,
  durationDays: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.id === receiverId) return { error: 'Cannot connect with yourself' }

  const startDate = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + durationDays)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newConn, error } = await (supabase.from('connections') as any).insert({
    proposer_id: user.id,
    receiver_id: receiverId,
    title: title.trim(),
    commitment: commitment.trim(),
    duration_days: durationDays,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    status: 'pending',
  }).select('id').single()

  if (error) return { error: error.message }
  const connectionId = (newConn as { id: string }).id

  const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const myName = (myProfile as { full_name: string | null } | null)?.full_name ?? 'Someone'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('notifications') as any).insert({
    to_user_id: receiverId,
    from_user_id: user.id,
    type: 'connection_request',
    data: {
      author_name: myName,
      title,
      commitment,
      duration_days: String(durationDays),
      connection_id: connectionId,
      message: `${myName} wants to make a Connection with you: "${title}"`,
    },
  })

  revalidatePath(`/profile/${receiverId}`)
  return { success: true }
}

export async function acceptConnection(connectionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conn } = await (supabase.from('connections') as any)
    .select('proposer_id, title')
    .eq('id', connectionId)
    .eq('receiver_id', user.id)
    .single()

  if (!conn) return { error: 'Connection not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('connections') as any)
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', connectionId)
    .eq('receiver_id', user.id)

  if (error) return { error: error.message }

  const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const myName = (myProfile as { full_name: string | null } | null)?.full_name ?? 'Someone'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('notifications') as any).insert({
    to_user_id: (conn as { proposer_id: string; title: string }).proposer_id,
    from_user_id: user.id,
    type: 'connection_accepted',
    data: {
      author_name: myName,
      message: `${myName} accepted your Connection: "${(conn as { proposer_id: string; title: string }).title}"`,
    },
  })

  revalidatePath('/inbox')
  return { success: true }
}

export async function declineConnection(connectionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('connections') as any)
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', connectionId)
    .eq('receiver_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/inbox')
  return { success: true }
}

export async function getMyConnections() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('connections') as any)
    .select('id, proposer_id, receiver_id, title, commitment, duration_days, start_date, end_date, status, outcome_proposer, outcome_receiver')
    .or(`proposer_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })

  return (data ?? []) as {
    id: string; proposer_id: string; receiver_id: string
    title: string; commitment: string; duration_days: number
    start_date: string | null; end_date: string | null
    status: string; outcome_proposer: string | null; outcome_receiver: string | null
  }[]
}
