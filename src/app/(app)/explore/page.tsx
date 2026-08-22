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

  const goalIds = ((publicGoalsRaw ?? []) as { id: string }[]).map(g => g.id)

  // Profiles of goal authors + watcher data + recommendation-adopt counts + social (parallel)
  const [{ data: profilesRaw }, { data: watchersRaw }, { data: myWatchesRaw }, { data: adoptsRaw }, { data: reactionRowsRaw }, { data: commentRowsRaw }] = await Promise.all([
    authorIds.length > 0
      ? supabase.from('profiles').select('id, full_name, avatar_url, xp, level').in('id', authorIds)
      : Promise.resolve({ data: [] }),
    goalIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from('goal_watchers') as any).select('goal_id').in('goal_id', goalIds)
      : Promise.resolve({ data: [] }),
    goalIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from('goal_watchers') as any).select('goal_id').in('goal_id', goalIds).eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    goalIds.length > 0
      // "N people started this because of you" — count adopted recommendations per source goal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from('goal_recommendations') as any).select('source_goal_id').in('source_goal_id', goalIds).eq('status', 'adopted')
      : Promise.resolve({ data: [] }),
    goalIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from('goal_reactions') as any).select('goal_id, user_id, type').in('goal_id', goalIds)
      : Promise.resolve({ data: [] }),
    goalIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from('goal_comments') as any).select('id, goal_id, user_id, content, created_at').in('goal_id', goalIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const reactionRows = (reactionRowsRaw ?? []) as { goal_id: string; user_id: string; type: string }[]
  const commentRows = (commentRowsRaw ?? []) as { id: string; goal_id: string; user_id: string; content: string; created_at: string }[]
  const commentAuthorIds = [...new Set(commentRows.map(c => c.user_id))]
  const { data: commentAuthorRows } = commentAuthorIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', commentAuthorIds)
    : { data: [] }
  const commentAuthorMap = new Map<string, string | null>(
    ((commentAuthorRows ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name])
  )

  type RawGoal = { id: string; title: string; category: string | null; progress: number; user_id: string; created_at: string }
  type RawProfile = { id: string; full_name: string | null; avatar_url: string | null; xp: number; level: number }

  const profileMap = new Map<string, RawProfile>(
    ((profilesRaw ?? []) as RawProfile[]).map(p => [p.id, p])
  )

  const watcherCountMap = new Map<string, number>()
  for (const w of (watchersRaw ?? []) as { goal_id: string }[]) {
    watcherCountMap.set(w.goal_id, (watcherCountMap.get(w.goal_id) ?? 0) + 1)
  }
  const myWatchSet = new Set(((myWatchesRaw ?? []) as { goal_id: string }[]).map(w => w.goal_id))

  const adoptedCountMap = new Map<string, number>()
  for (const a of (adoptsRaw ?? []) as { source_goal_id: string | null }[]) {
    if (!a.source_goal_id) continue
    adoptedCountMap.set(a.source_goal_id, (adoptedCountMap.get(a.source_goal_id) ?? 0) + 1)
  }

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
    const gr = reactionRows.filter(r => r.goal_id === g.id)
    const gc = commentRows.filter(c => c.goal_id === g.id).map(c => ({
      id: c.id, user_id: c.user_id, content: c.content, created_at: c.created_at,
      author_name: commentAuthorMap.get(c.user_id) ?? null,
    }))
    return {
      id: g.id, title: g.title, category: g.category, progress: g.progress,
      created_at: g.created_at, user_id: g.user_id,
      authorName: p?.full_name ?? null, authorAvatar: p?.avatar_url ?? null, authorLevel: p?.level ?? 1,
      watcherCount: watcherCountMap.get(g.id) ?? 0,
      isWatching: myWatchSet.has(g.id),
      adoptedCount: adoptedCountMap.get(g.id) ?? 0,
      reactions: {
        fire: gr.filter(r => r.type === 'fire').length,
        believe: gr.filter(r => r.type === 'believe').length,
        cheer: gr.filter(r => r.type === 'cheer').length,
      },
      myReactions: {
        fire: gr.some(r => r.user_id === user.id && r.type === 'fire'),
        believe: gr.some(r => r.user_id === user.id && r.type === 'believe'),
        cheer: gr.some(r => r.user_id === user.id && r.type === 'cheer'),
      },
      comments: gc,
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
