'use server'
import Anthropic from '@anthropic-ai/sdk'

type AiExercise = { name: string; sets: number; reps: string; isCardio: boolean }

export async function generateWorkoutPlan(
  types: string[],
  equipment: string[],
  goalTitle: string | null,
  feeling?: string | null,
): Promise<{ exercises: AiExercise[]; error?: string }> {
  if (types.length === 0) return { exercises: [], error: 'Select a training type first' }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const equipmentLine = equipment.length > 0
    ? `Available equipment: ${equipment.join(', ')}`
    : 'Equipment: full gym access'

  const goalLine = goalTitle ? `Fitness goal context: "${goalTitle}"` : ''
  const feelingLine = feeling?.trim()
    ? `How they say they're feeling right now: "${feeling.trim()}" — actually adjust the session for this. Sore, tired, low energy, stressed, or injured means fewer sets, lighter suggested loads, more mobility/stretch-style movements, or swapping high-impact exercises for gentler ones. Energetic or "ready to go" means you can push volume/intensity normally. Don't just acknowledge the feeling — let it change what you generate.`
    : ''

  const isStretchOrMobility = types.some(t => t === 'Stretch' || t === 'Mobility')

  const prompt = `You are creating a personalized workout session.

Training type(s): ${types.join(' + ')}
${equipmentLine}
${goalLine}
${feelingLine}

Generate 6–9 exercises for a focused, effective session. Rules:
- Match the training type(s) exactly
- Only use exercises that match available equipment
- Order: compound movements first, isolation last, cardio at end if included
${isStretchOrMobility
  ? '- This is a stretch/mobility session, not a lifting session: use sets:1-2, reps like "30 sec hold" or "10 each side", isCardio:false, and real stretch/mobility movement names (e.g. "Hamstring Stretch", "Hip Circles", "Cat-Cow", "World\'s Greatest Stretch")'
  : '- For cardio use: sets:1, reps like "20 min" or "400m", isCardio:true\n- For strength: sets 3–5, reps like "8–10" or "12" or "5", isCardio:false'}
- Use real exercise names (e.g. "Bench Press", "Pull-ups", "Romanian Deadlift")

Reply with ONLY a valid JSON array, no markdown, no other text:
[{"name":"Bench Press","sets":4,"reps":"8–10","isCardio":false}]`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const start = raw.indexOf('[')
    const end = raw.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error(`No JSON array in response: ${raw.slice(0, 120)}`)
    const exercises = JSON.parse(raw.slice(start, end + 1)) as AiExercise[]
    if (!Array.isArray(exercises) || exercises.length === 0) throw new Error('empty array returned')
    return { exercises: exercises.slice(0, 10) }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generateWorkoutPlan]', msg)
    return { exercises: [], error: msg }
  }
}
