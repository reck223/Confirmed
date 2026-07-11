import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WorkoutClient } from './WorkoutClient'

export default async function WorkoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const today   = new Date().toISOString().split('T')[0]
  const since90 = new Date(); since90.setDate(since90.getDate() - 90)
  const sinceStr = since90.toISOString().split('T')[0]

  // Parallel: sessions, goals, templates, body weight logs
  const [
    { data: sessionRows },
    { data: goalRows },
    { data: templateRows },
    { data: bwRows },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('workout_sessions') as any)
      .select('id, name, date, duration_mins, goal_id')
      .eq('user_id', user.id)
      .gte('date', sinceStr)
      .order('date', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('goals') as any)
      .select('id, title, category')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('workout_templates') as any)
      .select('id, name, exercises')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('body_weight_logs') as any)
      .select('date, weight_lbs')
      .eq('user_id', user.id)
      .gte('date', sinceStr)
      .order('date', { ascending: true }),
  ])

  type SessionRow  = { id: string; name: string; date: string; duration_mins: number | null; goal_id: string | null }
  type GoalRow     = { id: string; title: string; category: string | null }
  type TemplateRow = { id: string; name: string; exercises: unknown }
  type BwRow       = { date: string; weight_lbs: number }

  const sessions  = (sessionRows  ?? []) as SessionRow[]
  const goals     = (goalRows     ?? []) as GoalRow[]
  const bwLogs    = (bwRows       ?? []) as BwRow[]
  const templates = ((templateRows ?? []) as TemplateRow[]).map(t => ({
    id: t.id,
    name: t.name,
    exercises: (t.exercises ?? []) as { name: string; isCardio: boolean; sets: { reps: number | null; weightLbs: number | null; durationMins: number | null }[] }[],
  }))
  const goalMap = new Map(goals.map(g => [g.id, g.title]))

  if (sessions.length === 0) {
    return <WorkoutClient sessions={[]} prs={{}} goals={goals} templates={templates} bwLogs={bwLogs} today={today} />
  }

  const sessionIds = sessions.map(s => s.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: exerciseRows } = await (supabase.from('workout_exercises') as any)
    .select('id, session_id, name, sort_order')
    .in('session_id', sessionIds)
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  type ExRow = { id: string; session_id: string; name: string; sort_order: number }
  const exercises = (exerciseRows ?? []) as ExRow[]

  type SetRow = { id: string; exercise_id: string; set_number: number; reps: number | null; weight_lbs: number | null; duration_mins: number | null }
  let sets: SetRow[] = []
  const exerciseIds = exercises.map(e => e.id)
  if (exerciseIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: setRows } = await (supabase.from('workout_sets') as any)
      .select('id, exercise_id, set_number, reps, weight_lbs, duration_mins')
      .in('exercise_id', exerciseIds)
      .eq('user_id', user.id)
      .order('set_number', { ascending: true })
    sets = (setRows ?? []) as SetRow[]
  }

  const setsByEx = new Map<string, SetRow[]>()
  for (const s of sets) {
    if (!setsByEx.has(s.exercise_id)) setsByEx.set(s.exercise_id, [])
    setsByEx.get(s.exercise_id)!.push(s)
  }

  const bySession = new Map<string, (ExRow & { sets: SetRow[] })[]>()
  for (const e of exercises) {
    if (!bySession.has(e.session_id)) bySession.set(e.session_id, [])
    bySession.get(e.session_id)!.push({ ...e, sets: setsByEx.get(e.id) ?? [] })
  }

  // All-time PRs from fetched set data (90 days)
  const prs: Record<string, number> = {}
  for (const s of sets) {
    const ex = exercises.find(e => e.id === s.exercise_id)
    if (ex && s.weight_lbs) prs[ex.name] = Math.max(prs[ex.name] ?? 0, s.weight_lbs)
  }

  const fullSessions = sessions.map(s => ({
    ...s,
    goalTitle: s.goal_id ? (goalMap.get(s.goal_id) ?? null) : null,
    exercises: bySession.get(s.id) ?? [],
  }))

  return (
    <WorkoutClient
      sessions={fullSessions}
      prs={prs}
      goals={goals}
      templates={templates}
      bwLogs={bwLogs}
      today={today}
    />
  )
}
