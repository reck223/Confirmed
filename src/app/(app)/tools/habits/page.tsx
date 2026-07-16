import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChallengesClient } from './ChallengesClient'

export default async function ChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const today = new Date().toISOString().split('T')[0]
  const since90 = new Date(); since90.setDate(since90.getDate() - 90)
  const since90Str = since90.toISOString().split('T')[0]

  const [{ data: challengeRows }, { data: logRows }, { data: goalRows }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('challenges') as any)
      .select('id, title, description, category, goal_id, duration_days, start_date, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('challenge_logs') as any)
      .select('challenge_id, log_date, note')
      .eq('user_id', user.id)
      .gte('log_date', since90Str),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('goals') as any)
      .select('id, title')
      .eq('user_id', user.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  type CRow = { id: string; title: string; description: string | null; category: string | null; goal_id: string | null; duration_days: number; start_date: string; created_at: string }
  type LRow = { challenge_id: string; log_date: string; note: string | null }
  type GRow = { id: string; title: string }

  const challenges = (challengeRows ?? []) as CRow[]
  const logs       = (logRows ?? []) as LRow[]
  const goals      = (goalRows ?? []) as GRow[]

  const logsByChallenge = new Map<string, LRow[]>()
  for (const l of logs) {
    if (!logsByChallenge.has(l.challenge_id)) logsByChallenge.set(l.challenge_id, [])
    logsByChallenge.get(l.challenge_id)!.push(l)
  }

  function calcStreak(challengeLogs: LRow[], startDate: string): number {
    const logSet = new Set(challengeLogs.map(l => l.log_date))
    let streak = 0
    const base = new Date(today)
    for (let i = 0; i < 90; i++) {
      const d = new Date(base); d.setDate(base.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      if (ds < startDate) break
      if (logSet.has(ds)) streak++
      else break
    }
    return streak
  }

  const enriched = challenges.map(c => {
    const cLogs = logsByChallenge.get(c.id) ?? []
    return {
      ...c,
      logs: cLogs,
      streak: calcStreak(cLogs, c.start_date),
      daysLogged: cLogs.length,
    }
  })

  return <ChallengesClient challenges={enriched} goals={goals} today={today} />
}
