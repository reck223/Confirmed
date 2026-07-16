'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { awardXP } from '@/lib/xp-server'
import { awardAchievement } from '@/lib/achievements-server'
import { XP_EVENTS } from '@/lib/xp'

export async function markMissionDone() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not authenticated' }
  const today = new Date().toISOString().split('T')[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('check_ins') as any)
    .upsert({ user_id: user.id, date: today }, { onConflict: 'user_id,date' })
  if (error) return { error: error.message }
  await awardXP(user.id, XP_EVENTS.CHECKIN).catch(() => {})
  revalidatePath('/home')
  return { success: true }
}

export async function uploadPostMedia(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'No file selected' }

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  if (!isImage && !isVideo) return { error: 'Only images and videos are supported' }
  if (file.size > 100 * 1024 * 1024) return { error: 'File must be under 100MB' }

  const ext = file.name.split('.').pop() ?? (isImage ? 'jpg' : 'mp4')
  const path = `${user.id}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('posts')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path)
  return { success: true, url: publicUrl, mediaType: isImage ? 'image' : 'video' as 'image' | 'video' }
}

export async function createHomePost(data: {
  content: string
  type: string
  visibility?: 'public' | 'circle'
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'link'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const content = data.content.trim()
  if (!content && !data.mediaUrl) return { error: 'Add a caption or photo to share' }

  // Use first circle membership if available
  const { data: memberRow } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const circleId = (memberRow as { circle_id: string } | null)?.circle_id ?? null

  // Store 'link' mediaType as null in the DB to satisfy the existing check constraint
  // (which only allows 'image' | 'video'). We detect links on read by: media_url set + media_type null.
  const dbMediaType = data.mediaType === 'link' ? null : (data.mediaType ?? null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('posts') as any).insert({
    user_id:    user.id,
    circle_id:  data.visibility === 'public' ? null : (circleId ?? null),
    type:       data.type || 'win',
    content:    content || '',
    visibility: data.visibility ?? 'circle',
    media_url:  data.mediaUrl  ?? null,
    media_type: dbMediaType,
  })

  if (error) return { error: error.message }

  await Promise.all([
    awardXP(user.id, XP_EVENTS.CIRCLE_POST),
    awardAchievement(user.id, 'first_post'),
  ])

  revalidatePath('/home')
  revalidatePath('/circle')
  return { success: true }
}

export async function updatePost(postId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('posts') as any)
    .update({ content: content.trim() })
    .eq('id', postId)
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/profile')
  revalidatePath('/home')
  revalidatePath('/circle')
  return { success: true }
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Fetch the post first to get any storage media to clean up
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: post } = await (supabase.from('posts') as any)
    .select('user_id, media_url, media_type')
    .eq('id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!post) return { error: 'Post not found or not yours' }

  // Delete from Supabase Storage if it's an image or video (not a link)
  if (post.media_url && post.media_type && (post.media_type === 'image' || post.media_type === 'video')) {
    // Extract the storage path: everything after the bucket name in the URL
    const match = (post.media_url as string).match(/\/storage\/v1\/object\/public\/posts\/(.+)$/)
    if (match) {
      await supabase.storage.from('posts').remove([match[1]])
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('posts') as any).delete().eq('id', postId).eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/home')
  revalidatePath('/circle')
  return { success: true }
}
