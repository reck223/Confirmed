'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitCheckin(energy: number, note: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  if (energy < 1 || energy > 10) return { error: 'Energy must be 1–10' }

  const today = new Date().toISOString().split('T')[0]

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('daily_checkins') as any).upsert(
      { user_id: user.id, date: today, energy, note: note.trim() || null },
      { onConflict: 'user_id,date' }
    )
    if (error) {
      if (error.code === '42P01') return { error: 'TABLE_NOT_EXISTS' }
      return { error: error.message }
    }
    revalidatePath('/home')
    return { success: true }
  } catch {
    return { error: 'TABLE_NOT_EXISTS' }
  }
}

export async function getTodayCheckin(): Promise<{ energy: number; note: string | null } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('daily_checkins') as any)
      .select('energy, note')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()
    return data as { energy: number; note: string | null } | null
  } catch {
    return null
  }
}

export async function getCheckinStreak(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('daily_checkins') as any)
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(60)

    if (!data || data.length === 0) return 0

    const rows = data as { date: string }[]
    const today = new Date().toISOString().split('T')[0]
    let streak = 0
    let cursor = new Date(today)

    for (const row of rows) {
      const d = new Date(row.date + 'T12:00:00')
      const cursorStr = cursor.toISOString().split('T')[0]
      if (row.date === cursorStr) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else if (row.date < cursorStr) {
        break
      }
    }
    return streak
  } catch {
    return 0
  }
}
