'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const full_name = (formData.get('full_name') as string)?.trim() || null
  const username = (formData.get('username') as string)?.trim() || null
  const bio = (formData.get('bio') as string)?.trim() || null
  const tagline = (formData.get('tagline') as string)?.trim() || null
  const assessment_day = (formData.get('assessment_day') as string) || 'Sun'

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

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
