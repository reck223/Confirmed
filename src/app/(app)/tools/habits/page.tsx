import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HabitsClient } from './HabitsClient'

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // Last 7 days for the week grid (oldest → today)
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  const today = days[6]

  // 90 days back for accurate long-term streaks
  const since90 = new Date(); since90.setDate(since90.getDate() - 89)
  const since90Str = since90.toISOString().split('T')[0]

  const [{ data: habitRows }, { data: completionRows }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('habits') as any)
      .select('id, name, icon, color, sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('habit_completions') as any)
      .select('habit_id, completed_date')
      .eq('user_id', user.id)
      .gte('completed_date', since90Str)
      .lte('completed_date', today),
  ])

  type Habit      = { id: string; name: string; icon: string; color: string; sort_order: number }
  type Completion = { habit_id: string; completed_date: string }

  const habits      = (habitRows ?? []) as Habit[]
  const completions = (completionRows ?? []) as Completion[]

  // Full completion set for the 90-day window
  const fullSet = new Set(completions.map(c => `${c.habit_id}|${c.completed_date}`))

  // 7-day subset for the grid UI
  const doneSet = new Set([...fullSet].filter(k => {
    const date = k.split('|')[1]
    return date >= days[0] && date <= today
  }))

  // Real streak: walk back from today until a gap is found (up to 90 days)
  function streak(habitId: string): number {
    let s = 0
    const base = new Date(today)
    for (let i = 0; i < 90; i++) {
      const d = new Date(base); d.setDate(base.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      if (fullSet.has(`${habitId}|${dateStr}`)) s++
      else break
    }
    return s
  }

  const habitsWithStreak = habits.map(h => ({ ...h, streak: streak(h.id) }))

  // 84-day heatmap (12 weeks) — how many habits were done each day
  type HeatDay = { date: string; done: number; total: number }
  const heatmapDays: HeatDay[] = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const done = habits.filter(h => fullSet.has(`${h.id}|${dateStr}`)).length
    heatmapDays.push({ date: dateStr, done, total: habits.length })
  }

  return (
    <HabitsClient
      habits={habitsWithStreak}
      days={days}
      today={today}
      doneSet={[...doneSet]}
      heatmapDays={heatmapDays}
    />
  )
}
