'use server'
import { createClient } from '@/lib/supabase/server'
import { type AchievementType, ACHIEVEMENT_META } from '@/lib/achievements'

export async function awardAchievement(
  userId: string,
  type: AchievementType
): Promise<{ earned: boolean; meta: typeof ACHIEVEMENT_META[AchievementType] }> {
  const supabase = await createClient()
  const meta = ACHIEVEMENT_META[type]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('achievements') as any)
    .insert({ user_id: userId, type })

  // error code 23505 = unique violation — already earned
  return { earned: !error, meta }
}

export async function checkGoalAchievements(userId: string, goalsComplete: number) {
  const earned: AchievementType[] = []
  if (goalsComplete >= 1) { const r = await awardAchievement(userId, 'first_win');  if (r.earned) earned.push('first_win') }
  if (goalsComplete >= 5) { const r = await awardAchievement(userId, 'goal_crusher'); if (r.earned) earned.push('goal_crusher') }
  return earned
}

export async function checkMilestoneAchievements(userId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase.from('goal_milestones') as any)
    .select('id', { count: 'exact', head: true })
    .eq('done', true)
    .in('goal_id',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await (supabase.from('goals') as any).select('id').eq('user_id', userId)).data?.map((g: { id: string }) => g.id) ?? []
    )

  const earned: AchievementType[] = []
  if ((count ?? 0) >= 25) {
    const r = await awardAchievement(userId, 'milestone_machine')
    if (r.earned) earned.push('milestone_machine')
  }
  return earned
}

export async function checkStreakAchievements(userId: string, streak: number) {
  const earned: AchievementType[] = []
  const thresholds: [number, AchievementType][] = [[4,'streak_4w'],[8,'streak_8w'],[12,'streak_12w'],[52,'streak_52w']]
  for (const [n, type] of thresholds) {
    if (streak >= n) { const r = await awardAchievement(userId, type); if (r.earned) earned.push(type) }
  }
  return earned
}
