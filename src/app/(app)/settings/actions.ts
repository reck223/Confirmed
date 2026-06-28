'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const focusAreas = formData.getAll('focus_areas') as string[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('profiles') as any)
    .update({
      full_name:       (formData.get('full_name') as string)?.trim() || null,
      username:        (formData.get('username') as string)?.trim() || null,
      bio:             (formData.get('bio') as string)?.trim() || null,
      tagline:         (formData.get('tagline') as string)?.trim() || null,
      assessment_day:  (formData.get('assessment_day') as string) || 'Sunday',
      assessment_time: (formData.get('assessment_time') as string) || 'evening',
      focus_areas:     focusAreas,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  revalidatePath('/home')
  revalidatePath('/profile')
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/signin')
}
