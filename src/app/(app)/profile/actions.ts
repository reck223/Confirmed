'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const full_name = (formData.get('full_name') as string)?.trim() || null
  const rawUsername = (formData.get('username') as string)?.trim().toLowerCase() || null
  const bio = (formData.get('bio') as string)?.trim() || null
  const tagline = (formData.get('tagline') as string)?.trim() || null
  const assessment_day = (formData.get('assessment_day') as string) || 'Sun'

  if (rawUsername !== null) {
    if (rawUsername.length < 3) return { error: 'Username must be at least 3 characters' }
    if (rawUsername.length > 20) return { error: 'Username must be 20 characters or less' }
    if (!/^[a-z0-9_.]+$/.test(rawUsername)) return { error: 'Username can only contain letters, numbers, underscores, and dots' }
    if (/^[._]|[._]$/.test(rawUsername)) return { error: 'Username cannot start or end with a dot or underscore' }
    if (/[_.]{2}/.test(rawUsername)) return { error: 'Username cannot have consecutive dots or underscores' }
  }

  const username = rawUsername

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('profiles') as any)
    .update({ full_name, username, bio, tagline, assessment_day, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error?.code === '23505') return { error: 'That username is already taken' }
  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/home')
  return { success: true }
}

export async function uploadCover(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const file = formData.get('cover') as File
  if (!file || file.size === 0) return { error: 'No file selected' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Image must be under 10MB' }
  if (!file.type.startsWith('image/')) return { error: 'File must be an image' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('covers')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any)
    .update({ cover_url: publicUrl })
    .eq('id', user.id)

  revalidatePath('/profile')
  return { success: true, url: publicUrl }
}

export async function setPinnedGoal(goalId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any)
    .update({ pinned_goal_id: goalId })
    .eq('id', user.id)

  revalidatePath('/profile')
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) return { error: 'No file selected' }
  if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5MB' }
  if (!file.type.startsWith('image/')) return { error: 'File must be an image' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any)
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  revalidatePath('/profile')
  return { success: true, url: publicUrl }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

type ModalUser = { id: string; full_name: string | null; avatar_url: string | null; username: string | null }

export async function getFollowers(): Promise<ModalUser[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: follows } = await (supabase.from('follows') as any).select('follower_id').eq('following_id', user.id)
  const ids: string[] = (follows ?? []).map((f: { follower_id: string }) => f.follower_id)
  if (!ids.length) return []
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, username').in('id', ids)
  return (profiles ?? []) as ModalUser[]
}

export async function getFollowing(): Promise<ModalUser[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: follows } = await (supabase.from('follows') as any).select('following_id').eq('follower_id', user.id)
  const ids: string[] = (follows ?? []).map((f: { following_id: string }) => f.following_id)
  if (!ids.length) return []
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, username').in('id', ids)
  return (profiles ?? []) as ModalUser[]
}

export async function getCircleMembers(): Promise<ModalUser[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: memberRows } = await supabase.from('circle_members').select('circle_id').eq('user_id', user.id)
  const circleIds = (memberRows ?? []).map((r: { circle_id: string }) => r.circle_id)
  if (!circleIds.length) return []
  const { data: allMemberRows } = await supabase.from('circle_members').select('user_id').in('circle_id', circleIds)
  const memberIds = [...new Set(((allMemberRows ?? []) as { user_id: string }[]).map(r => r.user_id).filter(id => id !== user.id))]
  if (!memberIds.length) return []
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, username').in('id', memberIds)
  return (profiles ?? []) as ModalUser[]
}
