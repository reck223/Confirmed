import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CircleClient } from './CircleClient'

type PostWithMeta = {
  id: string; content: string; type: string; created_at: string
  user_id: string; circle_id: string | null
  author_name: string | null
  reactions: { fire: number; strong: number; relate: number }
  my_reactions: { fire: boolean; strong: boolean; relate: boolean }
}

export default async function CirclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // ── Fetch everything in parallel ──
  const [
    { data: memberRows },
    { data: calGoalRows },
    { data: followRows, error: followsError },
    { data: discoverRows },
  ] = await Promise.all([
    supabase.from('circle_members').select('circle_id').eq('user_id', user.id),
    supabase.from('goals')
      .select('id, title, category, deadline')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .not('deadline', 'is', null)
      .order('deadline', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('follows') as any).select('following_id').eq('follower_id', user.id),
    supabase.from('profiles')
      .select('id, full_name, username, streak, tagline, goals_complete')
      .neq('id', user.id)
      .order('streak', { ascending: false })
      .limit(20),
  ])

  const calGoals = (calGoalRows ?? []) as { id: string; title: string; category: string | null; deadline: string }[]
  const followingIds: string[] = (followsError || !followRows)
    ? []
    : (followRows as { following_id: string }[]).map(r => r.following_id)
  const discoverProfiles = (discoverRows ?? []) as {
    id: string; full_name: string | null; username: string | null
    streak: number; tagline: string | null; goals_complete: number
  }[]

  // ── Circle membership ──
  const circleIds = ((memberRows ?? []) as { circle_id: string }[]).map(r => r.circle_id)

  // ── Circle posts ──
  let circlePosts: PostWithMeta[] = []
  let circles: { id: string; name: string; code: string }[] = []

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
    const [{ data: circleRows }, { data: postRows }] = await Promise.all([
      supabase.from('circles').select('id, name, code').in('id', circleIds),
      supabase.from('posts')
        .select('id, content, type, created_at, user_id, circle_id')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    circles = ((circleRows ?? []) as { id: string; name: string; code: string }[])
    const posts = (postRows ?? []) as { id: string; content: string; type: string; created_at: string; user_id: string; circle_id: string | null }[]

    const authorIds = [...new Set(posts.map(p => p.user_id))]
    const { data: profileRows } = authorIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', authorIds)
      : { data: [] }
    const profileMap = Object.fromEntries(
      ((profileRows ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name])
    )

    const postIds = posts.map(p => p.id)
    const { data: reactionRows } = postIds.length
      ? await supabase.from('post_reactions').select('post_id, user_id, type').in('post_id', postIds)
      : { data: [] }
    const reactions = (reactionRows ?? []) as { post_id: string; user_id: string; type: string }[]

    circlePosts = posts.map(post => {
      const pr = reactions.filter(r => r.post_id === post.id)
      return {
        ...post,
        author_name: profileMap[post.user_id] ?? null,
        reactions: { fire: pr.filter(r => r.type === 'fire').length, strong: pr.filter(r => r.type === 'strong').length, relate: pr.filter(r => r.type === 'relate').length },
        my_reactions: { fire: pr.some(r => r.user_id === user.id && r.type === 'fire'), strong: pr.some(r => r.user_id === user.id && r.type === 'strong'), relate: pr.some(r => r.user_id === user.id && r.type === 'relate') },
      }
    })
  }

  // ── Following posts ──
  let followingPosts: PostWithMeta[] = []
  if (followingIds.length > 0) {
    const { data: fPostRows } = await supabase.from('posts')
      .select('id, content, type, created_at, user_id, circle_id')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(30)

    const fPosts = (fPostRows ?? []) as { id: string; content: string; type: string; created_at: string; user_id: string; circle_id: string | null }[]
    const fAuthorIds = [...new Set(fPosts.map(p => p.user_id))]

    const [{ data: fProfileRows }, { data: fReactionRows }] = await Promise.all([
      fAuthorIds.length ? supabase.from('profiles').select('id, full_name').in('id', fAuthorIds) : { data: [] },
      fPosts.length ? supabase.from('post_reactions').select('post_id, user_id, type').in('post_id', fPosts.map(p => p.id)) : { data: [] },
    ])

    const fProfileMap = Object.fromEntries(((fProfileRows ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name]))
    const fReactions = (fReactionRows ?? []) as { post_id: string; user_id: string; type: string }[]

    followingPosts = fPosts.map(post => {
      const pr = fReactions.filter(r => r.post_id === post.id)
      return {
        ...post,
        author_name: fProfileMap[post.user_id] ?? null,
        reactions: { fire: pr.filter(r => r.type === 'fire').length, strong: pr.filter(r => r.type === 'strong').length, relate: pr.filter(r => r.type === 'relate').length },
        my_reactions: { fire: pr.some(r => r.user_id === user.id && r.type === 'fire'), strong: pr.some(r => r.user_id === user.id && r.type === 'strong'), relate: pr.some(r => r.user_id === user.id && r.type === 'relate') },
      }
    })
  }

  return (
    <CircleClient
      posts={circlePosts}
      circles={circles}
      userId={user.id}
      calGoals={calGoals}
      discoverProfiles={discoverProfiles}
      followingIds={followingIds}
      followingPosts={followingPosts}
      memberAssessments={memberAssessments}
    />
  )
}
