'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addBook(
  title: string,
  author: string,
  totalPages: number | null,
  status: 'want' | 'reading' | 'finished',
  goalId: string | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const today = new Date().toISOString().split('T')[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('books') as any).insert({
    user_id: user.id, title, author: author || null,
    total_pages: totalPages, status, goal_id: goalId || null,
    started_date: status === 'reading' || status === 'finished' ? today : null,
    finished_date: status === 'finished' ? today : null,
  })
  revalidatePath('/tools/reading')
  revalidatePath('/tools')
}

export async function updateBookStatus(
  bookId: string,
  status: 'want' | 'reading' | 'finished',
  currentPage?: number,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const today = new Date().toISOString().split('T')[0]
  const update: Record<string, unknown> = { status }
  if (currentPage !== undefined) update.current_page = currentPage
  if (status === 'reading') update.started_date = today
  if (status === 'finished') { update.finished_date = today; update.started_date = today }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('books') as any).update(update).eq('id', bookId).eq('user_id', user.id)
  revalidatePath('/tools/reading')
  revalidatePath('/tools')
}

export async function logReadingSession(
  bookId: string,
  pagesRead: number,
  note: string,
  newCurrentPage: number,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const today = new Date().toISOString().split('T')[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('book_sessions') as any).insert({
    book_id: bookId, user_id: user.id,
    session_date: today, pages_read: pagesRead, note: note || null,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('books') as any)
    .update({ current_page: newCurrentPage })
    .eq('id', bookId).eq('user_id', user.id)
  revalidatePath('/tools/reading')
  revalidatePath('/tools')
}

export async function deleteBook(bookId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('books') as any).delete().eq('id', bookId).eq('user_id', user.id)
  revalidatePath('/tools/reading')
  revalidatePath('/tools')
}
