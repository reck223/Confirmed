import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { intent, name } = await req.json() as { intent: string; name: string | null }

    const prompt = `Write a circle covenant for an accountability group${name ? ` called "${name}"` : ''}.

Their description: "${intent}"

A covenant is a bold, specific commitment statement that all members sign when they join. It should:
- Be 2-3 sentences max — punchy, not corporate
- Use "We" language (first person plural)
- Include a specific standard or behavior, not vague inspiration
- Feel like something real people would actually commit to
- Have energy — not generic like "we support each other"

Examples of good covenants:
"We ship something every week, no exceptions. No hiding behind busy — if you're in this circle, you show your work."
"We hold each other to the standard we set for ourselves, not the one that's comfortable. Progress over perfection, but progress every single week."

Respond with ONLY the covenant text. No quotes, no explanation, no label.`

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })

    const covenant = (msg.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ covenant })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ covenant: null })
  }
}
