import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JournalClient } from './JournalClient'

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data } = await supabase
    .from('journal_entries')
    .select('id, type, content, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  type Row = { id: string; type: 'gratitude' | 'cbt' | 'write' | 'checkin' | null; content: unknown; created_at: string }
  const entries = ((data ?? []) as Row[]).map(e => ({
    id: e.id,
    type: e.type,
    content: (e.content ?? {}) as Record<string, string>,
    created_at: e.created_at,
  }))

  return <JournalClient entries={entries} />
}
