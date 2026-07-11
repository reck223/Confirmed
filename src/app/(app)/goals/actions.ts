'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createNotification } from '@/lib/notifications'
import { XP_EVENTS } from '@/lib/xp'
import { awardXP } from '@/lib/xp-server'
import { ACHIEVEMENT_META, type AchievementType } from '@/lib/achievements'
import { checkGoalAchievements, checkMilestoneAchievements } from '@/lib/achievements-server'

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

  // Award XP for completing a milestone
  if (done) {
    await awardXP(user.id, XP_EVENTS.MILESTONE_DONE)
    await checkMilestoneAchievements(user.id)
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

export async function updateGoalMeta(goalId: string, title: string, category: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const trimmed = title.trim()
  if (!trimmed) return { error: 'Title is required' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .update({ title: trimmed, category: category || null })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/home')
  revalidatePath('/circle')
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

  const { data: goalData } = await supabase.from('goals').select('title').eq('id', goalId).single()
  const goalTitle = (goalData as { title: string } | null)?.title ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goals') as any)
    .update({ status: 'complete', progress: 100, completed_date: new Date().toISOString().split('T')[0] })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // Increment goals_complete on profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (supabase.from('profiles') as any)
    .select('full_name, goals_complete')
    .eq('id', user.id).single()
  const profile = profileData as { full_name: string | null; goals_complete: number } | null
  const newGoalsComplete = (profile?.goals_complete ?? 0) + 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any)
    .update({ goals_complete: newGoalsComplete })
    .eq('id', user.id)

  // Award XP + achievements
  const xpResult = await awardXP(user.id, XP_EVENTS.GOAL_COMPLETE)
  const earnedTypes = await checkGoalAchievements(user.id, newGoalsComplete)
  const earnedAchievements = earnedTypes.map(t => ({ type: t, ...ACHIEVEMENT_META[t as AchievementType] }))

  // Notify followers
  const name = profile?.full_name ?? 'Someone'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: followers } = await (supabase.from('follows') as any)
    .select('follower_id').eq('following_id', user.id)
  await Promise.all(((followers ?? []) as { follower_id: string }[]).map(f =>
    createNotification(f.follower_id, 'goal_complete', { name, goal_title: goalTitle })
  ))

  revalidatePath('/goals')
  revalidatePath('/home')
  return {
    success: true,
    xpGained: XP_EVENTS.GOAL_COMPLETE,
    newXP: xpResult.newXP,
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    earnedAchievements,
    goalTitle,
  }
}

// ── GOAL ENTRIES (Habit / Savings / Travel) ──────────────────────────────

type EntryContent = Record<string, unknown>

async function recalcEntryProgress(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  goalId: string,
  goalType: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entries } = await (supabase.from('goal_entries') as any)
    .select('content, created_at')
    .eq('goal_id', goalId)

  const all = (entries ?? []) as { content: EntryContent; created_at: string }[]

  let progress = 0

  if (goalType === 'habit') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goalRow } = await (supabase.from('goals') as any)
      .select('created_at, next_action').eq('id', goalId).single()
    const daysSinceStart = Math.max(1, Math.ceil(
      (Date.now() - new Date((goalRow as { created_at: string })?.created_at ?? 0).getTime()) / 86400000
    ))
    const freq = (goalRow as { next_action: string | null })?.next_action ?? 'daily'
    const ratio = freq === 'daily' ? 1 : freq === 'weekdays' ? 5 / 7 : freq === '5x' ? 5 / 7 : 3 / 7
    const target = Math.max(1, Math.round(daysSinceStart * ratio))
    const logs = all.filter(e => e.content.type !== 'destination')
    progress = Math.min(100, Math.round((logs.length / target) * 100))
  } else if (goalType === 'savings') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: goalRow } = await (supabase.from('goals') as any)
      .select('next_action').eq('id', goalId).single()
    const target = parseFloat(String((goalRow as { next_action: string | null })?.next_action ?? '1')) || 1
    const total = all.reduce((s, e) => s + (parseFloat(String(e.content.amount ?? '0')) || 0), 0)
    progress = Math.min(100, Math.round((total / target) * 100))
  } else if (goalType === 'travel') {
    const dests = all.filter(e => e.content.type !== 'habit_log' && e.content.type !== 'contribution')
    const done = dests.filter(e => e.content.status === 'done')
    progress = dests.length > 0 ? Math.min(100, Math.round((done.length / dests.length) * 100)) : 0
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goals') as any).update({ progress }).eq('id', goalId)
}

