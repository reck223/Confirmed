import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { lessonTitle, moduleName, reflectionPrompt, userReflection } = await req.json()

    if (!userReflection?.trim()) {
      return NextResponse.json({ text: null }, { status: 400 })
    }

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `You are a sharp, direct accountability coach in a goal-setting app called Manifest.
A user just completed a lesson and wrote a personal reflection. Your job is to respond in 2–3 sentences.
- Engage with what they actually wrote — don't be generic
- Either affirm something specific they said, challenge an assumption, or ask one pointed follow-up question
- Tone: warm but direct. No filler. No emojis. No "great reflection!"
- You know they just read: "${lessonTitle}" in the ${moduleName} module
- The reflection prompt was: "${reflectionPrompt}"`,
      messages: [{ role: 'user', content: userReflection.trim() }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ text: null }, { status: 500 })
  }
}
