import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoalsClient } from './GoalsClient'
import type { Goal, GoalMilestone, GoalBook } from '@/lib/types/database'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const goals = (data as Goal[] | null) ?? []

  let milestones: GoalMilestone[] = []
  let books: GoalBook[] = []

  if (goals.length > 0) {
    const goalIds = goals.map(g => g.id)

    const { data: msData } = await supabase
      .from('goal_milestones')
      .select('*')
      .in('goal_id', goalIds)
      .order('created_at', { ascending: true })
    milestones = (msData as GoalMilestone[] | null) ?? []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: booksData } = await (supabase.from('goal_books') as any)
      .select('*')
      .in('goal_id', goalIds)
      .order('created_at', { ascending: true })
    books = (booksData as GoalBook[] | null) ?? []
  }

  return <GoalsClient goals={goals} milestones={milestones} books={books} />
}
