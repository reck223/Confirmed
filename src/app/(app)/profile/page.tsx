import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileClient } from './ProfileClient'
import type { Profile } from '@/lib/types/database'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data }, { data: goalRows }, { count: followersCount }, { count: followingCount }, { data: assessRows }, { data: achievementRows }, { data: postRows }, { data: circleMemberRows }, { data: connectionRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('goals')
      .select('id, title, category, progress, deadline, status, visibility')
      .eq('user_id', user.id)
      .neq('goal_type', 'letter')
      .order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('follows') as any).select('id', { count: 'exact', head: true }).eq('following_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('follows') as any).select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    supabase.from('assessments').select('week_start, rating').eq('user_id', user.id).order('week_start', { ascending: false }).limit(26),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('achievements') as any).select('type, earned_at').eq('user_id', user.id).order('earned_at', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('posts') as any).select('id, content, type, created_at, media_url, media_type, visibility').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('circle_members').select('circle_id').eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('connections') as any)
      .select('id, proposer_id, receiver_id, title, commitment, duration_days, start_date, end_date, status')
      .or(`proposer_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ])

  if (!data) redirect('/signin')

  const goals = (goalRows ?? []) as { id: string; title: string; category: string | null; progress: number; deadline: string | null; status: string; visibility: string }[]
  const assessmentHistory = (assessRows ?? []) as { week_start: string; rating: number | null }[]
  const achievements = (achievementRows ?? []) as { type: string; earned_at: string }[]
  const rawPosts = (postRows ?? []) as { id: string; content: string; type: string; created_at: string; media_url: string | null; media_type: string | null; visibility: string }[]
  const myCircleIds = (circleMemberRows ?? []).map((r: { circle_id: string }) => r.circle_id)
  let circleCount = 0
  let myCircles: { id: string; name: string; memberCount: number }[] = []
  if (myCircleIds.length > 0) {
    const [{ count }, { data: circleRows }, { data: allMemberRows }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('circle_members') as any)
        .select('user_id', { count: 'exact', head: true })
        .in('circle_id', myCircleIds)
        .neq('user_id', user.id),
      supabase.from('circles').select('id, name').in('id', myCircleIds),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('circle_members') as any).select('circle_id, user_id').in('circle_id', myCircleIds),
    ])
    circleCount = count ?? 0
    const rawMemberRows = (allMemberRows ?? []) as { circle_id: string; user_id: string }[]
    myCircles = ((circleRows ?? []) as { id: string; name: string }[]).map(c => ({
      id: c.id,
      name: c.name,
      memberCount: rawMemberRows.filter(r => r.circle_id === c.id).length,
    }))
  }

  // Build connections with partner profiles
  type RawConnection = { id: string; proposer_id: string; receiver_id: string; title: string; commitment: string; duration_days: number; start_date: string | null; end_date: string | null; status: string }
  const rawConnections = (connectionRows ?? []) as RawConnection[]
  const partnerIds = [...new Set(rawConnections.map(c => c.proposer_id === user.id ? c.receiver_id : c.proposer_id))]
  const { data: partnerProfiles } = partnerIds.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', partnerIds)
    : { data: [] }
  const partnerMap = Object.fromEntries(
    ((partnerProfiles ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]).map(p => [p.id, p])
  )
  const connections = rawConnections.map(c => {
    const partnerId = c.proposer_id === user.id ? c.receiver_id : c.proposer_id
    const partner = partnerMap[partnerId]
    return { ...c, partnerName: partner?.full_name ?? null, partnerAvatar: partner?.avatar_url ?? null }
  })

  // Fetch reactions + comments for posts
  const postIds = rawPosts.map(p => p.id)
  const [{ data: reactRows }, { data: commentRows }] = await Promise.all([
    postIds.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from('post_reactions') as any).select('post_id, type, user_id').in('post_id', postIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from('post_comments') as any).select('id, post_id, user_id, content, created_at').in('post_id', postIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  type RawReact = { post_id: string; type: string; user_id: string }
  type RawComment = { id: string; post_id: string; user_id: string; content: string; created_at: string }

  // Build comment author names
  const commentAuthorIds = [...new Set(((commentRows ?? []) as RawComment[]).map(c => c.user_id))]
  const { data: commentProfiles } = commentAuthorIds.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', commentAuthorIds)
    : { data: [] }
  const commentProfileMap = Object.fromEntries(
    ((commentProfiles ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]).map(p => [p.id, p])
  )

  const posts = rawPosts.map(p => {
    const reacts = ((reactRows ?? []) as RawReact[]).filter(r => r.post_id === p.id)
    const comments = ((commentRows ?? []) as RawComment[])
      .filter(c => c.post_id === p.id)
      .map(c => ({ id: c.id, user_id: c.user_id, author_name: commentProfileMap[c.user_id]?.full_name ?? null, author_avatar: commentProfileMap[c.user_id]?.avatar_url ?? null, content: c.content, created_at: c.created_at }))
    return {
      ...p,
      reactions: {
        fire: reacts.filter(r => r.type === 'fire').length,
        strong: reacts.filter(r => r.type === 'strong').length,
        relate: reacts.filter(r => r.type === 'relate').length,
      },
      my_reactions: {
        fire: reacts.some(r => r.type === 'fire' && r.user_id === user.id),
        strong: reacts.some(r => r.type === 'strong' && r.user_id === user.id),
        relate: reacts.some(r => r.type === 'relate' && r.user_id === user.id),
      },
      comments,
    }
  })

  // ── 90-day activity grid (streak calendar) ──
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]

  const [{ data: ciDays }, { data: activityPosts }, { data: journalDays }, { data: energyDays }] = await Promise.all([
    supabase.from('check_ins').select('date').eq('user_id', user.id).gte('date', ninetyDaysAgoStr),
    supabase.from('posts').select('created_at').eq('user_id', user.id).gte('created_at', ninetyDaysAgoStr),
    supabase.from('journal_entries').select('created_at').eq('user_id', user.id).gte('created_at', ninetyDaysAgoStr),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('daily_checkins') as any).select('date').eq('user_id', user.id).gte('date', ninetyDaysAgoStr),
  ])

  const activityMap: Record<string, number> = {}
  const addDay = (date: string) => { activityMap[date] = (activityMap[date] ?? 0) + 1 }
  for (const r of (ciDays ?? []) as { date: string }[]) addDay(r.date)
  for (const r of (activityPosts ?? []) as { created_at: string }[]) addDay(r.created_at.split('T')[0])
  for (const r of (journalDays ?? []) as { created_at: string }[]) addDay(r.created_at.split('T')[0])
  for (const r of (energyDays ?? []) as { date: string }[]) addDay(r.date)

  // Build 91-cell grid (13 weeks × 7 days), newest day = last cell
  const today = new Date()
  const activityGrid = Array.from({ length: 91 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (90 - i))
    const dateStr = d.toISOString().split('T')[0]
    return { date: dateStr, level: Math.min(4, activityMap[dateStr] ?? 0) }
  })

  return (
    <ProfileClient
      profile={data as Profile}
      goals={goals}
      followersCount={followersCount ?? 0}
      followingCount={followingCount ?? 0}
      circleCount={circleCount}
      assessmentHistory={assessmentHistory}
      achievements={achievements}
      posts={posts}
      connections={connections}
      currentUserId={user.id}
      myCircles={myCircles}
      activityGrid={activityGrid}
    />
  )
}
