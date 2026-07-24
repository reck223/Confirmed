import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { PERSONAS, type PersonaId } from '../personas'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type HistoryTurn = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ text: null }, { status: 401 })

  try {
    const { message, history, persona } = await req.json() as {
      message: string; history: HistoryTurn[]; persona: PersonaId
    }
    if (!message?.trim()) return NextResponse.json({ text: null }, { status: 400 })

    const p = PERSONAS[persona] ?? PERSONAS.motivator

    const { data: profileData } = await supabase
      .from('profiles').select('full_name, streak').eq('id', user.id).single()
    const profile = profileData as { full_name: string | null; streak: number } | null
    const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

    const { data: goalsData } = await supabase
      .from('goals').select('title, progress').eq('user_id', user.id).eq('status', 'active')
      .order('updated_at', { ascending: false }).limit(3)
    const goals = (goalsData ?? []) as { title: string; progress: number }[]
    const goalLine = goals.length
      ? `Their active goals: ${goals.map(g => `"${g.title}" (${g.progress}%)`).join(', ')}.`
      : 'They have no active goals set yet.'

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: `${p.systemPrompt}

You're talking to ${firstName} out loud, voice-to-voice, on a goal-tracking app called Confirmed Creations. ${goalLine} Their current streak is ${profile?.streak ?? 0} weeks.

Keep replies short — 1-3 sentences, spoken-conversation length, never a wall of text. No markdown, no lists, no emojis — this gets read aloud by a text-to-speech voice. Ask a follow-up question when it fits naturally, like a real conversation.`,
      messages: [
        ...(history ?? []).slice(-8).map(h => ({ role: h.role, content: h.content })),
        { role: 'user' as const, content: message },
      ],
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ text })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ text: null }, { status: 500 })
  }
}
