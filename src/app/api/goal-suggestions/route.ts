import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { intent, category } = await req.json() as { intent: string; category: string | null }

    const prompt = `Someone wants to set a goal. Here is what they said they want: "${intent}"${category ? ` (life area: ${category})` : ''}

Generate exactly 3 specific, quantifiable goal suggestions for them. Each goal must:
- Have a concrete measurable number (not vague like "get fit" — instead "lose 18 lbs" or "run 3x per week for 12 weeks")
- Feel personal to what they described, not generic
- Include a specific timeline
- Have 3–5 practical milestones in order

Respond with ONLY a valid JSON array, no explanation, no markdown:
[
  {
    "title": "Specific quantifiable goal title",
    "category": "one of: health, career, finance, learning, creative, business, mindset, relationships, personal, adventure, spiritual",
    "deadlineWeeks": 12,
    "milestones": ["First step", "Second step", "Third step", "Final step"]
  }
]`

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const start = raw.indexOf('[')
    const end = raw.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error('No JSON array found')
    const suggestions = JSON.parse(raw.slice(start, end + 1))
    return NextResponse.json({ suggestions })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ suggestions: null })
  }
}
