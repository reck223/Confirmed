import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { TopBar } from '@/components/TopBar'
import { AnimationObserver } from '@/components/AnimationObserver'
import { SwipeNavigator } from '@/components/SwipeNavigator'
import { PushRegistrar } from '@/components/PushRegistrar'
import type { Profile } from '@/lib/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const [{ data: profileData }, { count: unreadMessages }, { count: unreadNotifs }] = await Promise.all([
    supabase.from('profiles').select('full_name, username, streak').eq('id', user.id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('messages') as any)
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('notifications') as any)
      .select('id', { count: 'exact', head: true })
      .eq('to_user_id', user.id)
      .is('read_at', null),
  ])
  const unreadCount = (unreadMessages ?? 0) + (unreadNotifs ?? 0)

  const profile = profileData as Pick<Profile, 'full_name' | 'username' | 'streak'> | null
  if (!profile?.username) redirect('/onboarding')

  return (
    <div className="min-h-screen" style={{ background: '#080808', color: '#EFEFEF' }}>
      <PushRegistrar />
      <AnimationObserver />
      <TopBar unreadCount={unreadCount ?? 0} isCreator={user.email === 'graysdarius@gmail.com'} />
      <Nav
        userName={profile?.full_name ?? user.email?.split('@')[0]}
        userStreak={profile?.streak ?? 0}
      />
      <main className="min-h-screen" style={{ paddingTop: 210, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <SwipeNavigator>
          {children}
        </SwipeNavigator>
      </main>
    </div>
  )
}
