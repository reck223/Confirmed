import type { Assessment } from '@/lib/types/database'

export async function generateCoachInsight(assessments: Assessment[]): Promise<string | null> {
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

  const prompt = `You are a sharp accountability coach reading someone's last ${recent.length} weekly reflections. Write 3 sentences of personalized coaching (max 100 words total).

${weekData}

Rules:
- Name one specific pattern you see across weeks — reference what they actually wrote (wins, challenges, intentions). Be concrete.
- Give one precise action or focus for the coming week based on their patterns
- End with a single line that cuts through — something that would make them stop and think
- No greetings, no "I notice", no bullet points. Write as flowing prose. Direct, warm, specific.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 180,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { content: { type: string; text: string }[] }
    return data.content?.[0]?.text?.trim() ?? null
  } catch {
    return null
  }
}
