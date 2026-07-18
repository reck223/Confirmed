import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { qodAnswer, firstName, goalTitle } = await req.json() as {
      qodAnswer: string; firstName: string | null; goalTitle: string | null
    }

    const prompt = `You're helping ${firstName ?? 'someone'} set their daily intention.

They just answered this morning reflection question:
"${qodAnswer}"

${goalTitle ? `Their current main goal: "${goalTitle}"` : ''}

Write a sharp, specific daily intention — one sentence, first person, present tense. Reference what they actually wrote. Make it feel like something worth reading 10 times today.

Good examples:
"I ship the landing page today and nothing gets in the way of that."
"I show up for every conversation fully present, not half-distracted."
"I push the hard conversation I've been avoiding and do it with calm clarity."

Bad examples (too vague):
"I will be productive today."
"I focus on what matters."

Respond with ONLY the intention. No quotes, no label, no explanation.`

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{ role: 'user', content: prompt }],
    })
    const intention = (msg.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ intention })
  } catch {
    return NextResponse.json({ intention: null })
  }
}
