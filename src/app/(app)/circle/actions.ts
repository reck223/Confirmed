'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { createNotification } from '@/lib/notifications'
import { XP_EVENTS } from '@/lib/xp'
import { awardXP } from '@/lib/xp-server'
import { awardAchievement } from '@/lib/achievements-server'

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
  const circleId = randomUUID()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: circleErr } = await (supabase.from('circles') as any)
    .insert({ id: circleId, name, code, created_by: user.id })

  if (circleErr) return { error: circleErr.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memberErr } = await (supabase.from('circle_members') as any)
    .insert({ circle_id: circleId, user_id: user.id })

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
    .select('id, name, created_by')
    .eq('code', code)
    .single()

  if (!circle) return { error: 'Circle not found. Check the code and try again.' }
  const c = circle as { id: string; name: string; created_by: string | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('circle_members') as any)
    .insert({ circle_id: c.id, user_id: user.id })

  if (error?.code === '23505') return { error: 'You\'re already in this circle' }
  if (error) return { error: error.message }

  // Notify all existing circle members + mutual follow
  const { data: members } = await supabase.from('circle_members').select('user_id').eq('circle_id', c.id).neq('user_id', user.id)
  const { data: joinerProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const joinerName = (joinerProfile as { full_name: string | null } | null)?.full_name ?? 'Someone'
  const memberIds = ((members ?? []) as { user_id: string }[]).map(m => m.user_id)

  // Auto-follow: joiner follows all existing members, all existing members follow joiner
  if (memberIds.length > 0) {
    const followRows = memberIds.flatMap(memberId => [
      { follower_id: user.id,    following_id: memberId },
      { follower_id: memberId,   following_id: user.id  },
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('follows') as any).upsert(followRows, { ignoreDuplicates: true })
  }

  await Promise.all(memberIds.map(memberId =>
    createNotification(memberId, 'circle_join', { circle_name: c.name, joiner_name: joinerName })
  ))

  revalidatePath('/circle')
  revalidatePath('/profile')
  return { success: true }
}

export async function acceptCircleInvite(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: circle } = await supabase
    .from('circles')
    .select('id, name, created_by')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (!circle) return { error: 'Circle not found' }
  const c = circle as { id: string; name: string; created_by: string | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('circle_members') as any)
    .insert({ circle_id: c.id, user_id: user.id })

  if (error?.code === '23505') return { success: true }
  if (error) return { error: error.message }

  const { data: members } = await supabase.from('circle_members').select('user_id').eq('circle_id', c.id).neq('user_id', user.id)
  const { data: joinerProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const joinerName = (joinerProfile as { full_name: string | null } | null)?.full_name ?? 'Someone'
  const memberIds = ((members ?? []) as { user_id: string }[]).map(m => m.user_id)

  await Promise.all(memberIds.map(memberId =>
    createNotification(memberId, 'circle_join', { circle_name: c.name, joiner_name: joinerName })
  ))

  revalidatePath('/circle')
  revalidatePath('/profile')
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

  // Award XP + first_post achievement
  await Promise.all([
    awardXP(user.id, XP_EVENTS.CIRCLE_POST),
    awardAchievement(user.id, 'first_post'),
  ])

  // Notify other circle members
  const [{ data: members }, { data: poster }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('circle_members') as any).select('user_id').eq('circle_id', circleId).neq('user_id', user.id),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ])
  const posterName = (poster as { full_name: string | null } | null)?.full_name ?? 'Someone'
  const postType = (formData.get('type') as string) || 'win'
  await Promise.all(((members ?? []) as { user_id: string }[]).map(m =>
    createNotification(m.user_id, 'win_posted', {
      poster_name: posterName,
      post_type: postType,
      preview: content.slice(0, 60),
    })
  ))

  revalidatePath('/circle')
  return { success: true }
}

