'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function watchGoal(goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goal_watchers') as any)
    .insert({ goal_id: goalId, user_id: user.id })

  if (error && error.code !== '23505') return { error: error.message }
  revalidatePath('/explore')
  return { success: true }
}

export async function unwatchGoal(goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goal_watchers') as any)
    .delete()
    .eq('goal_id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/explore')
  return { success: true }
}
