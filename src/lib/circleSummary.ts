import { createClient } from '@/lib/supabase/server'

// Shared by circle-coach and circle-recap — both used to take their entire
// context (members, posts, commitments, health score) as raw JSON straight
// from the client's POST body with no server-side verification, meaning a
// malicious client could hand the AI fabricated member/post data to
// generate a misleading "circle health" narrative, and it defeated the
// point of having RLS on posts/circle_members for this code path. Both
// routes now take only a circleId and re-derive everything themselves,
// gated on the requesting user actually being a member.
export type CircleSummary = {
  circleName: string
  covenant: string | null
  creatorName: string | null
  seasonDuration: number
  daysLeft: number | null
  healthScore: number
  members: { full_name: string | null; streak: number; post_count_week: number; post_count_season: number; active_goal: { title: string } | null }[]
  commitments: { full_name: string | null; text: string }[]
  recentPosts: { author_name: string | null; type: string; content: string }[]
  totalPostsSeason: number
  topContributors: string[]
}

export async function buildCircleSummary (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  circleId: string,
): Promise<CircleSummary | null> {
  // Membership check IS the authorization here — no row back means this
  // user isn't in this circle, regardless of what circleId they passed.
  const { data: membership } = await supabase
    .from('circle_members').select('circle_id').eq('circle_id', circleId).eq('user_id', userId).maybeSingle()
  if (!membership) return null

  const { data: circleRow } = await supabase
    .from('circles').select('id, name, covenant, created_by, season_duration, season_start, season_end')
    .eq('id', circleId).single()
  if (!circleRow) return null
  const circle = circleRow as {
    id: string; name: string; covenant: string | null; created_by: string
    season_duration: number | null; season_start: string | null; season_end: string | null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settingsRow } = await (supabase.from('circle_settings') as any)
    .select('covenant').eq('circle_id', circleId).maybeSingle()
  const covenant = (settingsRow?.covenant as string | null | undefined) ?? circle.covenant ?? null

  const { data: memberRows } = await supabase.from('circle_members').select('user_id').eq('circle_id', circleId)
  const memberIds = [...new Set(((memberRows ?? []) as { user_id: string }[]).map(r => r.user_id))]

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const seasonStartIso = circle.season_start ? `${circle.season_start}T00:00:00` : weekStartStr

  const [{ data: profiles }, { data: seasonPosts }, { data: commitmentRows }, { data: activeGoals }, { data: creatorProfile }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, streak').in('id', memberIds),
    supabase.from('posts').select('user_id, created_at, type, content')
      .eq('circle_id', circleId).gte('created_at', seasonStartIso).order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('circle_commitments') as any).select('user_id, text').eq('circle_id', circleId).eq('week_start', weekStartStr),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('goals') as any).select('user_id, title').in('user_id', memberIds).eq('status', 'active').neq('goal_type', 'letter'),
    supabase.from('profiles').select('full_name').eq('id', circle.created_by).maybeSingle(),
  ])

  type Profile = { id: string; full_name: string | null; streak: number }
  const profileMap = Object.fromEntries(((profiles ?? []) as Profile[]).map(p => [p.id, p]))

  type PostRow = { user_id: string; created_at: string; type: string; content: string }
  const allSeasonPosts = (seasonPosts ?? []) as PostRow[]
  const weekPosts = allSeasonPosts.filter(p => p.created_at >= weekStartStr)

  const postCountWeek: Record<string, number> = {}
  for (const p of weekPosts) postCountWeek[p.user_id] = (postCountWeek[p.user_id] ?? 0) + 1
  const postCountSeason: Record<string, number> = {}
  for (const p of allSeasonPosts) postCountSeason[p.user_id] = (postCountSeason[p.user_id] ?? 0) + 1

  const goalMap: Record<string, { title: string }> = {}
  for (const g of (activeGoals ?? []) as { user_id: string; title: string }[]) {
    if (!goalMap[g.user_id]) goalMap[g.user_id] = { title: g.title }
  }

  const members = memberIds.map(uid => ({
    full_name: profileMap[uid]?.full_name ?? null,
    streak: profileMap[uid]?.streak ?? 0,
    post_count_week: postCountWeek[uid] ?? 0,
    post_count_season: postCountSeason[uid] ?? 0,
    active_goal: goalMap[uid] ? { title: goalMap[uid].title } : null,
  }))

  const commitments = ((commitmentRows ?? []) as { user_id: string; text: string }[]).map(c => ({
    full_name: profileMap[c.user_id]?.full_name ?? null, text: c.text,
  }))

  const recentPosts = weekPosts.slice(0, 8).map(p => ({
    author_name: profileMap[p.user_id]?.full_name ?? null, type: p.type, content: p.content,
  }))

  const totalMembers = members.length
  const healthScore = totalMembers === 0 ? 100 : Math.min(100, Math.round(
    (members.filter(m => m.post_count_week > 0).length / totalMembers) * 60 +
    (new Set(commitments.map(c => c.full_name)).size / totalMembers) * 40
  ))

  const daysLeft = circle.season_end
    ? Math.max(0, Math.ceil((new Date(circle.season_end).getTime() - Date.now()) / 86_400_000))
    : null

  const topContributors = [...members]
    .sort((a, b) => b.post_count_season - a.post_count_season)
    .slice(0, 3)
    .map(m => m.full_name ?? 'Member')

  return {
    circleName: circle.name,
    covenant,
    creatorName: (creatorProfile as { full_name: string | null } | null)?.full_name ?? null,
    seasonDuration: circle.season_duration ?? 30,
    daysLeft,
    healthScore,
    members: members.map(({ full_name, streak, post_count_week, post_count_season, active_goal }) => ({ full_name, streak, post_count_week, post_count_season, active_goal })),
    commitments,
    recentPosts,
    totalPostsSeason: allSeasonPosts.length,
    topContributors,
  }
}
