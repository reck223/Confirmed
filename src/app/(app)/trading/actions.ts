'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const CREATOR_EMAIL = 'graysdarius@gmail.com'

export async function toggleBot(botName: string, running: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== CREATOR_EMAIL) redirect('/home')

  // Upsert, not update — most bots don't have a bot_config row yet (only
  // 'main' ever got one), and an update against a filter matching zero
  // rows silently no-ops. onConflict targets the unique bot_name
  // constraint so this creates the row on first toggle, updates after.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('bot_config') as any)
    .upsert({ bot_name: botName, running, updated_at: new Date().toISOString() }, { onConflict: 'bot_name' })

  revalidatePath('/trading')
}
