import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildSchemas, type PromptSchemaId } from '../prompts'
import { getTodayQod } from '@/lib/qod'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type HistoryTurn = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ reply: null }, { status: 401 })

  try {
    const { schemaId, message, history } = await req.json() as {
      schemaId: PromptSchemaId; message: string; history: HistoryTurn[]
    }

    const schema = buildSchemas(getTodayQod().q)[schemaId]
    if (!schema) return NextResponse.json({ reply: null }, { status: 400 })

    const fieldList = schema.fields.map(f => `- ${f.id}: ${f.label}`).join('\n')

    const system = `You are a warm, efficient voice coach helping someone fill out "${schema.title}" by talking instead of typing.

${schema.guidance}

Fields you need to collect:
${fieldList}

Rules:
- Keep every spoken reply short — 1-2 sentences, this gets read aloud.
- Ask about one or two fields per turn, not a robotic list.
- Once you have enough real information for the fields (skip truly optional-sounding ones if they clearly have nothing to add), finish up.
- You MUST respond with ONLY valid JSON, no markdown fences, no other text, in exactly this shape:
  {"reply": "<what to say out loud>", "done": false, "data": null}
  or, once finished:
  {"reply": "<a short confirmation line, e.g. 'Got it, saving that now.'>", "done": true, "data": {"<field id>": <value>, ...}}
- In the final "data" object, use the exact field ids listed above. Numbers must be actual JSON numbers, not strings. If a field is a list (like exercises), use a JSON array of objects.`

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system,
      messages: [
        ...(history ?? []).slice(-10).map(h => ({ role: h.role, content: h.content })),
        { role: 'user' as const, content: message },
      ],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ reply: null }, { status: 500 })

    const parsed = JSON.parse(match[0]) as { reply: string; done: boolean; data: Record<string, unknown> | null }
    return NextResponse.json(parsed)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ reply: null }, { status: 500 })
  }
}
