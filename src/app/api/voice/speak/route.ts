import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PERSONAS, type PersonaId } from '../personas'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 500 })

  try {
    const { text, persona } = await req.json() as { text: string; persona: PersonaId }
    if (!text?.trim()) return NextResponse.json({ error: 'no text' }, { status: 400 })

    const voiceId = (PERSONAS[persona] ?? PERSONAS.motivator).voiceId

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5', // low-latency, needed for conversational back-and-forth
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })

    if (!r.ok) {
      const errText = await r.text()
      console.error('ElevenLabs error:', r.status, errText)
      return NextResponse.json({ error: 'tts failed' }, { status: 502 })
    }

    const audio = await r.arrayBuffer()
    return new NextResponse(audio, { headers: { 'Content-Type': 'audio/mpeg' } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'tts failed' }, { status: 500 })
  }
}
