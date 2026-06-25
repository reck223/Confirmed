'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function createCircle(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Circle name is required' }

  const code = randomCode()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: circle, error: circleErr } = await (supabase.from('circles') as any)
    .insert({ name, code, created_by: user.id })
    .select()
    .single()

  if (circleErr || !circle) return { error: circleErr?.message ?? 'Failed to create circle' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memberErr } = await (supabase.from('circle_members') as any)
    .insert({ circle_id: (circle as { id: string }).id, user_id: user.id })

  if (memberErr) return { error: memberErr.message }

  revalidatePath('/circle')
  return { success: true, code }
}

export async function joinCircle(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const code = (formData.get('code') as string)?.trim().toUpperCase()
  if (!code) return { error: 'Enter an invite code' }

  const { data: circle } = await supabase
    .from('circles')
    .select('id')
    .eq('code', code)
    .single()

  if (!circle) return { error: 'Circle not found. Check the code and try again.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('circle_members') as any)
    .insert({ circle_id: (circle as { id: string }).id, user_id: user.id })

  if (error?.code === '23505') return { error: 'You\'re already in this circle' }
  if (error) return { error: error.message }

  revalidatePath('/circle')
  return { success: true }
}

export async function createPost(circleId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const content = (formData.get('content') as string)?.trim()
  if (!content) return { error: 'Post cannot be empty' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('posts') as any).insert({
    user_id: user.id,
    circle_id: circleId,
    type: (formData.get('type') as string) || 'win',
    content,
  })

  if (error) return { error: error.message }
  revalidatePath('/circle')
  return { success: true }
}

export async function toggleReaction(postId: string, type: 'fire' | 'strong' | 'relate') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .eq('type', type)
    .single()

  if (existing) {
    await supabase.from('post_reactions').delete().eq('id', (existing as { id: string }).id)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('post_reactions') as any).insert({ post_id: postId, user_id: user.id, type })
  }

  revalidatePath('/circle')
  return { success: true }
}