export async function addGoalEntry(goalId: string, type: string, content: EntryContent) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goalRow } = await (supabase.from('goals') as any)
    .select('goal_type').eq('id', goalId).eq('user_id', user.id).single()
  if (!goalRow) return { error: 'Goal not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goal_entries') as any).insert({
    goal_id: goalId,
    user_id: user.id,
    type,
    content,
  })
  if (error) return { error: error.message }

  await recalcEntryProgress(supabase, goalId, (goalRow as { goal_type: string }).goal_type)
  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}

export async function removeGoalEntry(entryId: string, goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goalRow } = await (supabase.from('goals') as any)
    .select('goal_type').eq('id', goalId).eq('user_id', user.id).single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goal_entries') as any)
    .delete().eq('id', entryId).eq('user_id', user.id)
  if (error) return { error: error.message }

  if (goalRow) {
    await recalcEntryProgress(supabase, goalId, (goalRow as { goal_type: string }).goal_type)
  }
  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}

export async function updateGoalEntry(entryId: string, goalId: string, content: EntryContent) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goalRow } = await (supabase.from('goals') as any)
    .select('goal_type').eq('id', goalId).eq('user_id', user.id).single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goal_entries') as any)
    .update({ content }).eq('id', entryId).eq('user_id', user.id)
  if (error) return { error: error.message }

  if (goalRow) {
    await recalcEntryProgress(supabase, goalId, (goalRow as { goal_type: string }).goal_type)
  }
  revalidatePath('/goals')
  revalidatePath('/home')
  return { success: true }
}

// ── GOAL SOCIAL ──────────────────────────────────────────────────────────────

export async function toggleGoalReaction(goalId: string, type: 'fire' | 'believe' | 'cheer') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('goal_reactions') as any)
    .select('id').eq('goal_id', goalId).eq('user_id', user.id).eq('type', type).single()

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('goal_reactions') as any).delete().eq('id', (existing as { id: string }).id)
    revalidatePath('/circle')
    return { success: true, active: false }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goal_reactions') as any).insert({ goal_id: goalId, user_id: user.id, type })

  // Notify goal owner
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goal } = await (supabase.from('goals') as any).select('user_id, title').eq('id', goalId).single()
  const { data: reactor } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  if (goal && (goal as { user_id: string }).user_id !== user.id) {
    await createNotification((goal as { user_id: string }).user_id, 'goal_reaction', {
      reactor_name: (reactor as { full_name: string | null } | null)?.full_name ?? 'Someone',
      reaction_type: type,
      goal_title: (goal as { title: string }).title,
    })
  }

  revalidatePath('/circle')
  return { success: true, active: true }
}

export async function addGoalComment(goalId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const text = content.trim()
  if (!text) return { error: 'Comment cannot be empty' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goal_comments') as any)
    .insert({ goal_id: goalId, user_id: user.id, content: text })
  if (error) return { error: error.message }

  // Notify goal owner
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goal } = await (supabase.from('goals') as any).select('user_id, title').eq('id', goalId).single()
  const { data: commenter } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  if (goal && (goal as { user_id: string }).user_id !== user.id) {
    await createNotification((goal as { user_id: string }).user_id, 'goal_comment', {
      commenter_name: (commenter as { full_name: string | null } | null)?.full_name ?? 'Someone',
      goal_title: (goal as { title: string }).title,
      preview: text.slice(0, 60),
    })
  }

  revalidatePath('/circle')
  return { success: true }
}

export async function removeGoalComment(commentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goal_comments') as any).delete().eq('id', commentId).eq('user_id', user.id)
  revalidatePath('/circle')
  return { success: true }
}
