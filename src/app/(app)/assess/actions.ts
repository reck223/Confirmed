'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'

const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

export async function submitAssessment(weekStart: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Enforce day gate server-side
  const { data: profileData } = await supabase.from('profiles').select('assessment_day').eq('id', user.id).single()
  const assessmentDay = (profileData as { assessment_day: string } | null)?.assessment_day ?? 'Sun'
  const todayNum = new Date().getDay()
  const setDayNum = DAY_MAP[assessmentDay] ?? 0
  const lateDay = (setDayNum + 1) % 7
  if (todayNum !== setDayNum && todayNum !== lateDay) {
    return { error: 'Reflections can only be submitted on your set day or the day after.' }
  }

  const rating = parseInt(formData.get('rating') as string)
  if (!rating || rating < 1 || rating > 10) return { error: 'Rating is required (1–10)' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('assessments') as any).upsert({
    user_id: user.id,
    week_start: weekStart,
    rating,
    wins: (formData.get('wins') as string)?.trim() || null,
    challenges: (formData.get('challenges') as string)?.trim() || null,
    lessons: (formData.get('lessons') as string)?.trim() || null,
    intentions: (formData.get('intentions') as string)?.trim() || null,
    gratitude: (formData.get('gratitude') as string)?.trim() || null,
    week_title: (formData.get('week_title') as string)?.trim() || null,
  }, { onConflict: 'user_id,week_start' })

  if (error) return { error: error.message }

  // Notify circle members about the new reflection
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const authorName = (profile as { full_name: string | null } | null)?.full_name ?? 'Someone'
  const weekTitle = (formData.get('week_title') as string)?.trim() || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberRows } = await (supabase.from('circle_members') as any)
    .select('circle_id')
    .eq('user_id', user.id)
  const circleIds = ((memberRows ?? []) as { circle_id: string }[]).map(r => r.circle_id)

  if (circleIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allMembers } = await (supabase.from('circle_members') as any)
      .select('user_id')
      .in('circle_id', circleIds)
      .neq('user_id', user.id)
    const uniqueMembers = [...new Set(((allMembers ?? []) as { user_id: string }[]).map(m => m.user_id))]
    await Promise.all(uniqueMembers.map(memberId =>
      createNotification(memberId, 'assessment', {
        author_name: authorName,
        ...(weekTitle ? { week_title: weekTitle } : {}),
      })
    ))
  }

  revalidatePath('/assess')
  revalidatePath('/home')
  return { success: true }
}

export async function updateAssessment(assessmentId: string, fields: {
  week_title?: string; rating?: number; wins?: string; challenges?: string
  lessons?: string; intentions?: string; gratitude?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('assessments') as any)
    .update({
      week_title: fields.week_title?.trim() || null,
      rating: fields.rating,
      wins: fields.wins?.trim() || null,
      challenges: fields.challenges?.trim() || null,
      lessons: fields.lessons?.trim() || null,
      intentions: fields.intentions?.trim() || null,
      gratitude: fields.gratitude?.trim() || null,
    })
    .eq('id', assessmentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/assess')
  revalidatePath('/circle')
  return { success: true }
}

export async function deleteAssessment(assessmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('assessments') as any)
    .delete()
    .eq('id', assessmentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // Recalculate streak from remaining assessments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: remaining } = await (supabase.from('assessments') as any)
    .select('week_start')
    .eq('user_id', user.id)
    .order('week_start', { ascending: false })

  let newStreak = 0
  const rows = (remaining ?? []) as { week_start: string }[]

  if (rows.length > 0) {
    // Only count a live streak if the most recent assessment is this week or last week
    const now = new Date()
    const thisMonday = new Date(now)
    const day = now.getDay()
    thisMonday.setDate(now.getDate() - day) // Sunday-based week start
    const thisWeekStr = thisMonday.toISOString().split('T')[0]
    const lastWeek = new Date(thisMonday)
    lastWeek.setDate(thisMonday.getDate() - 7)
    const lastWeekStr = lastWeek.toISOString().split('T')[0]

    const mostRecent = rows[0].week_start
    if (mostRecent === thisWeekStr || mostRecent === lastWeekStr) {
      newStreak = 1
      for (let i = 1; i < rows.length; i++) {
        const curr = new Date(rows[i - 1].week_start + 'T12:00:00')
        const prev = new Date(rows[i].week_start + 'T12:00:00')
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
        if (diffDays === 7) newStreak++
        else break
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any).update({ streak: newStreak }).eq('id', user.id)

  revalidatePath('/assess')
  revalidatePath('/circle')
  revalidatePath('/home')
  return { success: true }
}
