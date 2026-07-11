'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type SetInput = { setNumber: number; reps: number | null; weightLbs: number | null; durationMins: number | null }
type ExerciseInput = { name: string; isCardio: boolean; sortOrder: number; sets: SetInput[] }

export async function saveWorkoutSession(
  name: string,
  durationMins: number,
  exercises: ExerciseInput[],
  goalId?: string | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const today = new Date().toISOString().split('T')[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session } = await (supabase.from('workout_sessions') as any)
    .insert({ user_id: user.id, name, duration_mins: durationMins, date: today, goal_id: goalId ?? null })
    .select('id').single()

  if (!session) return
  const sessionId = (session as { id: string }).id

  for (const ex of exercises) {
    const first = ex.sets[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exercise } = await (supabase.from('workout_exercises') as any)
      .insert({
        session_id: sessionId,
        user_id: user.id,
        name: ex.name,
        sort_order: ex.sortOrder,
        sets: ex.sets.length,
        reps: first?.reps ?? null,
        weight_lbs: first?.weightLbs ?? null,
        duration_mins: first?.durationMins ?? null,
      })
      .select('id').single()

    if (exercise && ex.sets.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('workout_sets') as any).insert(
        ex.sets.map(s => ({
          exercise_id: (exercise as { id: string }).id,
          user_id: user.id,
          set_number: s.setNumber,
          reps: s.reps,
          weight_lbs: s.weightLbs,
          duration_mins: s.durationMins,
        }))
      )
    }
  }

  revalidatePath('/tools/workout')
  revalidatePath('/tools')
}

export async function deleteWorkoutSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('workout_sessions') as any).delete().eq('id', sessionId).eq('user_id', user.id)
  revalidatePath('/tools/workout')
}

type TemplateEx = { name: string; isCardio: boolean; sets: { reps: number | null; weightLbs: number | null; durationMins: number | null }[] }

export async function saveTemplate(name: string, exercises: TemplateEx[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('workout_templates') as any).insert({ user_id: user.id, name, exercises })
  revalidatePath('/tools/workout')
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('workout_templates') as any).delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/tools/workout')
}

export async function logBodyWeight(date: string, weightLbs: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('body_weight_logs') as any).upsert({ user_id: user.id, date, weight_lbs: weightLbs })
  revalidatePath('/tools/workout')
}
