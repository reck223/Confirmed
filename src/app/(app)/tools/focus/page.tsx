import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FocusClient } from './FocusClient'

type GoalRow = { id: string; title: string; category: string | null; progress: number }

export default async function FocusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data } = await supabase
    .from('goals')
    .select('id, title, category, progress')
    .eq('user_id', user.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(20)

  const goals = (data as GoalRow[] | null) ?? []

  return <FocusClient goals={goals} />
}
