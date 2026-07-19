'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const CREATOR_EMAIL = 'graysdarius@gmail.com'

export async function toggleBot(running: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== CREATOR_EMAIL) redirect('/home')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('bot_config') as any)
    .update({ running, updated_at: new Date().toISOString() })

  revalidatePath('/trading')
}
