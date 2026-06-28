'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
