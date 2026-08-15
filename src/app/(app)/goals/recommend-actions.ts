'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'

// Recommend a goal (yours, or any public goal you admire) to a specific
// friend. Snapshots title/category/goal_type/milestones at send time —
// looked up server-side from sourceGoalId rather than trusting client-sent
// fields, same reasoning as buildCircleSummary: don't let the client hand
// us arbitrary goal content to notify someone else with.
export async function recommendGoal(sourceGoalId: string, recipientId: string, note?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  if (user.id === recipientId) return { error: "You can't recommend a goal to yourself" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goal } = await (supabase.from('goals') as any)
    .select('id, user_id, title, category, goal_type, visibility')
    .eq('id', sourceGoalId)
    .single()

  if (!goal) return { error: 'Goal not found' }
  if (goal.user_id !== user.id && goal.visibility !== 'public') {
    return { error: 'This goal is private' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: milestoneRows } = await (supabase.from('goal_milestones') as any)
    .select('text')
    .eq('goal_id', sourceGoalId)
  const milestones = (milestoneRows ?? []).map((m: { text: string }) => m.text)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rec, error } = await (supabase.from('goal_recommendations') as any)
    .insert({
      sender_id: user.id,
      recipient_id: recipientId,
      source_goal_id: sourceGoalId,
      title: goal.title,
      category: goal.category,
      goal_type: goal.goal_type,
      milestones,
      note: note?.trim() || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const myName = (myProfile as { full_name: string | null } | null)?.full_name ?? 'Someone'

  await createNotification(recipientId, 'goal_recommendation', {
    author_name: myName,
    title: goal.title,
    note: note?.trim() ?? '',
    recommendation_id: (rec as { id: string }).id,
    message: `${myName} thinks you'd crush "${goal.title}"`,
  })

  revalidatePath('/explore')
  return { success: true }
}

export async function adoptRecommendation(recommendationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rec } = await (supabase.from('goal_recommendations') as any)
    .select('id, sender_id, title, category, goal_type, milestones, status')
    .eq('id', recommendationId)
    .eq('recipient_id', user.id)
    .single()

  if (!rec) return { error: 'Recommendation not found' }
  if (rec.status !== 'pending') return { error: 'Already handled' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goalRow, error } = await (supabase.from('goals') as any)
    .insert({
      user_id: user.id,
      title: rec.title,
      category: rec.category,
      goal_type: rec.goal_type,
      visibility: 'circle',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const milestones = (rec.milestones ?? []) as string[]
  if (milestones.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('goal_milestones') as any).insert(
      milestones.map(text => ({ goal_id: goalRow.id, text }))
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('goal_recommendations') as any)
    .update({ status: 'adopted', adopted_goal_id: goalRow.id, updated_at: new Date().toISOString() })
    .eq('id', recommendationId)

  const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const myName = (myProfile as { full_name: string | null } | null)?.full_name ?? 'Someone'

  await createNotification(rec.sender_id, 'goal_recommendation_adopted', {
    author_name: myName,
    title: rec.title,
    message: `${myName} started "${rec.title}" — the goal you recommended`,
  })

  revalidatePath('/goals')
  revalidatePath('/inbox')
  return { success: true, goalId: goalRow.id as string }
}

export async function passRecommendation(recommendationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('goal_recommendations') as any)
    .update({ status: 'passed', updated_at: new Date().toISOString() })
    .eq('id', recommendationId)
    .eq('recipient_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/inbox')
  return { success: true }
}

// How many people have adopted a goal recommended from this source goal —
// the "N people started this because of you" social-proof number.
export async function getRecommendationAdoptCount(sourceGoalId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase.from('goal_recommendations') as any)
    .select('id', { count: 'exact', head: true })
    .eq('source_goal_id', sourceGoalId)
    .eq('status', 'adopted')
  return count ?? 0
}
