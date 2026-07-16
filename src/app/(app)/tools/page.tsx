import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ToolsHubClient } from './ToolsHubClient'
import { PLAYBOOK } from '../playbook/content'

export default async function ToolsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const today = new Date().toISOString().split('T')[0]
  const thisMonthStart = today.slice(0, 7) + '-01'

  // Week start (Monday)
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek)
  const weekStart = monday.toISOString().split('T')[0]

  const [
    { data: todayEntries },
    { data: challenges },
    { data: challengeLogsToday },
    { data: budgetTxns },
    { count: mealsToday },
    { count: workoutsThisWeek },
    { data: booksReading },
    { data: bookSessionsMonth },
    { data: playbookRows },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('journal_entries') as any)
      .select('type, content')
      .eq('user_id', user.id)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lte('created_at', today + 'T23:59:59.999Z'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('challenges') as any)
      .select('id')
      .eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('challenge_logs') as any)
      .select('challenge_id')
      .eq('user_id', user.id)
      .eq('log_date', today),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('budget_transactions') as any)
      .select('amount, type')
      .eq('user_id', user.id)
      .gte('txn_date', thisMonthStart)
      .lte('txn_date', today)
      .eq('type', 'expense'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('meal_entries') as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('plan_date', today),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('workout_sessions') as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('date', weekStart),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('books') as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'reading'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('book_sessions') as any)
      .select('pages_read')
      .eq('user_id', user.id)
      .gte('session_date', thisMonthStart),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('playbook_progress') as any)
      .select('lesson_id')
      .eq('user_id', user.id),
  ])

  type Entry = { type: string | null; content: { checkin_type?: string } }
  type BudgetTxn = { amount: number; type: string }
  type BookSession = { pages_read: number }

  const entries    = (todayEntries ?? []) as Entry[]
  const morningDone = entries.some(e => e.type === 'checkin' && e.content?.checkin_type === 'morning')
  const eveningDone = entries.some(e => e.type === 'checkin' && e.content?.checkin_type === 'evening')

  const challengeCount    = (challenges ?? []).length
  const challengesTodayDone = (challengeLogsToday ?? []).length

  const monthExpenses = ((budgetTxns ?? []) as BudgetTxn[]).reduce((s, t) => s + t.amount, 0)

  const pagesThisMonth = ((bookSessionsMonth ?? []) as BookSession[]).reduce((s, r) => s + r.pages_read, 0)

  const totalLessons = PLAYBOOK.reduce((acc, m) => acc + m.lessons.length, 0)
  const completedLessonIds = ((playbookRows ?? []) as { lesson_id: string }[]).map(r => r.lesson_id)
  const lessonsCompleted = PLAYBOOK.reduce(
    (acc, m) => acc + m.lessons.filter(l => completedLessonIds.includes(l.id)).length, 0
  )

  return (
    <ToolsHubClient
      morningDone={morningDone}
      eveningDone={eveningDone}
      challengeCount={challengeCount}
      challengesTodayDone={challengesTodayDone}
      monthExpenses={monthExpenses}
      booksReading={(booksReading ?? []).length}
      pagesThisMonth={pagesThisMonth}
      mealsToday={mealsToday ?? 0}
      workoutsThisWeek={workoutsThisWeek ?? 0}
      lessonsCompleted={lessonsCompleted}
      totalLessons={totalLessons}
    />
  )
}
