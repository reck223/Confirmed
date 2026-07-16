'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function checkUsername(username: string): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const clean = username.toLowerCase()
  if (clean.length < 3) return { error: 'Must be at least 3 characters' }
  if (clean.length > 20) return { error: 'Must be 20 characters or less' }
  if (!/^[a-z0-9_]+$/.test(clean)) return { error: 'Only letters, numbers, and underscores' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('profiles') as any)
    .select('id')
    .eq('username', clean)
    .neq('id', user.id)
    .maybeSingle()

  if (existing) return { error: 'That username is already taken' }
  return { ok: true }
}

export async function saveOnboarding(data: {
  username: string
  tagline: string
  focusAreas: string[]
  dateOfBirth?: string
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const clean = data.username.toLowerCase()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('profiles') as any)
    .select('id')
    .eq('username', clean)
    .neq('id', user.id)
    .maybeSingle()

  if (existing) return { error: 'That username is already taken — go back and pick another' }

  // Core fields — always present
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    username: clean,
    tagline: data.tagline || null,
    focus_areas: data.focusAreas,
  }
  // Only include date_of_birth when the user actually filled it in, so a
  // missing column never blocks onboarding.
  if (data.dateOfBirth) payload.date_of_birth = data.dateOfBirth

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('profiles') as any)
    .update(payload)
    .eq('id', user.id)

  if (error) {
    // Column doesn't exist yet — retry without it so onboarding still works
    if (error.code === '42703' || error.message.includes('date_of_birth')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (payload as any).date_of_birth
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e2 } = await (supabase.from('profiles') as any)
        .update(payload)
        .eq('id', user.id)
      if (e2) return { error: e2.message }
    } else {
      return { error: error.message }
    }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
