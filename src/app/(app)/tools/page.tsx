import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ToolsHubClient } from './ToolsHubClient'

export default async function ToolsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const today = new Date().toISOString().split('T')[0]

  // Week start (Monday)
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek)
  const weekStart = monday.toISOString().split('T')[0]

  const [
    { data: todayEntries },
    { data: habits },
    { data: completionsToday },
    { count: deckCount },
    { count: cardsDue },
    { count: mealsToday },
    { count: workoutsThisWeek },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('journal_entries') as any)
      .select('type, content')
      .eq('user_id', user.id)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lte('created_at', today + 'T23:59:59.999Z'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('habits') as any).select('id').eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('habit_completions') as any)
      .select('habit_id').eq('user_id', user.id).eq('completed_date', today),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('study_decks') as any)
      .select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('study_cards') as any)
      .select('id', { count: 'exact', head: true }).eq('user_id', user.id).lte('next_review', today),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('meal_entries') as any)
      .select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('plan_date', today),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('workout_sessions') as any)
      .select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('date', weekStart),
  ])

  type Entry = { type: string | null; content: { checkin_type?: string } }
  const entries    = (todayEntries ?? []) as Entry[]
  const morningDone = entries.some(e => e.type === 'checkin' && e.content?.checkin_type === 'morning')
  const eveningDone = entries.some(e => e.type === 'checkin' && e.content?.checkin_type === 'evening')
  const habitTotal  = (habits ?? []).length
  const habitsDone  = (completionsToday ?? []).length

  return (
    <ToolsHubClient
      morningDone={morningDone}
      eveningDone={eveningDone}
      habitTotal={habitTotal}
      habitsDone={habitsDone}
      deckCount={deckCount ?? 0}
      cardsDue={cardsDue ?? 0}
      mealsToday={mealsToday ?? 0}
      workoutsThisWeek={workoutsThisWeek ?? 0}
    />
  )
}
