import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCoachContext, daysAgoDateStr } from '@/lib/coachContext'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = "You are a sharp accountability coach embedded in a goal-tracking app with social accountability circles, XP/levels, journaling, workout tracking, a reading tracker, and a Goals feature that supports reading goals and 'Letter to Self' goals (a letter to your future self, sealed until a date you choose). You see this person's activity across every tool in the app, not just one — the whole point is to notice a connection between areas they wouldn't spot themselves (e.g. their mood has been dropping in check-ins the same days they've skipped workouts, or they haven't posted to their circle since their energy dipped). When the context shows a genuine cross-domain pattern like that, lead with it — that's more valuable than a generic nudge. If nothing connects, fall back to the single most useful nudge available: circle engagement if they haven't posted this week (posting earns XP too), starting a reading goal if they don't have one, or writing a letter to self if they haven't yet (frame it as something meaningful, not a chore). Speak in 2-4 sentences max, concrete and specific — never generic phrases like 'stay focused' or 'you've got this'. No emojis. Always end with one concrete action they can take in the app right now. When continuing a conversation (history present), respond directly to what they just said, stay in character as their coach, and keep steering toward one of: logging a check-in/workout, posting to their circle, starting a reading goal, or writing a letter to self — whichever fits best."

const daysAgoDate = daysAgoDateStr

type Turn = { role: 'user' | 'assistant'; text: string }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ text: null }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  try {
    const { message } = await req.json().catch(() => ({})) as { message?: string }
    const isFollowUp = !!message?.trim()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: todayRow } = await (supabase.from('coach_briefings') as any)
      .select('briefing, history').eq('user_id', user.id).eq('date', today).maybeSingle()
    const row = todayRow as { briefing: string; history: Turn[] } | null

    // Opening briefing already generated today — serve the persisted copy.
    // This is now the real cache (works across devices/sessions), replacing
    // the old sessionStorage cache which only covered one browser tab.
    if (!isFollowUp && row) {
      return NextResponse.json({ text: row.briefing, history: row.history ?? [] })
    }

    const { ctx } = await buildCoachContext(supabase, user.id)

    // Give the coach a memory of what it already told this person, not just
    // what the data says — real continuity instead of restarting cold every
    // morning. Only relevant for a fresh opening briefing; a same-day
    // follow-up already has that continuity via the message history below.
    let priorContext = ''
    if (!isFollowUp) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: yesterdayRow } = await (supabase.from('coach_briefings') as any)
        .select('briefing').eq('user_id', user.id).eq('date', daysAgoDate(1)).maybeSingle()
      const yb = yesterdayRow as { briefing: string } | null
      if (yb?.briefing) priorContext = `\n\nWhat you told them yesterday: "${yb.briefing}"`
    }

    const priorHistory = row?.history ?? []

    const messages: Anthropic.MessageParam[] = isFollowUp
      ? [
          { role: 'user', content: `Context about this user:\n${ctx}${priorContext}` },
          { role: 'assistant', content: row?.briefing ?? 'Got it, I\'ll keep that in mind.' },
          ...priorHistory.map(h => ({ role: h.role, content: h.text })),
          { role: 'user', content: message! },
        ]
      : [{ role: 'user', content: `Context about this user:\n${ctx}${priorContext}\n\nWrite the opening briefing.` }]

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 220,
      system: SYSTEM,
      messages,
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    const newHistory = isFollowUp ? [...priorHistory, { role: 'user' as const, text: message! }, { role: 'assistant' as const, text }] : []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('coach_briefings') as any).upsert({
      user_id: user.id,
      date: today,
      briefing: isFollowUp ? (row?.briefing ?? text) : text,
      history: newHistory,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })

    return NextResponse.json({ text, history: newHistory })
  } catch (e) {
    console.error('ai-briefing error:', e)
    return NextResponse.json({ text: null })
  }
}
