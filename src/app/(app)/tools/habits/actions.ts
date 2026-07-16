'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createChallenge(
  title: string,
  description: string,
  category: string,
  durationDays: number,
  startDate: string,
  goalId: string | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('challenges') as any).insert({
    user_id: user.id, title, description: description || null,
    category, duration_days: durationDays, start_date: startDate,
    goal_id: goalId || null,
  })
  revalidatePath('/tools/habits')
  revalidatePath('/tools')
}

export async function deleteChallenge(challengeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('challenges') as any).delete().eq('id', challengeId).eq('user_id', user.id)
  revalidatePath('/tools/habits')
  revalidatePath('/tools')
}

export async function toggleChallengeLog(
  challengeId: string,
  logDate: string,
  isLogged: boolean,
  note?: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (isLogged) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('challenge_logs') as any)
      .delete()
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .eq('log_date', logDate)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('challenge_logs') as any).upsert({
      challenge_id: challengeId, user_id: user.id,
      log_date: logDate, note: note ?? null,
    })
  }
  revalidatePath('/tools/habits')
  revalidatePath('/tools')
}
