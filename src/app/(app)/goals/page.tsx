import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoalsClient } from './GoalsClient'
import type { Goal, GoalMilestone, GoalBook, GoalEntry } from '@/lib/types/database'

type TrackerBook = { id: string; title: string; author: string | null; total_pages: number | null; current_page: number; status: string; goal_id: string }

export default async function GoalsPage({ searchParams }: { searchParams?: Promise<{ goal?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  const resolvedParams = await searchParams
  const initialGoalId = resolvedParams?.goal ?? null

  const [{ data: profileData }, { data }] = await Promise.all([
    supabase.from('profiles').select('full_name, streak').eq('id', user.id).single(),
    supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const goals = (data as Goal[] | null) ?? []
  const firstName = (profileData as { full_name: string | null; streak: number } | null)?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there'
  const streak = (profileData as { full_name: string | null; streak: number } | null)?.streak ?? 0

  let milestones: GoalMilestone[] = []
  let books: GoalBook[] = []
  let entries: GoalEntry[] = []
  let trackerBooks: TrackerBook[] = []

  if (goals.length > 0) {
    const goalIds = goals.map(g => g.id)

    const [msData, booksData, entriesData, trackerBooksData] = await Promise.all([
      supabase.from('goal_milestones').select('*').in('goal_id', goalIds).order('created_at', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('goal_books') as any).select('*').in('goal_id', goalIds).order('created_at', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('goal_entries') as any).select('*').in('goal_id', goalIds).order('created_at', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('books') as any)
        .select('id, title, author, total_pages, current_page, status, goal_id')
        .in('goal_id', goalIds)
        .order('created_at', { ascending: false }),
    ])
    milestones = (msData.data as GoalMilestone[] | null) ?? []
    books = (booksData.data as GoalBook[] | null) ?? []
    entries = (entriesData.data as GoalEntry[] | null) ?? []
    trackerBooks = (trackerBooksData.data ?? []) as TrackerBook[]
  }

  return <GoalsClient goals={goals} milestones={milestones} books={books} entries={entries} trackerBooks={trackerBooks} initialGoalId={initialGoalId} firstName={firstName} streak={streak} />
}
