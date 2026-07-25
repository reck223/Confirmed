import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = "You are a sharp accountability coach embedded in a goal-tracking app with social accountability circles, XP/levels, and a Goals feature that supports reading goals and 'Letter to Self' goals (a letter to your future self, sealed until a date you choose). Speak in 2-4 sentences max, concrete and specific — never generic phrases like 'stay focused' or 'you've got this'. Use the real context given to you: their goal, workout, circle activity, XP/level, and whether they have a reading goal or letter-to-self goal yet. Nudge circle engagement if they haven't posted this week (posting earns XP too). If they have no reading goal, suggest starting one. If they have no letter-to-self goal, suggest writing one — frame it as something meaningful, not a chore. Always end with one concrete action they can take in the app right now. No emojis. When continuing a conversation (history present), respond directly to what they just said, stay in character as their coach, and keep steering toward one of: logging a check-in/workout/meal, posting to their circle, starting a reading goal, or writing a letter to self — whichever fits best."

export async function POST(req: NextRequest) {
  try {
    const {
      firstName, topGoal, energy, streak, workout,
      circleName, circlePostsThisWeek,
      xp, level, hasReadingGoal, hasLetterGoal,
      message, history,
    } = await req.json()

    const ctx = [
      `Name: ${firstName}`,
      topGoal   ? `Active goal: "${topGoal}"` : 'No active goals yet',
      energy    ? `Energy today: ${energy}/10` : 'No check-in yet',
      streak > 0 ? `Streak: ${streak} weeks` : '',
      workout   ? `Today's workout: ${workout}` : 'No workout planned',
      circleName ? `Circle: "${circleName}"` : 'Not in a circle yet',
      circleName ? (circlePostsThisWeek > 0
        ? `Posted to circle ${circlePostsThisWeek}x this week`
        : 'Has not posted to circle this week') : '',
      typeof xp === 'number' ? `XP: ${xp}${level ? ` (${level})` : ''}` : '',
      hasReadingGoal ? 'Has an active reading goal' : 'Does NOT have a reading goal yet',
      hasLetterGoal ? 'Has already written a letter to self' : 'Has NOT written a letter to self yet',
    ].filter(Boolean).join('\n')

    const isFollowUp = Array.isArray(history) && history.length > 0

    const messages: Anthropic.MessageParam[] = isFollowUp
      ? [
          { role: 'user', content: `Context about this user:\n${ctx}` },
          { role: 'assistant', content: 'Got it, I\'ll keep that in mind.' },
          ...history.map((h: { role: 'user' | 'assistant'; text: string }) => ({
            role: h.role,
            content: h.text,
          })),
          { role: 'user', content: message },
        ]
      : [{ role: 'user', content: `Context about this user:\n${ctx}\n\nWrite the opening briefing.` }]

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM,
      messages,
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ text: null })
  }
}
