'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const CREATOR_EMAIL = 'graysdarius@gmail.com'

export async function approveCircleRequest(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== CREATOR_EMAIL) throw new Error('Unauthorized')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any)
    .update({ circle_creator_approved: true })
    .eq('id', userId)
  revalidatePath('/creator')
}

export async function denyCircleRequest(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== CREATOR_EMAIL) throw new Error('Unauthorized')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any)
    .update({ circle_creator_requested: false })
    .eq('id', userId)
  revalidatePath('/creator')
}
