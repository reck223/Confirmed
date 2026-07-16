import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { topic, moduleName } = await req.json()

    if (!topic?.trim()) {
      return NextResponse.json({ lesson: null }, { status: 400 })
    }

    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 800,
      system: `You are writing a lesson for Manifest, a goal-setting app. Lessons are concise, practical, and written for people serious about personal development.
The lesson belongs to the "${moduleName}" module.

Return ONLY valid JSON with this exact shape:
{
  "title": "string (5–8 words, punchy)",
  "duration": "string (e.g. '4 min')",
  "pullQuote": "string (one high-impact sentence that captures the core idea — the kind of thing someone would screenshot)",
  "content": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "reflection": "string (one honest, pointed question that makes the reader think about their own life)"
}

Lesson guidelines:
- Each paragraph: 2–4 sentences, no fluff
- Don't use words like "journey", "unlock", "empower", "transformative"
- Write as if briefing a smart, busy person who has zero patience for motivational filler
- The pull quote must stand alone — no context needed to understand it
- The reflection question should be personal, not abstract ("What would you do if..." not "How might someone...")`
      ,
      messages: [{ role: 'user', content: `Topic: ${topic.trim()}` }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ lesson: null }, { status: 500 })

    const lesson = JSON.parse(jsonMatch[0])
    return NextResponse.json({ lesson })
  } catch {
    return NextResponse.json({ lesson: null }, { status: 500 })
  }
}
