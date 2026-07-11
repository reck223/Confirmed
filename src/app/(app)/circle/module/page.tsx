import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ModuleClient } from './ModuleClient'

export default async function CircleModulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('circle_module_complete')
    .eq('id', user.id)
    .single()

  const alreadyComplete = !!(profile as { circle_module_complete: boolean } | null)?.circle_module_complete

  return <ModuleClient alreadyComplete={alreadyComplete} />
}
