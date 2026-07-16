import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExploreClient } from './ExploreClient'

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // Public active goals (not mine, not letters)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: publicGoalsRaw } = await (supabase.from('goals') as any)
    .select('id, title, category, progress, user_id, created_at')
    .eq('visibility', 'public')
    .eq('status', 'active')
    .neq('user_id', user.id)
    .neq('goal_type', 'letter')
    .order('created_at', { ascending: false })
    .limit(80)

  const authorIds = [...new Set(((publicGoalsRaw ?? []) as { user_id: string }[]).map(g => g.user_id))]

  // Profiles of goal authors
  const { data: profilesRaw } = authorIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, avatar_url, xp, level').in('id', authorIds)
    : { data: [] }

  type RawGoal = { id: string; title: string; category: string | null; progress: number; user_id: string; created_at: string }
  type RawProfile = { id: string; full_name: string | null; avatar_url: string | null; xp: number; level: number }

  const profileMap = new Map<string, RawProfile>(
    ((profilesRaw ?? []) as RawProfile[]).map(p => [p.id, p])
  )

  // Build builders (grouped by user, sorted by XP)
  const builderMap = new Map<string, {
    id: string; full_name: string | null; avatar_url: string | null
    xp: number; level: number; goalCategories: string[]; goalCount: number
  }>()
  for (const goal of (publicGoalsRaw ?? []) as RawGoal[]) {
    if (!builderMap.has(goal.user_id)) {
      const p = profileMap.get(goal.user_id)
      builderMap.set(goal.user_id, {
        id: goal.user_id, full_name: p?.full_name ?? null, avatar_url: p?.avatar_url ?? null,
        xp: p?.xp ?? 0, level: p?.level ?? 1, goalCategories: [], goalCount: 0,
      })
    }
    const b = builderMap.get(goal.user_id)!
    b.goalCount++
    if (goal.category && !b.goalCategories.includes(goal.category)) b.goalCategories.push(goal.category)
  }
  const builders = [...builderMap.values()].sort((a, b) => b.xp - a.xp)

  // Build goals list with author info
  const goals = ((publicGoalsRaw ?? []) as RawGoal[]).map(g => {
    const p = profileMap.get(g.user_id)
    return {
      id: g.id, title: g.title, category: g.category, progress: g.progress,
      created_at: g.created_at, user_id: g.user_id,
      authorName: p?.full_name ?? null, authorAvatar: p?.avatar_url ?? null, authorLevel: p?.level ?? 1,
    }
  })

  return (
    <ExploreClient
      builders={builders}
      goals={goals}
      currentUserId={user.id}
    />
  )
}
