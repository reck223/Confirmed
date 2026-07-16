'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const CREATOR_EMAIL = 'graysdarius@gmail.com'

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== CREATOR_EMAIL) throw new Error('Unauthorized')
  return { supabase, userId: user.id }
}

export async function approveCircleRequest(userId: string) {
  const { supabase } = await guard()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any).update({ circle_creator_approved: true }).eq('id', userId)
  revalidatePath('/creator')
}

export async function denyCircleRequest(userId: string) {
  const { supabase } = await guard()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any).update({ circle_creator_requested: false }).eq('id', userId)
  revalidatePath('/creator')
}

export async function deletePost(postId: string) {
  const { supabase } = await guard()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('posts') as any).delete().eq('id', postId)
  revalidatePath('/creator')
}

export async function sendBroadcast(message: string) {
  const { supabase, userId } = await guard()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from('profiles') as any).select('id')
  if (!profiles?.length) return
  const notifs = (profiles as { id: string }[]).map(p => ({
    to_user_id: p.id,
    from_user_id: userId,
    type: 'broadcast',
    data: { message },
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('notifications') as any).insert(notifs)
}
