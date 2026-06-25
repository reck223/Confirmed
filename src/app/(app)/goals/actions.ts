'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createGoal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any).insert({
    user_id: user.id,
    title,
    category: formData.get('category') as string || null,
    why_it_matters: (formData.get('why') as string)?.trim() || null,
    next_action: (formData.get('next_action') as string)?.trim() || null,
    deadline: (formData.get('deadline') as string) || null,
    visibility: (formData.get('visibility') as string) || 'circle',
  })

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}

export async function updateGoalProgress(goalId: string, progress: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .update({ progress, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}

export async function completeGoal(goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .update({ status: 'complete', progress: 100, completed_date: new Date().toISOString().split('T')[0] })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}
