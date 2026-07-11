import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MealsClient } from './MealsClient'

export default async function MealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // Current week Mon–Sun
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // 0=Mon
  const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)

  const weekStart = monday.toISOString().split('T')[0]
  const weekEnd   = sunday.toISOString().split('T')[0]
  const today     = now.toISOString().split('T')[0]

  const [
    { data: rows },
    { data: prefRow },
    { data: favRows },
    { data: waterRows },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('meal_entries') as any)
      .select('id, plan_date, meal_type, name, calories, protein_g, carbs_g, fat_g, created_at')
      .eq('user_id', user.id)
      .gte('plan_date', weekStart)
      .lte('plan_date', weekEnd)
      .order('created_at', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('meal_preferences') as any)
      .select('calorie_target, protein_target_g, carbs_target_g, fat_target_g')
      .eq('user_id', user.id)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('meal_favorites') as any)
      .select('id, meal_type, name, calories, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('water_logs') as any)
      .select('date, glasses')
      .eq('user_id', user.id)
      .gte('date', weekStart)
      .lte('date', weekEnd),
  ])

  type MealRow  = { id: string; plan_date: string; meal_type: string; name: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }
  type PrefRow  = { calorie_target: number | null; protein_target_g: number | null; carbs_target_g: number | null; fat_target_g: number | null }
  type FavRow   = { id: string; meal_type: string; name: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }
  type WaterRow = { date: string; glasses: number }

  const meals     = (rows     ?? []) as MealRow[]
  const favorites = (favRows  ?? []) as FavRow[]
  const waterLogs = (waterRows ?? []) as WaterRow[]
  const preferences = (prefRow ?? null) as PrefRow | null

  // Build week days array
  const weekDays: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    weekDays.push(d.toISOString().split('T')[0])
  }

  return (
    <MealsClient
      meals={meals}
      weekDays={weekDays}
      today={today}
      weekStart={weekStart}
      preferences={preferences}
      favorites={favorites}
      waterLogs={waterLogs}
    />
  )
}
