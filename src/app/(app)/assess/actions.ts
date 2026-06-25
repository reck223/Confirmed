'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitAssessment(weekStart: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

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
  }, { onConflict: 'user_id,week_start' })

  if (error) return { error: error.message }
  revalidatePath('/assess')
  revalidatePath('/home')
  return { success: true }
}
