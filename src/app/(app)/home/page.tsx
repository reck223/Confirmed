import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HomeClient } from './HomeClient'
import type { Profile, Goal, GoalMilestone } from '@/lib/types/database'

function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()
}

export type RecentPost = {
  id: string; content: string; type: string; created_at: string
  user_id: string; author_name: string | null
  media_url: string | null; media_type: string | null
  reactions: { fire: number; strong: number; relate: number }
  my_reactions: { fire: boolean; strong: boolean; relate: boolean }
}

export type CheckinDay = { date: string; energy: number }

// A unit of work the user can pick to focus on today — either a real
// milestone, or (for goals with none yet) the goal's next action.
export type FocusItem = {
  id: string
  kind: 'milestone' | 'goal'
  goalId: string
  goalTitle: string
  category: string | null
  deadline: string | null
  text: string
  progress: number
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data: profileData }, { data: goalsData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }),
  ])

  const profile = profileData as Profile | null
  const goals = (goalsData as Goal[] | null) ?? []
  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there'

  // Check-in: today + last 7 days
  const today = new Date().toISOString().split('T')[0]
  const ago = new Date(today); ago.setDate(ago.getDate() - 7)
  const sevenDaysAgo = ago.toISOString().split('T')[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: checkinRows } = await (supabase.from('daily_checkins') as any)
    .select('date, energy')
    .eq('user_id', user.id)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false })

  const checkinHistory: CheckinDay[] = (checkinRows ?? []) as CheckinDay[]
  const todayCheckin = checkinHistory.find(c => c.date === today) ?? null

  // Focus pool: real undone milestones for active goals, falling back to
  // the goal's next action for goals that don't have milestones yet.
  const activeGoals = goals.filter(g => g.goal_type !== 'letter')
  let focusPool: FocusItem[] = []
  if (activeGoals.length > 0) {
    const goalIds = activeGoals.map(g => g.id)
    const { data: msData } = await supabase
      .from('goal_milestones')
      .select('*')
      .in('goal_id', goalIds)
      .eq('done', false)
      .order('created_at', { ascending: true })

    const milestones = (msData as GoalMilestone[] | null) ?? []
    const goalMap = Object.fromEntries(activeGoals.map(g => [g.id, g]))
    const goalsWithMilestones = new Set(milestones.map(m => m.goal_id))

    focusPool = milestones.map(m => ({
      id: m.id,
      kind: 'milestone' as const,
      goalId: m.goal_id,
      goalTitle: goalMap[m.goal_id]?.title ?? '',
      category: goalMap[m.goal_id]?.category ?? null,
      deadline: m.due_date ?? goalMap[m.goal_id]?.deadline ?? null,
      text: m.text,
      progress: goalMap[m.goal_id]?.progress ?? 0,
    }))

    for (const g of activeGoals) {
      if (!goalsWithMilestones.has(g.id)) {
        focusPool.push({
          id: `goal:${g.id}`,
          kind: 'goal' as const,
          goalId: g.id,
          goalTitle: g.title,
          category: g.category,
          deadline: g.deadline,
          text: g.next_action ?? g.title,
          progress: g.progress ?? 0,
        })
      }
    }
  }

  // Weekly reflection: done this week?
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const { data: assessRow } = await supabase.from('assessments')
    .select('id')
    .eq('user_id', user.id)
    .eq('week_start', weekStartStr)
    .limit(1)
    .single()
  const reflectionDone = !!assessRow

  // Circle posts (2-3 most recent)
  let recentPosts: RecentPost[] = []
  const { data: memberRows } = await supabase.from('circle_members').select('circle_id').eq('user_id', user.id)
  const circleIds = ((memberRows ?? []) as { circle_id: string }[]).map(r => r.circle_id)

  if (circleIds.length > 0) {
    const { data: postRows } = await supabase.from('posts')
      .select('id, content, type, created_at, user_id, media_url, media_type')
      .order('created_at', { ascending: false })
      .limit(5)

    const posts = (postRows ?? []) as { id: string; content: string; type: string; created_at: string; user_id: string; media_url: string | null; media_type: string | null }[]

    if (posts.length > 0) {
      const authorIds = [...new Set(posts.map(p => p.user_id))]
      const postIds = posts.map(p => p.id)

      const [{ data: profileRows }, { data: reactionRows }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', authorIds),
        supabase.from('post_reactions').select('post_id, user_id, type').in('post_id', postIds),
      ])

      const profileMap = Object.fromEntries(
        ((profileRows ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name])
      )
      const reactions = (reactionRows ?? []) as { post_id: string; user_id: string; type: string }[]

      recentPosts = posts.map(post => {
        const pr = reactions.filter(r => r.post_id === post.id)
        return {
          ...post,
          author_name: profileMap[post.user_id] ?? null,
          media_url:   post.media_url  ?? null,
          media_type:  post.media_type ?? null,
          reactions: {
            fire: pr.filter(r => r.type === 'fire').length,
            strong: pr.filter(r => r.type === 'strong').length,
            relate: pr.filter(r => r.type === 'relate').length,
          },
          my_reactions: {
            fire: pr.some(r => r.user_id === user.id && r.type === 'fire'),
            strong: pr.some(r => r.user_id === user.id && r.type === 'strong'),
            relate: pr.some(r => r.user_id === user.id && r.type === 'relate'),
          },
        }
      })
    }
  }

  return (
    <HomeClient
      todayLabel={getTodayLabel()}
      firstName={firstName}
      streak={profile?.streak ?? 0}
      goals={goals}
      focusPool={focusPool}
      isNewUser={goals.length === 0}
      todayCheckin={todayCheckin ? { energy: todayCheckin.energy, note: null } : null}
      checkinHistory={checkinHistory}
      recentPosts={recentPosts}
      reflectionDone={reflectionDone}
      assessmentDay={profile?.assessment_day ?? 'Sun'}
      inCircle={circleIds.length > 0}
      userId={user.id}
      isCreator={user.email === 'graysdarius@gmail.com'}
    />
  )
}
