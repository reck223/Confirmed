import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JournalClient } from './JournalClient'

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data }, { data: letterData }] = await Promise.all([
    supabase
      .from('journal_entries')
      .select('id, type, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('goals')
      .select('id, title, why_it_matters, deadline, created_at')
      .eq('user_id', user.id)
      .eq('goal_type', 'letter')
      .order('created_at', { ascending: false }),
  ])

  type Row = { id: string; type: 'gratitude' | 'cbt' | 'write' | 'checkin' | null; content: unknown; created_at: string }
  const entries = ((data ?? []) as Row[]).map(e => ({
    id: e.id,
    type: e.type,
    content: (e.content ?? {}) as Record<string, string>,
    created_at: e.created_at,
  }))

  type LetterRow = { id: string; title: string | null; why_it_matters: string | null; deadline: string | null; created_at: string }
  const letters = ((letterData ?? []) as LetterRow[])

  return <JournalClient entries={entries} letters={letters} />
}
