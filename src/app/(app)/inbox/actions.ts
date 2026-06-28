'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessage(recipientId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  if (!content.trim()) return { error: 'Message cannot be empty' }
  if (user.id === recipientId) return { error: 'Cannot message yourself' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('messages') as any).insert({
    sender_id: user.id,
    recipient_id: recipientId,
    content: content.trim(),
  })
  if (error) return { error: error.message }

  revalidatePath('/inbox')
  revalidatePath(`/inbox/${recipientId}`)
  return { success: true }
}

export async function markThreadRead(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('messages') as any)
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', otherUserId)
    .eq('recipient_id', user.id)
    .is('read_at', null)

  revalidatePath('/inbox')
  revalidatePath(`/inbox/${otherUserId}`)
}
