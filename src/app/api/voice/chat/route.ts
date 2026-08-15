import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCoachContext, daysAgoDateStr } from '@/lib/coachContext'
import Anthropic from '@anthropic-ai/sdk'
import { PERSONAS, type PersonaId } from '../personas'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type HistoryTurn = { role: 'user' | 'assistant'; content: string }
type PageContext = { title: string; summary: string }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ text: null }, { status: 401 })

  try {
    const { message, history, persona, pageContext, announce } = await req.json() as {
      message: string; history: HistoryTurn[]; persona: PersonaId
      pageContext?: PageContext | null; announce?: boolean
    }
    if (!announce && !message?.trim()) return NextResponse.json({ text: null }, { status: 400 })

    const p = PERSONAS[persona] ?? PERSONAS.motivator

    // Same cross-domain context the daily briefing uses — this is what
    // makes it the same coach in both places instead of a shallower,
    // separate voice-only persona that only knows goals + streak.
    const { ctx, firstName } = await buildCoachContext(supabase, user.id)

    // If today's briefing already ran, hand it over so the voice coach
    // doesn't contradict or repeat what was already said this morning.
    let briefingLine = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: briefingRow } = await (supabase.from('coach_briefings') as any)
      .select('briefing').eq('user_id', user.id).eq('date', daysAgoDateStr(0)).maybeSingle()
    if (briefingRow?.briefing) briefingLine = `\n\nToday's briefing already told them: "${briefingRow.briefing}"`

    const pageLine = pageContext
      ? `\n\nThey're currently looking at the "${pageContext.title}" page. What's actually on their screen right now: ${pageContext.summary}`
      : ''

    const instruction = announce
      ? `They just opened you on this page and haven't said anything yet — this is a screen-reader-style voice interface, so assume they may not be looking at the screen at all. Greet ${firstName} in half a sentence, then describe what's on the page right now using the page context below, like you're reading it out loud for them. Be concrete (name the actual goals/numbers/items, don't say "a few things"). End by naturally inviting them to ask for more detail or say what they want to do.`
      : `Respond to what they just said. If they ask what's on the page, or what something means, answer from the page context below — don't make them look at the screen to find out.`

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 180,
      system: `${p.systemPrompt}

You're talking to ${firstName} out loud, voice-to-voice, on a goal-tracking app called Confirmed Creations. This voice interface is designed to be usable without looking at the screen at all — treat page context as something to describe, not something they can already see.

What you know about ${firstName} overall:
${ctx}${briefingLine}${pageLine}

${instruction}

Keep replies short — 1-4 sentences, spoken-conversation length, never a wall of text. No markdown, no lists, no emojis — this gets read aloud by a text-to-speech voice.`,
      messages: [
        ...(history ?? []).slice(-8).map(h => ({ role: h.role, content: h.content })),
        { role: 'user' as const, content: announce ? '(opened the voice coach on this page)' : message },
      ],
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ text })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ text: null }, { status: 500 })
  }
}
