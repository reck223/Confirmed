import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('full_name, username')
    .eq('id', user.id)
    .single() as { data: { full_name: string | null; username: string | null } | null }

  if (profile?.username) redirect('/home')

  const fullName =
    profile?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    ''

  return <OnboardingClient fullName={fullName} />
}