export async function addComment(postId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const text = content.trim()
  if (!text) return { error: 'Comment cannot be empty' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('post_comments') as any)
    .insert({ post_id: postId, user_id: user.id, content: text })
  if (error) return { error: error.message }

  // Award XP
  await awardXP(user.id, XP_EVENTS.COMMENT)

  // Check coach achievement (10 comments)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase.from('post_comments') as any)
    .select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  if ((count ?? 0) >= 10) await awardAchievement(user.id, 'coach')

  // Notify post author
  const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single()
  const { data: commenter } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  if (post && (post as { user_id: string }).user_id !== user.id) {
    await createNotification((post as { user_id: string }).user_id, 'reaction', {
      reactor_name: (commenter as { full_name: string | null } | null)?.full_name ?? 'Someone',
      reaction_type: 'comment',
      post_preview: text.slice(0, 60),
    })
  }

  revalidatePath('/circle')
  return { success: true }
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('post_comments') as any)
    .delete().eq('id', commentId).eq('user_id', user.id)

  revalidatePath('/circle')
  return { success: true }
}

export async function followUser(targetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('follows') as any).insert({ follower_id: user.id, following_id: targetId })
  const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  await createNotification(targetId, 'follow', { follower_name: (p as { full_name: string | null } | null)?.full_name ?? 'Someone' })
  revalidatePath('/circle')
  revalidatePath('/profile')
  return { success: true }
}

export async function unfollowUser(targetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('follows') as any).delete().eq('follower_id', user.id).eq('following_id', targetId)
  revalidatePath('/circle')
  revalidatePath('/profile')
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
    // Notify post author
    const { data: post } = await supabase.from('posts').select('user_id, content').eq('id', postId).single()
    const { data: reactor } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    if (post) {
      const p = post as { user_id: string; content: string }
      await createNotification(p.user_id, 'reaction', {
        reactor_name: (reactor as { full_name: string | null } | null)?.full_name ?? 'Someone',
        reaction_type: type,
        post_preview: p.content.slice(0, 60),
      })
    }
  }

  revalidatePath('/circle')
  return { success: true }
}

// ── Sessions ──────────────────────────────────────────────────────────────

export async function createSession(circleId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const title       = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const date        = formData.get('date') as string
  const time        = formData.get('time') as string
  const meetingUrl  = (formData.get('meeting_url') as string)?.trim() || null

  if (!title) return { error: 'Title is required' }
  if (!date || !time) return { error: 'Date and time are required' }

  const scheduledAt = new Date(`${date}T${time}:00`)
  if (isNaN(scheduledAt.getTime())) return { error: 'Invalid date or time' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, error: insertErr } = await (supabase.from('circle_sessions') as any)
    .insert({ circle_id: circleId, created_by: user.id, title, description, scheduled_at: scheduledAt.toISOString(), meeting_url: meetingUrl })
    .select('id').single()

  if (insertErr) return { error: insertErr.message }

  // Auto-RSVP the creator as going
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('session_rsvps') as any).insert({ session_id: (session as { id: string }).id, user_id: user.id, status: 'going' })

  // Notify circle members
  const { data: members } = await supabase.from('circle_members').select('user_id').eq('circle_id', circleId)
  const { data: creator } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const creatorName = (creator as { full_name: string | null } | null)?.full_name ?? 'Someone'
  await Promise.all(
    ((members ?? []) as { user_id: string }[])
      .filter(m => m.user_id !== user.id)
      .map(m => createNotification(m.user_id, 'new_session', { creator_name: creatorName, session_title: title }))
  )

  revalidatePath('/circle')
  return { success: true }
}

export async function rsvpSession(sessionId: string, status: 'going' | 'maybe' | 'cant_make_it') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('session_rsvps') as any)
    .upsert({ session_id: sessionId, user_id: user.id, status }, { onConflict: 'session_id,user_id' })

  revalidatePath('/circle')
  return { success: true }
}

export async function deleteSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('circle_sessions') as any).delete().eq('id', sessionId).eq('created_by', user.id)

  revalidatePath('/circle')
  return { success: true }
}
