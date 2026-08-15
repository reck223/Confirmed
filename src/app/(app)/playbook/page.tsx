import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PlaybookClient } from './PlaybookClient'
import { PLAYBOOK } from './content'

export default async function PlaybookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: progressRows } = await (supabase.from('playbook_progress') as any)
    .select('lesson_id').eq('user_id', user.id)

  const completedLessonIds = new Set(
    ((progressRows ?? []) as { lesson_id: string }[]).map(r => r.lesson_id)
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: answerRows } = await (supabase.from('playbook_answers') as any)
    .select('lesson_id, lesson_title, module_title, module_color, module_emoji, answer, coach_response, updated_at')
    .eq('user_id', user.id)

  type AnswerRow = {
    lesson_id: string; lesson_title: string; module_title: string
    module_color: string; module_emoji: string
    answer: string; coach_response: string | null; updated_at: string
  }
  const initialAnswers = Object.fromEntries(
    ((answerRows ?? []) as AnswerRow[]).map(r => [r.lesson_id, {
      answer: r.answer ?? '',
      coachResponse: r.coach_response ?? null,
      lessonTitle: r.lesson_title ?? '',
      moduleTitle: r.module_title ?? '',
      moduleColor: r.module_color ?? '',
      moduleEmoji: r.module_emoji ?? '',
      updatedAt: r.updated_at,
    }])
  )

  const totalLessons = PLAYBOOK.reduce((acc, m) => acc + m.lessons.length, 0)
  const completedCount = PLAYBOOK.reduce(
    (acc, m) => acc + m.lessons.filter(l => completedLessonIds.has(l.id)).length, 0
  )

  return (
    <Suspense>
      <PlaybookClient
        modules={PLAYBOOK}
        completedLessonIds={[...completedLessonIds]}
        totalLessons={totalLessons}
        completedCount={completedCount}
        initialAnswers={initialAnswers}
      />
    </Suspense>
  )
}
