import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReadingClient } from './ReadingClient'

export default async function ReadingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const thisYear = new Date().getFullYear().toString()

  const [{ data: bookRows }, { data: goalRows }, { data: sessionRows }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('books') as any)
      .select('id, title, author, total_pages, current_page, status, goal_id, started_date, finished_date, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('goals') as any)
      .select('id, title, category, progress')
      .eq('user_id', user.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(20),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('book_sessions') as any)
      .select('id, book_id, session_date, pages_read, note')
      .eq('user_id', user.id)
      .gte('session_date', `${thisYear}-01-01`)
      .order('session_date', { ascending: false }),
  ])

  type BookRow = { id: string; title: string; author: string | null; total_pages: number | null; current_page: number; status: 'want' | 'reading' | 'finished'; goal_id: string | null; started_date: string | null; finished_date: string | null; notes: string | null; created_at: string }
  type GoalRow = { id: string; title: string; category: string | null; progress: number }
  type SessRow = { id: string; book_id: string; session_date: string; pages_read: number; note: string | null }

  const books    = (bookRows    ?? []) as BookRow[]
  const goals    = (goalRows    ?? []) as GoalRow[]
  const sessions = (sessionRows ?? []) as SessRow[]

  const sessionsByBook = new Map<string, SessRow[]>()
  for (const s of sessions) {
    if (!sessionsByBook.has(s.book_id)) sessionsByBook.set(s.book_id, [])
    sessionsByBook.get(s.book_id)!.push(s)
  }

  const enriched = books.map(b => ({
    ...b,
    sessions: sessionsByBook.get(b.id) ?? [],
  }))

  const booksFinishedThisYear = books.filter(b => b.status === 'finished' && b.finished_date?.startsWith(thisYear)).length
  const totalPagesThisYear    = sessions.reduce((s, r) => s + r.pages_read, 0)

  return (
    <ReadingClient
      books={enriched}
      goals={goals}
      booksFinishedThisYear={booksFinishedThisYear}
      totalPagesThisYear={totalPagesThisYear}
    />
  )
}
