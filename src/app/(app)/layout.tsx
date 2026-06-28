import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { TopBar } from '@/components/TopBar'
import type { Profile } from '@/lib/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const [{ data: profileData }, { count: unreadCount }] = await Promise.all([
    supabase.from('profiles').select('full_name, streak').eq('id', user.id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('messages') as any)
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null),
  ])

  const profile = profileData as Pick<Profile, 'full_name' | 'streak'> | null

  return (
    <div className="min-h-screen" style={{ background: '#080808', color: '#EFEFEF' }}>
      <TopBar unreadCount={unreadCount ?? 0} />
      <Nav
        userName={profile?.full_name ?? user.email?.split('@')[0]}
        userStreak={profile?.streak ?? 0}
      />
      <main className="pb-20 min-h-screen" style={{ paddingTop: 175 }}>
        {children}
      </main>
    </div>
  )
}
