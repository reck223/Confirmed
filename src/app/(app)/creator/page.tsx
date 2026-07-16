import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreatorClient } from './CreatorClient'
import { PLAYBOOK } from '../playbook/content'

const CREATOR_EMAIL = 'graysdarius@gmail.com'

export default async function CreatorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (user.email !== CREATOR_EMAIL) redirect('/home')

  const now = new Date()
  const day7   = new Date(now.getTime() - 7  * 86400000).toISOString()
  const day30  = new Date(now.getTime() - 30 * 86400000).toISOString()
  const day30s = day30.split('T')[0]
  const day7s  = new Date(now.getTime() - 7  * 86400000).toISOString().split('T')[0]
  const todayS = now.toISOString().split('T')[0]

  // ── BATCH 1: platform totals ──────────────────────────────────────────
  const [
    { count: totalUsers },
    { count: newUsers7d },
    { count: totalGoals },
    { count: goalsCreated7d },
    { count: goalsCompleted },
    { count: totalPosts },
    { count: posts7d },
    { count: totalJournal },
    { count: journal7d },
    { count: totalFollows },
    { count: follows7d },
    { count: totalCircleJoins },
    { data: profileRows },
    { data: signupRows },
    { data: goalCatRows },
    { data: journalTypeRows },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('profiles') as any).select('*', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('profiles') as any).select('*', { count: 'exact', head: true }).gte('created_at', day7),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('goals') as any).select('*', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('goals') as any).select('*', { count: 'exact', head: true }).gte('created_at', day7),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('goals') as any).select('*', { count: 'exact', head: true }).eq('status', 'complete'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('posts') as any).select('*', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('posts') as any).select('*', { count: 'exact', head: true }).gte('created_at', day7),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('journal_entries') as any).select('*', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('journal_entries') as any).select('*', { count: 'exact', head: true }).gte('created_at', day7),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('follows') as any).select('*', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('follows') as any).select('*', { count: 'exact', head: true }).gte('created_at', day7),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('circle_members') as any).select('*', { count: 'exact', head: true }),
    // All builders — top 100 by XP (used for both leaderboard + search)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('profiles') as any)
      .select('id, full_name, username, avatar_url, xp, level, streak, goals_complete, created_at')
      .order('xp', { ascending: false })
      .limit(100),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('profiles') as any)
      .select('created_at')
      .gte('created_at', day30)
      .order('created_at', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('goals') as any).select('category'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('journal_entries') as any).select('type'),
  ])

  // ── BATCH 2: new feature data ─────────────────────────────────────────
  const [
    { data: checkInRows },
    { count: workoutCount },
    { count: budgetCount },
    { count: challengeLogCount },
    { count: mealCount },
    { count: bookSessionCount },
    { data: playbookProgressData },
    { data: goalUserData },
    { data: completedGoalData },
    { data: circleUserData },
    { data: recentPostData },
    { data: circleData },
    { data: circleMemberData },
    { data: circlePostData },
  ] = await Promise.all([
    // Check-ins last 30 days → DAU/WAU/MAU
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('check_ins') as any).select('user_id, date').gte('date', day30s),
    // Tool usage counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('workout_sessions') as any).select('id', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('budget_transactions') as any).select('id', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('challenge_logs') as any).select('id', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('meal_entries') as any).select('id', { count: 'exact', head: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('book_sessions') as any).select('id', { count: 'exact', head: true }),
    // Playbook completions per lesson
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('playbook_progress') as any).select('lesson_id'),
    // Funnel: distinct users at each stage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('goals') as any).select('user_id'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('goals') as any).select('user_id').eq('status', 'complete'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('circle_members') as any).select('user_id'),
    // Recent posts for moderation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('posts') as any)
      .select('id, user_id, type, content, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    // Active circles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('circles') as any).select('id, name'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('circle_members') as any).select('circle_id, user_id'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('posts') as any)
      .select('circle_id')
      .not('circle_id', 'is', null)
      .gte('created_at', day30),
  ])

  // ── COMPUTED: retention ───────────────────────────────────────────────
  type CIRow = { user_id: string; date: string }
  const ciRows = (checkInRows ?? []) as CIRow[]
  const dau = new Set(ciRows.filter(r => r.date === todayS).map(r => r.user_id)).size
  const wau = new Set(ciRows.filter(r => r.date >= day7s).map(r => r.user_id)).size
  const mau = new Set(ciRows.map(r => r.user_id)).size

  // ── COMPUTED: funnel ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usersWithGoal     = new Set((goalUserData     ?? []).map((r: any) => r.user_id)).size
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usersCompleted    = new Set((completedGoalData ?? []).map((r: any) => r.user_id)).size
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usersInCircle     = new Set((circleUserData   ?? []).map((r: any) => r.user_id)).size
  const totalU = totalUsers ?? 0

  const funnelSteps = [
    { label: 'Signed up',        count: totalU,          icon: '🙋', pct: 100 },
    { label: 'Set a goal',       count: usersWithGoal,   icon: '🎯', pct: totalU ? Math.round(usersWithGoal / totalU * 100) : 0 },
    { label: 'Joined a circle',  count: usersInCircle,   icon: '⭕', pct: totalU ? Math.round(usersInCircle  / totalU * 100) : 0 },
    { label: 'Active this month',count: mau,             icon: '🔥', pct: totalU ? Math.round(mau            / totalU * 100) : 0 },
    { label: 'Completed a goal', count: usersCompleted,  icon: '✅', pct: totalU ? Math.round(usersCompleted / totalU * 100) : 0 },
  ]

  // ── COMPUTED: tool usage ──────────────────────────────────────────────
  const playbookLessonCompletions = (playbookProgressData ?? []).length
  const toolUsage = [
    { tool: 'Workout',    emoji: '🏋️', count: workoutCount     ?? 0, color: '#ef4444' },
    { tool: 'Budget',     emoji: '💰', count: budgetCount      ?? 0, color: '#22c55e' },
    { tool: 'Challenges', emoji: '🏆', count: challengeLogCount ?? 0, color: '#D4AF37' },
    { tool: 'Meals',      emoji: '🥗', count: mealCount        ?? 0, color: '#f97316' },
    { tool: 'Reading',    emoji: '📖', count: bookSessionCount ?? 0, color: '#38bdf8' },
    { tool: 'Playbook',   emoji: '📚', count: playbookLessonCompletions, color: '#a78bfa' },
    { tool: 'Journal',    emoji: '📓', count: (totalJournal ?? 0) + (journal7d ?? 0), color: '#f472b6' },
  ].sort((a, b) => b.count - a.count)

  // ── COMPUTED: playbook funnel ─────────────────────────────────────────
  type PLRow = { lesson_id: string }
  const lessonCounts: Record<string, number> = {}
  for (const r of (playbookProgressData ?? []) as PLRow[]) {
    lessonCounts[r.lesson_id] = (lessonCounts[r.lesson_id] ?? 0) + 1
  }
  const playbookFunnel = PLAYBOOK.flatMap(mod =>
    mod.lessons.map(l => ({
      lessonId: l.id,
      title: l.title,
      moduleTitle: mod.title,
      moduleEmoji: mod.emoji,
      color: mod.color,
      completed: lessonCounts[l.id] ?? 0,
    }))
  )

  // ── COMPUTED: active circles ──────────────────────────────────────────
  type CircRow = { id: string; name: string }
  type MembRow = { circle_id: string; user_id: string }
  type PostRow = { circle_id: string | null }

  const membersByCircle: Record<string, number> = {}
  for (const r of (circleMemberData ?? []) as MembRow[]) {
    membersByCircle[r.circle_id] = (membersByCircle[r.circle_id] ?? 0) + 1
  }
  const postsByCircle: Record<string, number> = {}
  for (const r of (circlePostData ?? []) as PostRow[]) {
    if (r.circle_id) postsByCircle[r.circle_id] = (postsByCircle[r.circle_id] ?? 0) + 1
  }
  const activeCircles = ((circleData ?? []) as CircRow[])
    .map(c => ({ id: c.id, name: c.name, memberCount: membersByCircle[c.id] ?? 0, postCount: postsByCircle[c.id] ?? 0 }))
    .sort((a, b) => (b.memberCount + b.postCount * 2) - (a.memberCount + a.postCount * 2))
    .slice(0, 15)

  // ── COMPUTED: existing ────────────────────────────────────────────────
  const signupByDay: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    signupByDay[d.toISOString().split('T')[0]] = 0
  }
  for (const row of (signupRows ?? [])) {
    const d = (row as { created_at: string }).created_at.split('T')[0]
    if (d in signupByDay) signupByDay[d]++
  }
  const signupChart = Object.entries(signupByDay).map(([date, count]) => ({ date, count }))

  const catCounts: Record<string, number> = {}
  for (const row of (goalCatRows ?? [])) {
    const c = (row as { category: string | null }).category ?? 'other'
    catCounts[c] = (catCounts[c] ?? 0) + 1
  }
  const categoryBreakdown = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const typeCounts: Record<string, number> = {}
  for (const row of (journalTypeRows ?? [])) {
    const t = (row as { type: string | null }).type ?? 'other'
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  }
  const journalBreakdown = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requestRows } = await (supabase.from('profiles') as any)
    .select('id, full_name, username, avatar_url, streak, goals_complete, circle_module_complete, created_at')
    .eq('circle_creator_requested', true)
    .eq('circle_creator_approved', false)
    .order('created_at', { ascending: true })

  type CircleRequest = { id: string; full_name: string | null; username: string | null; avatar_url: string | null; streak: number; goals_complete: number; circle_module_complete: boolean; created_at: string }
  const circleRequests = (requestRows ?? []) as CircleRequest[]

  type Builder = { id: string; full_name: string | null; username: string | null; avatar_url: string | null; xp: number; level: number; streak: number; goals_complete: number; created_at: string }
  const allBuilders = (profileRows ?? []) as Builder[]

  type RecentPost = { id: string; user_id: string; type: string; content: string; created_at: string }
  const recentPosts = (recentPostData ?? []) as RecentPost[]

  return (
    <CreatorClient
      stats={{
        totalUsers: totalU, newUsers7d: newUsers7d ?? 0,
        totalGoals: totalGoals ?? 0, goalsCreated7d: goalsCreated7d ?? 0, goalsCompleted: goalsCompleted ?? 0,
        totalPosts: totalPosts ?? 0, posts7d: posts7d ?? 0,
        totalJournal: totalJournal ?? 0, journal7d: journal7d ?? 0,
        totalFollows: totalFollows ?? 0, follows7d: follows7d ?? 0,
        totalCircleJoins: totalCircleJoins ?? 0,
      }}
      topBuilders={allBuilders.slice(0, 20)}
      signupChart={signupChart}
      categoryBreakdown={categoryBreakdown}
      journalBreakdown={journalBreakdown}
      circleRequests={circleRequests}
      retention={{ dau, wau, mau }}
      toolUsage={toolUsage}
      playbookFunnel={playbookFunnel}
      funnelSteps={funnelSteps}
      allBuilders={allBuilders}
      recentPosts={recentPosts}
      activeCircles={activeCircles}
    />
  )
}
