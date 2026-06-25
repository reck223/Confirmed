import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/Nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  return (
    <div className="min-h-screen bg-[#080808] text-[#EFEFEF]">
      <Nav />
      <main className="md:ml-52 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
