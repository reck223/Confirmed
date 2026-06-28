'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createGoal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Title is required' }

  const goalType = (formData.get('goal_type') as string) || 'standard'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goalRow, error } = await (supabase.from('goals') as any).insert({
    user_id: user.id,
    title,
    category: (formData.get('category') as string) || null,
    why_it_matters: (formData.get('why') as string)?.trim() || null,
    next_action: (formData.get('next_action') as string)?.trim() || null,
    deadline: (formData.get('deadline') as string) || null,
    visibility: (formData.get('visibility') as string) || 'circle',
    goal_type: goalType,
  }).select('id').single()

  if (error) return { error: error.message }

  const milestoneTexts = (formData.getAll('milestone') as string[]).map(t => t.trim()).filter(Boolean)
  if (milestoneTexts.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('goal_milestones') as any).insert(
      milestoneTexts.map((text: string) => ({ goal_id: goalRow.id, text }))
    )
  }

  // If a reading goal was created with a currently-reading book, track it in goal_books
  const nextAction = (formData.get('next_action') as string)?.trim()
  if (goalType === 'reading' && nextAction) {
    const bookAuthor  = (formData.get('book_author')    as string)?.trim() || null
    const bookCover   = (formData.get('book_cover_url') as string)?.trim() || null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('goal_books') as any).insert({
      goal_id: goalRow.id, user_id: user.id,
      title: nextAction, author: bookAuthor, cover_url: bookCover, status: 'reading',
    })
  }

  revalidatePath('/goals')
  revalidatePath('/home')
  redirect('/goals')
}

export async function saveMilestones(goalId: string, milestones: { id?: string; text: string }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('goal_milestones') as any).select('id').eq('goal_id', goalId)
  const existingIds = ((existing ?? []) as { id: string }[]).map(m => m.id)
  const incomingIds = milestones.filter(m => m.id).map(m => m.id!)

  const toDelete = existingIds.filter(id => !incomingIds.includes(id))
  if (toDelete.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('goal_milestones') as any).delete().in('id', toDelete)
  }

  for (const m of milestones.filter(m => m.id && m.text.trim())) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('goal_milestones') as any).update({ text: m.text.trim() }).eq('id', m.id)
  }

  const toInsert = milestones.filter(m => !m.id && m.text.trim()).map(m => ({ goal_id: goalId, text: m.text.trim() }))
  if (toInsert.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('goal_milestones') as any).insert(toInsert)
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function toggleMilestone(milestoneId: string, done: boolean, goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goal_milestones') as any).update({ done }).eq('id', milestoneId)
  if (error) return { error: error.message }

  // Recalculate goal progress from milestones
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: all } = await (supabase.from('goal_milestones') as any).select('done').eq('goal_id', goalId)
  if (all && all.length > 0) {
    const doneCount = (all as { done: boolean }[]).filter(m => m.done).length
    const progress = Math.round(doneCount / all.length * 100)
    const allDone = doneCount === all.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('goals') as any).update({
      progress,
      ...(allDone ? { status: 'complete', completed_date: new Date().toISOString().split('T')[0] } : {}),
    }).eq('id', goalId).eq('user_id', user.id)
  }

  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}

export async function updateGoalProgress(goalId: string, progress: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .update({ progress, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}

export async function restartGoal(goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .update({ status: 'active', progress: 0, completed_date: null })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  return { success: true }
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .delete()
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/home')
  redirect('/goals')
}

export async function addBook(goalId: string, title: string, author: string, coverUrl: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // If no book is currently being read, set this one as 'reading'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reading } = await (supabase.from('goal_books') as any)
    .select('id').eq('goal_id', goalId).eq('status', 'reading').limit(1)
  const status = reading && reading.length > 0 ? 'queue' : 'reading'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goal_books') as any).insert({
    goal_id: goalId, user_id: user.id,
    title, author: author || null, cover_url: coverUrl || null, status,
  })
  if (error) return { error: error.message }

  if (status === 'reading') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('goals') as any).update({ next_action: title }).eq('id', goalId).eq('user_id', user.id)
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function setBookReading(bookId: string, goalId: string, title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Move existing 'reading' books back to queue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goal_books') as any)
    .update({ status: 'queue' }).eq('goal_id', goalId).eq('user_id', user.id).eq('status', 'reading')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goal_books') as any).update({ status: 'reading' }).eq('id', bookId).eq('user_id', user.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goals') as any).update({ next_action: title }).eq('id', goalId).eq('user_id', user.id)

  revalidatePath('/goals')
  return { success: true }
}

export async function markBookDone(bookId: string, goalId: string, rating: number, dateFinished: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goal_books') as any).update({
    status: 'read',
    rating: rating || null,
    date_finished: dateFinished || null,
  }).eq('id', bookId).eq('user_id', user.id)

  // Recalculate progress from read count vs target
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase.from('goal_books') as any)
    .select('*', { count: 'exact', head: true })
    .eq('goal_id', goalId).eq('user_id', user.id).eq('status', 'read')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goalData } = await (supabase.from('goals') as any)
    .select('why_it_matters').eq('id', goalId).eq('user_id', user.id).single()
  const booksTotal = parseInt(goalData?.why_it_matters ?? '') || 12
  const progress = Math.min(100, Math.round(((count ?? 0) / booksTotal) * 100))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goals') as any)
    .update({ progress, next_action: null }).eq('id', goalId).eq('user_id', user.id)

  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}

export async function unmarkBookDone(bookId: string, goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Move back to queue and clear rating/date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goal_books') as any)
    .update({ status: 'queue', rating: null, date_finished: null })
    .eq('id', bookId).eq('user_id', user.id)

  // Recalculate progress
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase.from('goal_books') as any)
    .select('*', { count: 'exact', head: true })
    .eq('goal_id', goalId).eq('user_id', user.id).eq('status', 'read')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goalData } = await (supabase.from('goals') as any)
    .select('why_it_matters').eq('id', goalId).eq('user_id', user.id).single()
  const booksTotal = parseInt(goalData?.why_it_matters ?? '') || 12
  const progress = Math.min(100, Math.round(((count ?? 0) / booksTotal) * 100))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goals') as any)
    .update({ progress }).eq('id', goalId).eq('user_id', user.id)

  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}

export async function removeBook(bookId: string, goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: book } = await (supabase.from('goal_books') as any)
    .select('status').eq('id', bookId).eq('user_id', user.id).single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goal_books') as any).delete().eq('id', bookId).eq('user_id', user.id)

  if (book?.status === 'reading') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('goals') as any).update({ next_action: null }).eq('id', goalId).eq('user_id', user.id)
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function updateGoalDeadline(goalId: string, deadline: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .update({ deadline: deadline || null })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}

export async function updateGoalNotes(goalId: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .update({ why_it_matters: notes.trim() || null })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  return { success: true }
}

export async function updateGoalVisibility(goalId: string, visibility: 'private' | 'circle' | 'public') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .update({ visibility })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}

export async function completeGoal(goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .update({ status: 'complete', progress: 100, completed_date: new Date().toISOString().split('T')[0] })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}
