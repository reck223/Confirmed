import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/Nav'
import type { Profile } from '@/lib/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, streak')
    .eq('id', user.id)
    .single()

  const profile = profileData as Pick<Profile, 'full_name' | 'streak'> | null

  return (
    <div className="min-h-screen" style={{ background: '#080808', color: '#EFEFEF' }}>
      <Nav
        userName={profile?.full_name ?? user.email?.split('@')[0]}
        userStreak={profile?.streak ?? 0}
      />
      <main style={{ marginLeft: 0 }} className="md:ml-[220px] pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
