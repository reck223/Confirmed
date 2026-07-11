import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreatorClient } from './CreatorClient'

const CREATOR_EMAIL = 'graysdarius@gmail.com'

export default async function CreatorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (user.email !== CREATOR_EMAIL) redirect('/home')

  const now = new Date()
  const day7  = new Date(now.getTime() - 7  * 86400000).toISOString()
  const day30 = new Date(now.getTime() - 30 * 86400000).toISOString()

  // All queries in parallel
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
    // Top builders by XP
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('profiles') as any)
      .select('id, full_name, username, avatar_url, xp, level, streak, goals_complete, created_at')
      .order('xp', { ascending: false })
      .limit(20),
    // Signups last 30 days (for chart)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('profiles') as any)
      .select('created_at')
      .gte('created_at', day30)
      .order('created_at', { ascending: true }),
    // Goal categories breakdown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('goals') as any).select('category'),
    // Journal types breakdown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('journal_entries') as any).select('type'),
  ])

  // Build daily signup chart data (last 30 days)
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

  // Goal category breakdown
  const catCounts: Record<string, number> = {}
  for (const row of (goalCatRows ?? [])) {
    const c = (row as { category: string | null }).category ?? 'other'
    catCounts[c] = (catCounts[c] ?? 0) + 1
  }
  const categoryBreakdown = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Journal type breakdown
  const typeCounts: Record<string, number> = {}
  for (const row of (journalTypeRows ?? [])) {
    const t = (row as { type: string | null }).type ?? 'other'
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  }
  const journalBreakdown = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])

  // Circle creation requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requestRows } = await (supabase.from('profiles') as any)
    .select('id, full_name, username, avatar_url, streak, goals_complete, circle_module_complete, created_at')
    .eq('circle_creator_requested', true)
    .eq('circle_creator_approved', false)
    .order('created_at', { ascending: true })

  type CircleRequest = { id: string; full_name: string | null; username: string | null; avatar_url: string | null; streak: number; goals_complete: number; circle_module_complete: boolean; created_at: string }
  const circleRequests = (requestRows ?? []) as CircleRequest[]

  return (
    <CreatorClient
      stats={{
        totalUsers:       totalUsers ?? 0,
        newUsers7d:       newUsers7d ?? 0,
        totalGoals:       totalGoals ?? 0,
        goalsCreated7d:   goalsCreated7d ?? 0,
        goalsCompleted:   goalsCompleted ?? 0,
        totalPosts:       totalPosts ?? 0,
        posts7d:          posts7d ?? 0,
        totalJournal:     totalJournal ?? 0,
        journal7d:        journal7d ?? 0,
        totalFollows:     totalFollows ?? 0,
        follows7d:        follows7d ?? 0,
        totalCircleJoins: totalCircleJoins ?? 0,
      }}
      topBuilders={(profileRows ?? []) as { id: string; full_name: string | null; username: string | null; avatar_url: string | null; xp: number; level: number; streak: number; goals_complete: number; created_at: string }[]}
      signupChart={signupChart}
      categoryBreakdown={categoryBreakdown}
      journalBreakdown={journalBreakdown}
      circleRequests={circleRequests}
    />
  )
}
