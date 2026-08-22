'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { XP_EVENTS } from '@/lib/xp'
import { awardXP } from '@/lib/xp-server'

export async function claimDailyChallenge(challengeId: string): Promise<
  | { error: string }
  | { success: true; alreadyClaimed: boolean; newXP: number; newLevel: number; leveledUp: boolean }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const today = new Date().toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('daily_challenge_completions') as any)
    .insert({ user_id: user.id, challenge_id: challengeId, date: today })

  if (error) {
    // Unique violation on (user_id, date) — already claimed today, not a real error.
    if (error.code === '23505') return { success: true, alreadyClaimed: true, newXP: 0, newLevel: 0, leveledUp: false }
    return { error: error.message }
  }

  const xpResult = await awardXP(user.id, XP_EVENTS.DAILY_CHALLENGE)
  revalidatePath('/home')
  return { success: true, alreadyClaimed: false, ...xpResult }
}
