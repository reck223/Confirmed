import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoalsClient } from './GoalsClient'
import type { Goal, GoalMilestone, GoalBook, GoalEntry } from '@/lib/types/database'

export default async function GoalsPage({ searchParams }: { searchParams?: Promise<{ goal?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  const resolvedParams = await searchParams
  const initialGoalId = resolvedParams?.goal ?? null

  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const goals = (data as Goal[] | null) ?? []

  let milestones: GoalMilestone[] = []
  let books: GoalBook[] = []
  let entries: GoalEntry[] = []

  if (goals.length > 0) {
    const goalIds = goals.map(g => g.id)

    const [msData, booksData, entriesData] = await Promise.all([
      supabase.from('goal_milestones').select('*').in('goal_id', goalIds).order('created_at', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('goal_books') as any).select('*').in('goal_id', goalIds).order('created_at', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('goal_entries') as any).select('*').in('goal_id', goalIds).order('created_at', { ascending: true }),
    ])
    milestones = (msData.data as GoalMilestone[] | null) ?? []
    books = (booksData.data as GoalBook[] | null) ?? []
    entries = (entriesData.data as GoalEntry[] | null) ?? []
  }

  return <GoalsClient goals={goals} milestones={milestones} books={books} entries={entries} initialGoalId={initialGoalId} />
}
