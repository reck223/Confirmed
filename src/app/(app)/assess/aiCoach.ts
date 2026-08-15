import type { Assessment } from '@/lib/types/database'
import type { createClient } from '@/lib/supabase/server'
import { buildCoachContext } from '@/lib/coachContext'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// supabase/userId are optional so existing callers (if any) don't break,
// but every current call site has both — without them this only ever saw
// assessment ratings/wins/challenges, none of the cross-domain context
// (goals, streak, circle, mood) every other coach surface gets.
export async function generateCoachInsight(
  assessments: Assessment[],
  supabase?: Awaited<ReturnType<typeof createClient>>,
  userId?: string,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_key_here' || assessments.length < 2) return null

  const recent = [...assessments].slice(0, 6).reverse()

  const weekData = recent.map((a, i) => {
    const parts: string[] = [`${a.rating ?? '?'}/10`]
    if (a.wins)        parts.push(`Wins: "${a.wins.slice(0, 100)}"`)
    if (a.challenges)  parts.push(`Challenge: "${a.challenges.slice(0, 100)}"`)
    if (a.lessons)     parts.push(`Lesson: "${a.lessons.slice(0, 80)}"`)
    if (a.intentions)  parts.push(`Next week: "${a.intentions.slice(0, 80)}"`)
    return `Week ${i + 1} (${a.week_start}): ${parts.join(' | ')}`
  }).join('\n')

  let broaderContext = ''
  if (supabase && userId) {
    try {
      const { ctx } = await buildCoachContext(supabase, userId)
      broaderContext = `\n\nWhat else is going on for them right now, beyond these reflections:\n${ctx}`
    } catch { /* weekly-reflection data alone is still useful without this */ }
  }

  const prompt = `You are a sharp accountability coach reading someone's last ${recent.length} weekly reflections. Write 3 sentences of personalized coaching (max 100 words total).

${weekData}${broaderContext}

Rules:
- Name one specific pattern you see across weeks — reference what they actually wrote (wins, challenges, intentions). Be concrete.
- If the broader context connects to the pattern (e.g. their energy dropped the same weeks they mentioned a challenge), that's worth naming — it's more valuable than a generic nudge.
- Give one precise action or focus for the coming week based on their patterns
- End with a single line that cuts through — something that would make them stop and think
- No greetings, no "I notice", no bullet points. Write as flowing prose. Direct, warm, specific.`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 180,
      messages: [{ role: 'user', content: prompt }],
    })
    return (msg.content[0] as { type: string; text: string }).text.trim()
  } catch {
    return null
  }
}
