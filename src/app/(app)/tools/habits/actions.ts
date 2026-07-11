'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createHabit(name: string, icon: string, color: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: last } = await (supabase.from('habits') as any)
    .select('sort_order').eq('user_id', user.id)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('habits') as any).insert({
    user_id: user.id, name, icon, color,
    sort_order: ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1,
  })
  revalidatePath('/tools/habits')
  revalidatePath('/tools')
}

export async function deleteHabit(habitId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('habits') as any).delete().eq('id', habitId).eq('user_id', user.id)
  revalidatePath('/tools/habits')
  revalidatePath('/tools')
}

export async function toggleHabit(habitId: string, date: string, isDone: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (isDone) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('habit_completions') as any)
      .delete().eq('habit_id', habitId).eq('user_id', user.id).eq('completed_date', date)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('habit_completions') as any)
      .insert({ habit_id: habitId, user_id: user.id, completed_date: date })
  }
  revalidatePath('/tools/habits')
  revalidatePath('/tools')
}
