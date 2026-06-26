import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HomeClient } from './HomeClient'
import type { Profile, Goal } from '@/lib/types/database'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data: profileData }, { data: goalsData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }),
  ])

  const profile = profileData as Profile | null
  const goals = (goalsData as Goal[] | null) ?? []
  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there'

  return (
    <HomeClient
      greeting={getGreeting()}
      todayLabel={getTodayLabel()}
      firstName={firstName}
      streak={profile?.streak ?? 0}
      goals={goals}
      isNewUser={goals.length === 0}
    />
  )
}
