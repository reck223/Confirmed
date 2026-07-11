'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addMeal(planDate: string, mealType: string, name: string, calories: number | null, proteinG: number | null, carbsG: number | null, fatG: number | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('meal_entries') as any).insert({
    user_id: user.id, plan_date: planDate, meal_type: mealType,
    name, calories, protein_g: proteinG, carbs_g: carbsG, fat_g: fatG,
  })
  revalidatePath('/tools/meals')
  revalidatePath('/tools')
}

type MealRow = { id: string; plan_date: string; meal_type: string; name: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }

export async function copyLastWeek(weekStart: string): Promise<MealRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Previous week range
  const prevStart = new Date(weekStart); prevStart.setDate(prevStart.getDate() - 7)
  const prevEnd   = new Date(weekStart); prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStartStr = prevStart.toISOString().split('T')[0]
  const prevEndStr   = prevEnd.toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lastWeek } = await (supabase.from('meal_entries') as any)
    .select('plan_date, meal_type, name, calories, protein_g, carbs_g, fat_g')
    .eq('user_id', user.id)
    .gte('plan_date', prevStartStr)
    .lte('plan_date', prevEndStr)

  if (!lastWeek || lastWeek.length === 0) return []

  type SourceRow = { plan_date: string; meal_type: string; name: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }
  const newRows = (lastWeek as SourceRow[]).map(r => {
    const shiftedDate = new Date(r.plan_date + 'T12:00:00')
    shiftedDate.setDate(shiftedDate.getDate() + 7)
    return {
      user_id: user.id,
      plan_date: shiftedDate.toISOString().split('T')[0],
      meal_type: r.meal_type,
      name: r.name,
      calories: r.calories,
      protein_g: r.protein_g,
      carbs_g: r.carbs_g,
      fat_g: r.fat_g,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted } = await (supabase.from('meal_entries') as any).insert(newRows).select('id, plan_date, meal_type, name, calories, protein_g, carbs_g, fat_g')

  revalidatePath('/tools/meals')
  revalidatePath('/tools')
  return (inserted ?? []) as MealRow[]
}

type ScanResult = { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; confidence: string }

export async function estimateCalories(imageBase64: string): Promise<ScanResult> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: 'Estimate calories and macros for the food in this image. Reply with ONLY a valid JSON object, no other text: {"name":"food description","calories":350,"protein_g":20,"carbs_g":45,"fat_g":10,"confidence":"high|medium|low"}. If multiple foods are visible estimate the total. If you cannot identify food, set confidence to "low" with a best guess.' },
      ],
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const match = text.match(/\{[\s\S]*?\}/)
  if (!match) throw new Error('Could not parse nutrition data from response')
  return JSON.parse(match[0]) as ScanResult
}

export async function deleteMeal(mealId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('meal_entries') as any).delete().eq('id', mealId).eq('user_id', user.id)
  revalidatePath('/tools/meals')
  revalidatePath('/tools')
}

export async function saveCalorieTarget(calorieTarget: number | null, proteinTarget: number | null, carbsTarget: number | null, fatTarget: number | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('meal_preferences') as any).upsert({
    user_id: user.id,
    calorie_target: calorieTarget,
    protein_target_g: proteinTarget,
    carbs_target_g: carbsTarget,
    fat_target_g: fatTarget,
    updated_at: new Date().toISOString(),
  })
  revalidatePath('/tools/meals')
}

export async function addFavorite(name: string, mealType: string, calories: number | null, proteinG: number | null, carbsG: number | null, fatG: number | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('meal_favorites') as any).insert({
    user_id: user.id, meal_type: mealType, name, calories, protein_g: proteinG, carbs_g: carbsG, fat_g: fatG,
  })
  revalidatePath('/tools/meals')
}

export async function removeFavorite(name: string, mealType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('meal_favorites') as any).delete()
    .eq('user_id', user.id).eq('name', name).eq('meal_type', mealType)
  revalidatePath('/tools/meals')
}

export async function setWater(date: string, glasses: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('water_logs') as any).upsert({ user_id: user.id, date, glasses })
  revalidatePath('/tools/meals')
}

type GroceryCategory = { category: string; items: string[] }

export async function generateGroceryList(mealsList: string[]): Promise<GroceryCategory[]> {
  if (mealsList.length === 0) return []
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Here is a meal plan:\n${mealsList.join('\n')}\n\nGenerate a grocery shopping list organized by category. Estimate quantities for one person. Reply with ONLY a valid JSON array, no other text:\n[{"category":"Proteins","items":["Chicken breast, 1.5 lbs"]},{"category":"Produce","items":["Spinach, 1 bag"]}]\nUse these categories only: Proteins, Produce, Dairy & Eggs, Grains & Pantry, Pantry & Spices. Combine similar items. Keep each item concise.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) as GroceryCategory[] } catch { return [] }
}

type GeneratedMeal = { date: string; meal_type: string; name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }

export async function generateMealPlan(
  weekDays: string[],
  prefs: { calorieTarget: number | null; proteinTarget: number | null; carbsTarget: number | null; fatTarget: number | null; diet: string; note: string },
): Promise<GeneratedMeal[]> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const macroLine = prefs.calorieTarget
    ? `Daily targets: ${prefs.calorieTarget} kcal${prefs.proteinTarget ? `, ${prefs.proteinTarget}g protein` : ''}${prefs.carbsTarget ? `, ${prefs.carbsTarget}g carbs` : ''}${prefs.fatTarget ? `, ${prefs.fatTarget}g fat` : ''}`
    : 'No specific calorie target — use balanced portions'

  const prompt = `Generate a 7-day meal plan for one person.

${macroLine}
Diet style: ${prefs.diet || 'balanced / no restriction'}
${prefs.note ? `Special notes: ${prefs.note}` : ''}
Week dates (Mon→Sun): ${weekDays.join(', ')}

Rules:
- Provide breakfast, lunch, dinner, and one snack for EVERY day
- Vary meals — don't repeat the same meal more than twice in a week
- Macros per meal should add up close to daily targets
- Use realistic, simple meal names (5 words max)
- Keep calories accurate (e.g. oatmeal ≈ 300 kcal, not 900)

Reply with ONLY a valid JSON array — no markdown, no explanation:
[{"date":"${weekDays[0]}","meal_type":"breakfast","name":"Greek Yogurt & Berries","calories":280,"protein_g":18,"carbs_g":38,"fat_g":5}]`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2800,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const meals = JSON.parse(match[0]) as GeneratedMeal[]
    return meals.filter(m => weekDays.includes(m.date) && m.name && m.calories > 0)
  } catch { return [] }
}

export async function bulkAddMeals(meals: GeneratedMeal[]): Promise<GeneratedMeal[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const rows = meals.map(m => ({ user_id: user.id, ...m }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('meal_entries') as any)
    .insert(rows)
    .select('id, plan_date, meal_type, name, calories, protein_g, carbs_g, fat_g')

  revalidatePath('/tools/meals')
  revalidatePath('/tools')
  return (data ?? []) as GeneratedMeal[]
}
