'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'

export async function addComment(assessmentId: string, field: string, content: string, ownerUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  if (!content.trim()) return { error: 'Comment cannot be empty' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('assessment_comments') as any).insert({
    assessment_id: assessmentId,
    user_id: user.id,
    field,
    content: content.trim(),
  })
  if (error) return { error: error.message }

  // Notify assessment owner (createNotification skips if commenting on own)
  const { data: commenter } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  await createNotification(ownerUserId, 'comment', {
    commenter_name: (commenter as { full_name: string | null } | null)?.full_name ?? 'Someone',
    preview: content.trim().slice(0, 60),
  })

  revalidatePath('/assess')
  revalidatePath(`/assess/${ownerUserId}`)
  return { success: true }
}

export async function deleteComment(commentId: string, ownerUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('assessment_comments') as any).delete().eq('id', commentId).eq('user_id', user.id)
  revalidatePath('/assess')
  revalidatePath(`/assess/${ownerUserId}`)
  return { success: true }
}
