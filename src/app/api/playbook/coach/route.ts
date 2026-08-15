import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCoachContext } from '@/lib/coachContext'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ text: null }, { status: 401 })

  try {
    const { lessonTitle, moduleName, reflectionPrompt, userReflection } = await req.json()

    if (!userReflection?.trim()) {
      return NextResponse.json({ text: null }, { status: 400 })
    }

    let broaderContext = ''
    try {
      const { ctx } = await buildCoachContext(supabase, user.id)
      broaderContext = `\n\nWhat else you know about them: ${ctx}`
    } catch { /* lesson reflection alone is still useful without this */ }

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `You are a sharp, direct accountability coach in a goal-setting app called Manifest.
A user just completed a lesson and wrote a personal reflection. Your job is to respond in 2–3 sentences.
- Engage with what they actually wrote — don't be generic
- Either affirm something specific they said, challenge an assumption, or ask one pointed follow-up question — tying it to their actual goals/streak/circle activity when it genuinely fits is better than a generic reply
- Tone: warm but direct. No filler. No emojis. No "great reflection!"
- You know they just read: "${lessonTitle}" in the ${moduleName} module
- The reflection prompt was: "${reflectionPrompt}"${broaderContext}`,
      messages: [{ role: 'user', content: userReflection.trim() }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ text: null }, { status: 500 })
  }
}
