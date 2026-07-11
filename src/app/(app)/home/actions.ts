'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { awardXP } from '@/lib/xp-server'
import { awardAchievement } from '@/lib/achievements-server'
import { XP_EVENTS } from '@/lib/xp'

export async function createHomePost(data: {
  content: string
  type: string
  visibility?: 'public' | 'circle'
  mediaUrl?: string
  mediaType?: 'image' | 'video'
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('posts') as any).insert({
    user_id:    user.id,
    circle_id:  data.visibility === 'public' ? null : (circleId ?? null),
    type:       data.type || 'win',
    content:    content || '',
    visibility: data.visibility ?? 'circle',
    media_url:  data.mediaUrl  ?? null,
    media_type: data.mediaType ?? null,
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
