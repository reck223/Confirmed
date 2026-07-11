'use server'
import { createClient } from '@/lib/supabase/server'
import { getLevelInfo } from '@/lib/xp'

export async function awardXP(userId: string, amount: number): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('xp, level')
    .eq('id', userId)
    .single()

  const currentXP    = (profile as { xp: number; level: number } | null)?.xp    ?? 0
  const currentLevel = (profile as { xp: number; level: number } | null)?.level ?? 1
  const newXP        = currentXP + amount
  const newLevel     = getLevelInfo(newXP).level

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any)
    .update({ xp: newXP, level: newLevel })
    .eq('id', userId)

  return { newXP, newLevel, leveledUp: newLevel > currentLevel }
}
