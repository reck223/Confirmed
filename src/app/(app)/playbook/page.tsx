import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

  const totalLessons = PLAYBOOK.reduce((acc, m) => acc + m.lessons.length, 0)
  const completedCount = PLAYBOOK.reduce(
    (acc, m) => acc + m.lessons.filter(l => completedLessonIds.has(l.id)).length, 0
  )

  return (
    <PlaybookClient
      modules={PLAYBOOK}
      completedLessonIds={[...completedLessonIds]}
      totalLessons={totalLessons}
      completedCount={completedCount}
    />
  )
}
