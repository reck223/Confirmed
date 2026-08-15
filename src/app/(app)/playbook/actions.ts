'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { XP_EVENTS } from '@/lib/xp'
import { awardXP } from '@/lib/xp-server'
import { awardAchievement } from '@/lib/achievements-server'
import { PLAYBOOK } from './content'

export async function completeLesson(lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('playbook_progress') as any)
    .insert({ user_id: user.id, lesson_id: lessonId })

  if (error && error.code !== '23505') return { error: error.message }

  await awardXP(user.id, XP_EVENTS.PLAYBOOK_LESSON)

  // Check if all lessons are done
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase.from('playbook_progress') as any)
    .select('id', { count: 'exact', head: true }).eq('user_id', user.id)

  const totalLessons = PLAYBOOK.reduce((acc, m) => acc + m.lessons.length, 0)
  if ((count ?? 0) >= totalLessons) {
    await awardAchievement(user.id, 'scholar')
  }

  revalidatePath('/playbook')
  return { success: true }
}

export async function saveReflection(input: {
  lessonId: string
  lessonTitle: string
  moduleTitle: string
  moduleColor: string
  moduleEmoji: string
  answer: string
  coachResponse?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('playbook_answers') as any)
    .upsert({
      user_id: user.id,
      lesson_id: input.lessonId,
      lesson_title: input.lessonTitle,
      module_title: input.moduleTitle,
      module_color: input.moduleColor,
      module_emoji: input.moduleEmoji,
      answer: input.answer,
      coach_response: input.coachResponse ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' })

  if (error) return { error: error.message }
  return { success: true }
}
