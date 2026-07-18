import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CircleClient } from './CircleClient'

type PostWithMeta = {
  id: string; content: string; type: string; created_at: string
  user_id: string; circle_id: string | null
  author_name: string | null; author_avatar: string | null
  media_url: string | null; media_type: string | null
  reactions: { fire: number; strong: number; relate: number }
  my_reactions: { fire: boolean; strong: boolean; relate: boolean }
  comments: { id: string; user_id: string; author_name: string | null; author_avatar: string | null; content: string; created_at: string }[]
}

export type LeaderboardEntry = {
  user_id: string; full_name: string | null; score: number
  post_count: number; assessment_count: number; streak: number
}

export type MemberStatus = {
  user_id: string; full_name: string | null; avatar_url: string | null; username: string | null
  streak: number; energy_today: number | null
  active_goal: { title: string; progress: number; category: string | null } | null
  post_count_week: number; posted_today: boolean; score: number
}

export type CircleCommitment = {
  id: string; user_id: string; circle_id: string; week_start: string
  text: string; status: 'active' | 'done' | 'failed'
  witness_count: number; full_name: string | null; avatar_url: string | null
  username: string | null; created_at: string
}

export default async function CirclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // ── Fetch everything in parallel ──
  const [
    { data: memberRows },
    { data: followRows, error: followsError },
    { data: discoverRows },
  ] = await Promise.all([
    supabase.from('circle_members').select('circle_id').eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('follows') as any).select('following_id').eq('follower_id', user.id),
    supabase.from('profiles')
      .select('id, full_name, username, streak, tagline, goals_complete, avatar_url')
      .neq('id', user.id)
      .order('streak', { ascending: false })
      .limit(20),
  ])

  const followingIds: string[] = (followsError || !followRows)
    ? []
    : (followRows as { following_id: string }[]).map(r => r.following_id)
  const discoverProfiles = (discoverRows ?? []) as {
    id: string; full_name: string | null; username: string | null
    streak: number; tagline: string | null; goals_complete: number; avatar_url: string | null
  }[]

  // ── Circle membership ──
  const circleIds = ((memberRows ?? []) as { circle_id: string }[]).map(r => r.circle_id)

  // ── Pending circle invitations (shown on no-circle screen) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inviteNotifRows } = await (supabase.from('notifications') as any)
    .select('id, from_user_id, data')
    .eq('to_user_id', user.id)
    .eq('type', 'circle_invite')
    .order('created_at', { ascending: false })
    .limit(10)

  const rawInviteNotifs = (inviteNotifRows ?? []) as { id: string; from_user_id: string | null; data: Record<string, string> }[]
  const unacceptedInvites = rawInviteNotifs.filter(n => n.data?.circle_id && !circleIds.includes(n.data.circle_id))

  const inviterIds = [...new Set(unacceptedInvites.map(n => n.from_user_id).filter(Boolean))] as string[]
  const { data: inviterRows } = inviterIds.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', inviterIds)
    : { data: [] }
  const inviterMap = Object.fromEntries(
    ((inviterRows ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]).map(p => [p.id, p])
  )

  const pendingInvites = unacceptedInvites.map(n => ({
    notifId: n.id,
    circleId: n.data.circle_id,
    circleName: n.data.circle_name ?? 'A Circle',
    inviterName: n.from_user_id ? (inviterMap[n.from_user_id]?.full_name ?? n.data.inviter_name ?? null) : (n.data.inviter_name ?? null),
    inviterAvatar: n.from_user_id ? (inviterMap[n.from_user_id]?.avatar_url ?? null) : null,
  }))

  // ── Circle posts ──
  let circlePosts: PostWithMeta[] = []
  let circles: { id: string; name: string; code: string; covenant: string | null; season_duration: number | null; season_start: string | null; season_end: string | null; status: string | null; created_by: string | null }[] = []

  // ── Circle member assessments (for Reflections section) ──
  type MemberAssessment = { user_id: string; week_start: string; week_title: string | null; rating: number | null; full_name: string | null }
  let memberAssessments: MemberAssessment[] = []
  if (circleIds.length > 0) {
    const { data: memberUserRows } = await supabase.from('circle_members').select('user_id').in('circle_id', circleIds)
    const memberUserIds = ((memberUserRows ?? []) as { user_id: string }[]).map(r => r.user_id).filter(id => id !== user.id)
    if (memberUserIds.length > 0) {
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekStartStr = weekStart.toISOString().split('T')[0]
      const { data: maRows } = await supabase.from('assessments').select('user_id, week_start, week_title, rating').in('user_id', memberUserIds).eq('week_start', weekStartStr)
      const maList = (maRows ?? []) as { user_id: string; week_start: string; week_title: string | null; rating: number | null }[]
      if (maList.length > 0) {
        const { data: maProfiles } = await supabase.from('profiles').select('id, full_name').in('id', maList.map(m => m.user_id))
        const maProfileMap = Object.fromEntries(((maProfiles ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name]))
        memberAssessments = maList.map(m => ({ ...m, full_name: maProfileMap[m.user_id] ?? null }))
      }
    }
  }

  if (circleIds.length > 0) {
    // Try full select first; fall back to base columns if season fields don't exist yet
    let circleRows: { id: string; name: string; code: string; covenant: string | null; season_duration: number | null; season_start: string | null; season_end: string | null; status: string | null; created_by: string | null }[] | null = null
    const { data: fullRows, error: fullErr } = await supabase.from('circles').select('id, name, code, covenant, season_duration, season_start, season_end, status, created_by').in('id', circleIds)
    if (fullErr || !fullRows) {
      const { data: baseRows } = await supabase.from('circles').select('id, name, code, created_by').in('id', circleIds)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      circleRows = ((baseRows ?? []) as any[]).map(c => ({ ...c, covenant: null, season_duration: null, season_start: null, season_end: null, status: 'active' }))
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      circleRows = fullRows as any
    }

    const { data: postRows } = await supabase.from('posts')
      .select('id, content, type, created_at, user_id, circle_id, media_url, media_type')
      .order('created_at', { ascending: false })
      .limit(50)

    // Merge covenant from circle_settings (overrides circles.covenant if present)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settingsRows } = await (supabase.from('circle_settings') as any)
      .select('circle_id, covenant')
      .in('circle_id', circleIds)
    const settingsMap = Object.fromEntries(
      ((settingsRows ?? []) as { circle_id: string; covenant: string | null }[]).map(s => [s.circle_id, s.covenant])
    )
    circles = (circleRows ?? []).map(c => ({
      ...c,
      covenant: settingsMap[c.id] !== undefined ? settingsMap[c.id] : c.covenant,
    }))

    const posts = (postRows ?? []) as { id: string; content: string; type: string; created_at: string; user_id: string; circle_id: string | null; media_url: string | null; media_type: string | null }[]

    const authorIds = [...new Set(posts.map(p => p.user_id))]
    const { data: profileRows } = authorIds.length
      ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', authorIds)
      : { data: [] }
    const profileMap = Object.fromEntries(
      ((profileRows ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]).map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
    )

    const postIds = posts.map(p => p.id)
    const [{ data: reactionRows }, { data: commentRows }] = await Promise.all([
      postIds.length ? supabase.from('post_reactions').select('post_id, user_id, type').in('post_id', postIds) : { data: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postIds.length ? (supabase.from('post_comments') as any).select('id, post_id, user_id, content, created_at').in('post_id', postIds).order('created_at', { ascending: true }) : { data: [] },
    ])
    const reactions = (reactionRows ?? []) as { post_id: string; user_id: string; type: string }[]
    const comments = (commentRows ?? []) as { id: string; post_id: string; user_id: string; content: string; created_at: string }[]

    // Fetch comment author names + avatars
    const commentAuthorIds = [...new Set(comments.map(c => c.user_id))]
    const { data: commentProfileRows } = commentAuthorIds.length
      ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', commentAuthorIds)
      : { data: [] }
    const commentProfileMap = Object.fromEntries(
      ((commentProfileRows ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]).map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
    )

    circlePosts = posts.map(post => {
      const pr = reactions.filter(r => r.post_id === post.id)
      const pc = comments.filter(c => c.post_id === post.id).map(c => ({
        ...c,
        author_name: commentProfileMap[c.user_id]?.full_name ?? null,
        author_avatar: commentProfileMap[c.user_id]?.avatar_url ?? null,
      }))
      return {
        ...post,
        author_name: profileMap[post.user_id]?.full_name ?? null,
        author_avatar: profileMap[post.user_id]?.avatar_url ?? null,
        reactions: { fire: pr.filter(r => r.type === 'fire').length, strong: pr.filter(r => r.type === 'strong').length, relate: pr.filter(r => r.type === 'relate').length },
        my_reactions: { fire: pr.some(r => r.user_id === user.id && r.type === 'fire'), strong: pr.some(r => r.user_id === user.id && r.type === 'strong'), relate: pr.some(r => r.user_id === user.id && r.type === 'relate') },
        comments: pc,
      }
    })
  }

  // ── Circle leaderboard + member statuses (weekly scores) ──
  let leaderboard: LeaderboardEntry[] = []
  let memberStatuses: MemberStatus[] = []
  if (circleIds.length > 0) {
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]

    const { data: allMemberRows } = await supabase.from('circle_members').select('user_id').in('circle_id', circleIds)
    const allMemberIds = [...new Set(((allMemberRows ?? []) as { user_id: string }[]).map(r => r.user_id))]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: weekPosts }, { data: weekAssessments }, { data: memberProfiles }, { data: todayCheckins }, { data: memberActiveGoals }] = await Promise.all([
      supabase.from('posts').select('user_id, created_at').in('user_id', allMemberIds).gte('created_at', weekStartStr),
      supabase.from('assessments').select('user_id').in('user_id', allMemberIds).eq('week_start', weekStartStr),
      supabase.from('profiles').select('id, full_name, streak, avatar_url, username').in('id', allMemberIds),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('daily_checkins') as any).select('user_id, energy').in('user_id', allMemberIds).eq('date', todayStr),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('goals') as any).select('user_id, title, progress, category').in('user_id', allMemberIds).eq('status', 'active').neq('goal_type', 'letter').order('created_at', { ascending: false }).limit(allMemberIds.length * 3 + 1),
    ])

    type MemberProfileRow = { id: string; full_name: string | null; streak: number; avatar_url: string | null; username: string | null }
    const profileMap = Object.fromEntries(
      ((memberProfiles ?? []) as MemberProfileRow[]).map(p => [p.id, p])
    )

    const postCounts: Record<string, number> = {}
    const postedTodaySet = new Set<string>()
    for (const p of (weekPosts ?? []) as { user_id: string; created_at: string }[]) {
      postCounts[p.user_id] = (postCounts[p.user_id] ?? 0) + 1
      if (p.created_at.startsWith(todayStr)) postedTodaySet.add(p.user_id)
    }
    const assessCounts: Record<string, number> = {}
    for (const a of (weekAssessments ?? []) as { user_id: string }[]) assessCounts[a.user_id] = (assessCounts[a.user_id] ?? 0) + 1

    const energyMap: Record<string, number> = {}
    for (const c of (todayCheckins ?? []) as { user_id: string; energy: number }[]) energyMap[c.user_id] = c.energy

    const goalMap: Record<string, { title: string; progress: number; category: string | null }> = {}
    for (const g of (memberActiveGoals ?? []) as { user_id: string; title: string; progress: number; category: string | null }[]) {
      if (!goalMap[g.user_id]) goalMap[g.user_id] = { title: g.title, progress: g.progress ?? 0, category: g.category ?? null }
    }

    leaderboard = allMemberIds.map(uid => ({
      user_id: uid,
      full_name: profileMap[uid]?.full_name ?? null,
      streak: profileMap[uid]?.streak ?? 0,
      post_count: postCounts[uid] ?? 0,
      assessment_count: assessCounts[uid] ?? 0,
      score: (postCounts[uid] ?? 0) * 2 + (assessCounts[uid] ?? 0) * 5,
    })).sort((a, b) => b.score - a.score || b.streak - a.streak)

    memberStatuses = allMemberIds.map(uid => ({
      user_id: uid,
      full_name: profileMap[uid]?.full_name ?? null,
      avatar_url: profileMap[uid]?.avatar_url ?? null,
      username: profileMap[uid]?.username ?? null,
      streak: profileMap[uid]?.streak ?? 0,
      energy_today: energyMap[uid] ?? null,
      active_goal: goalMap[uid] ?? null,
      post_count_week: postCounts[uid] ?? 0,
      posted_today: postedTodaySet.has(uid),
      score: (postCounts[uid] ?? 0) * 2 + (assessCounts[uid] ?? 0) * 5,
    })).sort((a, b) => b.score - a.score || b.streak - a.streak)
  }

  // ── Following posts ──
  let followingPosts: PostWithMeta[] = []
  if (followingIds.length > 0) {
    const { data: fPostRows } = await supabase.from('posts')
      .select('id, content, type, created_at, user_id, circle_id, media_url, media_type')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(30)

    const fPosts = (fPostRows ?? []) as { id: string; content: string; type: string; created_at: string; user_id: string; circle_id: string | null; media_url: string | null; media_type: string | null }[]
    const fAuthorIds = [...new Set(fPosts.map(p => p.user_id))]

    const [{ data: fProfileRows }, { data: fReactionRows }] = await Promise.all([
      fAuthorIds.length ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', fAuthorIds) : { data: [] },
      fPosts.length ? supabase.from('post_reactions').select('post_id, user_id, type').in('post_id', fPosts.map(p => p.id)) : { data: [] },
    ])

    const fProfileMap = Object.fromEntries(((fProfileRows ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]).map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]))
    const fReactions = (fReactionRows ?? []) as { post_id: string; user_id: string; type: string }[]

    followingPosts = fPosts.map(post => {
      const pr = fReactions.filter(r => r.post_id === post.id)
      return {
        ...post,
        author_name: fProfileMap[post.user_id]?.full_name ?? null,
        author_avatar: fProfileMap[post.user_id]?.avatar_url ?? null,
        reactions: { fire: pr.filter(r => r.type === 'fire').length, strong: pr.filter(r => r.type === 'strong').length, relate: pr.filter(r => r.type === 'relate').length },
        my_reactions: { fire: pr.some(r => r.user_id === user.id && r.type === 'fire'), strong: pr.some(r => r.user_id === user.id && r.type === 'strong'), relate: pr.some(r => r.user_id === user.id && r.type === 'relate') },
        comments: [],
      }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: myProfile } = await (supabase.from('profiles') as any)
    .select('full_name, streak, avatar_url, username, goals_complete, circle_module_complete')
    .eq('id', user.id)
    .single()

  type MyProfile = { full_name: string | null; streak: number; avatar_url: string | null; username: string | null; goals_complete: number; circle_module_complete: boolean }
  const prof = myProfile as MyProfile | null

  // ── Circle goals (members' active goals with reactions + comments) ──
  type CircleGoal = {
    id: string; title: string; category: string | null; progress: number
    deadline: string | null; user_id: string; author_name: string | null
    reactions: { fire: number; believe: number; cheer: number }
    my_reactions: { fire: boolean; believe: boolean; cheer: boolean }
    comments: { id: string; user_id: string; author_name: string | null; content: string; created_at: string }[]
  }
  let circleGoals: CircleGoal[] = []
  if (circleIds.length > 0) {
    const { data: allMemberUserRows } = await supabase.from('circle_members').select('user_id').in('circle_id', circleIds)
    const allMemberUserIds = [...new Set(((allMemberUserRows ?? []) as { user_id: string }[]).map(r => r.user_id))]
    const memberIdsExcludingSelf = allMemberUserIds.filter(id => id !== user.id)

    if (memberIdsExcludingSelf.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: goalRows } = await (supabase.from('goals') as any)
        .select('id, title, category, progress, deadline, user_id')
        .in('user_id', memberIdsExcludingSelf)
        .in('visibility', ['circle', 'public'])
        .eq('status', 'active')
        .neq('goal_type', 'letter')
        .order('created_at', { ascending: false })
        .limit(60)

      const goals = (goalRows ?? []) as { id: string; title: string; category: string | null; progress: number; deadline: string | null; user_id: string }[]

      if (goals.length > 0) {
        const goalIds = goals.map(g => g.id)
        const authorIds = [...new Set(goals.map(g => g.user_id))]

        const [{ data: authorRows }, { data: reactionRows }, { data: commentRows }] = await Promise.all([
          supabase.from('profiles').select('id, full_name').in('id', authorIds),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.from('goal_reactions') as any).select('goal_id, user_id, type').in('goal_id', goalIds),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.from('goal_comments') as any).select('id, goal_id, user_id, content, created_at').in('goal_id', goalIds).order('created_at', { ascending: true }),
        ])

        const authorMap = Object.fromEntries(((authorRows ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name]))
        const reactions = (reactionRows ?? []) as { goal_id: string; user_id: string; type: string }[]
        const comments = (commentRows ?? []) as { id: string; goal_id: string; user_id: string; content: string; created_at: string }[]

        const commentAuthorIds = [...new Set(comments.map(c => c.user_id))]
        const { data: commentAuthorRows } = commentAuthorIds.length
          ? await supabase.from('profiles').select('id, full_name').in('id', commentAuthorIds)
          : { data: [] }
        const commentAuthorMap = Object.fromEntries(((commentAuthorRows ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name]))

        circleGoals = goals.map(g => {
          const gr = reactions.filter(r => r.goal_id === g.id)
          const gc = comments.filter(c => c.goal_id === g.id).map(c => ({ ...c, author_name: commentAuthorMap[c.user_id] ?? null }))
          return {
            ...g,
            author_name: authorMap[g.user_id] ?? null,
            reactions: { fire: gr.filter(r => r.type === 'fire').length, believe: gr.filter(r => r.type === 'believe').length, cheer: gr.filter(r => r.type === 'cheer').length },
            my_reactions: { fire: gr.some(r => r.user_id === user.id && r.type === 'fire'), believe: gr.some(r => r.user_id === user.id && r.type === 'believe'), cheer: gr.some(r => r.user_id === user.id && r.type === 'cheer') },
            comments: gc,
          }
        })
      }
    }
  }

  // ── Sessions ──
  type SessionRow = { id: string; circle_id: string; created_by: string; title: string; description: string | null; scheduled_at: string; meeting_url: string | null; status: string; created_at: string }
  type RsvpRow = { session_id: string; user_id: string; status: string }
  let sessions: SessionRow[] = []
  let rsvps: RsvpRow[] = []
  let rsvpProfiles: { id: string; full_name: string | null }[] = []

  if (circleIds.length > 0) {
    // Fetch upcoming + recent sessions (next 30 days + past 2 days)
    const since = new Date(); since.setDate(since.getDate() - 2)
    const until = new Date(); until.setDate(until.getDate() + 30)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessionRows } = await (supabase.from('circle_sessions') as any)
      .select('id, circle_id, created_by, title, description, scheduled_at, meeting_url, status, created_at')
      .in('circle_id', circleIds)
      .gte('scheduled_at', since.toISOString())
      .lte('scheduled_at', until.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(30)

    sessions = (sessionRows ?? []) as SessionRow[]

    if (sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rsvpRows } = await (supabase.from('session_rsvps') as any)
        .select('session_id, user_id, status').in('session_id', sessionIds)
      rsvps = (rsvpRows ?? []) as RsvpRow[]

      const rsvpUserIds = [...new Set(rsvps.map(r => r.user_id))]
      const { data: profileRows } = rsvpUserIds.length > 0
        ? await supabase.from('profiles').select('id, full_name').in('id', rsvpUserIds)
        : { data: [] }
      rsvpProfiles = (profileRows ?? []) as { id: string; full_name: string | null }[]
    }
  }

  // ── Explore data (public goals + builders for Discover tab) ──
  type ExploreGoalRow    = { id: string; title: string; category: string | null; progress: number; user_id: string; created_at: string }
  type ExploreProfileRow = { id: string; full_name: string | null; avatar_url: string | null; xp: number; level: number }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: exploreGoalRows } = await (supabase.from('goals') as any)
    .select('id, title, category, progress, user_id, created_at')
    .eq('visibility', 'public')
    .eq('status', 'active')
    .neq('user_id', user.id)
    .neq('goal_type', 'letter')
    .order('created_at', { ascending: false })
    .limit(80)

  const exploreGoalList = (exploreGoalRows ?? []) as ExploreGoalRow[]
  const exploreAuthorIds = [...new Set(exploreGoalList.map(g => g.user_id))]

  const { data: exploreProfileRows } = exploreAuthorIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, avatar_url, xp, level').in('id', exploreAuthorIds)
    : { data: [] }

  const exploreProfileMap = new Map<string, ExploreProfileRow>(
    ((exploreProfileRows ?? []) as ExploreProfileRow[]).map(p => [p.id, p])
  )
  const followingSet = new Set(followingIds)

  const eBuilderMap = new Map<string, { id: string; full_name: string | null; avatar_url: string | null; xp: number; level: number; goalCategories: string[]; goalCount: number }>()
  for (const goal of exploreGoalList) {
    if (!eBuilderMap.has(goal.user_id)) {
      const p = exploreProfileMap.get(goal.user_id)
      eBuilderMap.set(goal.user_id, { id: goal.user_id, full_name: p?.full_name ?? null, avatar_url: p?.avatar_url ?? null, xp: p?.xp ?? 0, level: p?.level ?? 1, goalCategories: [], goalCount: 0 })
    }
    const b = eBuilderMap.get(goal.user_id)!
    b.goalCount++
    if (goal.category && !b.goalCategories.includes(goal.category)) b.goalCategories.push(goal.category)
  }
  const exploreBuilders = [...eBuilderMap.values()].sort((a, b) => {
    const aF = followingSet.has(a.id), bF = followingSet.has(b.id)
    if (aF !== bF) return aF ? 1 : -1
    return b.xp - a.xp
  })
  const exploreGoals = exploreGoalList.map(g => {
    const p = exploreProfileMap.get(g.user_id)
    return { id: g.id, title: g.title, category: g.category, progress: g.progress, created_at: g.created_at, user_id: g.user_id, authorName: p?.full_name ?? null, authorAvatar: p?.avatar_url ?? null, authorLevel: p?.level ?? 1, watcherCount: 0, isWatching: false }
  })

  // ── New builders spotlight ──
  const { data: newBuilderRows } = await supabase.from('profiles')
    .select('id, full_name, username, avatar_url, xp, level, created_at, streak, goals_complete')
    .neq('id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)
  const newBuilders = (newBuilderRows ?? []) as { id: string; full_name: string | null; username: string | null; avatar_url: string | null; xp: number; level: number; created_at: string; streak: number; goals_complete: number }[]

  // ── Birthday data ──
  type BirthdayProfile = { id: string; full_name: string | null; date_of_birth: string | null }
  let birthdayProfiles: BirthdayProfile[] = []
  if (circleIds.length > 0) {
    const { data: allCircleMemberRows } = await supabase.from('circle_members').select('user_id').in('circle_id', circleIds)
    const allCircleMemberIds = [...new Set(((allCircleMemberRows ?? []) as { user_id: string }[]).map(r => r.user_id))]
    if (allCircleMemberIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bRows } = await (supabase.from('profiles') as any)
        .select('id, full_name, date_of_birth')
        .in('id', allCircleMemberIds)
        .not('date_of_birth', 'is', null)
      birthdayProfiles = (bRows ?? []) as BirthdayProfile[]
    }
  }

  // ── Current user's active goals (for commitment quick-pick) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: myGoalRows } = await (supabase.from('goals') as any)
    .select('id, title, category, progress')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .neq('goal_type', 'letter')
    .order('created_at', { ascending: false })
    .limit(6)
  const myActiveGoals = (myGoalRows ?? []) as { id: string; title: string; category: string | null; progress: number }[]

  // ── Weekly commitments ──
  let weekCommitments: CircleCommitment[] = []
  let myWitnessedIds: string[] = []
  if (circleIds.length > 0) {
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStartStr = weekStart.toISOString().split('T')[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: commitmentRows } = await (supabase.from('circle_commitments') as any)
      .select('id, user_id, circle_id, week_start, text, status, created_at')
      .in('circle_id', circleIds)
      .eq('week_start', weekStartStr)
      .order('created_at', { ascending: true })

    const rawCommitments = (commitmentRows ?? []) as { id: string; user_id: string; circle_id: string; week_start: string; text: string; status: string; created_at: string }[]

    if (rawCommitments.length > 0) {
      const commitmentIds = rawCommitments.map(c => c.id)
      const authorIds = [...new Set(rawCommitments.map(c => c.user_id))]
      const [{ data: witnessRows }, { data: profileRows }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('commitment_witnesses') as any).select('commitment_id, user_id').in('commitment_id', commitmentIds),
        supabase.from('profiles').select('id, full_name, avatar_url, username').in('id', authorIds),
      ])
      const witnesses = (witnessRows ?? []) as { commitment_id: string; user_id: string }[]
      const profileMap = Object.fromEntries(((profileRows ?? []) as { id: string; full_name: string | null; avatar_url: string | null; username: string | null }[]).map(p => [p.id, p]))
      myWitnessedIds = witnesses.filter(w => w.user_id === user.id).map(w => w.commitment_id)
      weekCommitments = rawCommitments.map(c => ({
        ...c,
        status: c.status as 'active' | 'done' | 'failed',
        witness_count: witnesses.filter(w => w.commitment_id === c.id).length,
        full_name: profileMap[c.user_id]?.full_name ?? null,
        avatar_url: profileMap[c.user_id]?.avatar_url ?? null,
        username: profileMap[c.user_id]?.username ?? null,
      }))
    }
  }

  // ── Circle health score (0–100) ──
  const totalMembers = memberStatuses.length
  const healthScore = totalMembers === 0 ? 100 : Math.min(100, Math.round(
    (memberStatuses.filter(s => s.post_count_week > 0).length / totalMembers) * 60 +
    (new Set(weekCommitments.map(c => c.user_id)).size / totalMembers) * 40
  ))

  // ── Can this user create a circle? ──
  const canCreateCircle = !!(prof?.circle_module_complete && (prof?.goals_complete ?? 0) >= 1)

  return (
    <CircleClient
      posts={circlePosts}
      circles={circles}
      isCircleMember={circleIds.length > 0}
      userId={user.id}
      sessions={sessions}
      rsvps={rsvps}
      rsvpProfiles={rsvpProfiles}
      discoverProfiles={discoverProfiles}
      followingIds={followingIds}
      followingPosts={followingPosts}
      memberAssessments={memberAssessments}
      leaderboard={leaderboard}
      memberStatuses={memberStatuses}
      exploreBuilders={exploreBuilders}
      exploreGoals={exploreGoals}
      circleGoals={circleGoals}
      newBuilders={newBuilders}
      userName={prof?.full_name ?? null}
      userStreak={prof?.streak ?? 0}
      userAvatar={prof?.avatar_url ?? null}
      userUsername={prof?.username ?? null}
      birthdayProfiles={birthdayProfiles}
      weekCommitments={weekCommitments}
      myWitnessedIds={myWitnessedIds}
      myActiveGoals={myActiveGoals}
      pendingInvites={pendingInvites}
      healthScore={healthScore}
      canCreateCircle={canCreateCircle}
      moduleComplete={prof?.circle_module_complete ?? false}
      goalsComplete={prof?.goals_complete ?? 0}
    />
  )
}
