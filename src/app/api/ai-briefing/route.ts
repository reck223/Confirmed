import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { firstName, topGoal, energy, streak, workout } = await req.json()

    const ctx = [
      `Name: ${firstName}`,
      topGoal   ? `Active goal: "${topGoal}"` : 'No active goals yet',
      energy    ? `Energy today: ${energy}/10` : 'No check-in yet',
      streak > 0 ? `Streak: ${streak} weeks` : '',
      workout   ? `Today's workout: ${workout}` : 'No workout planned',
    ].filter(Boolean).join('\n')

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 110,
      system: "You are a sharp accountability coach writing a personalized morning briefing. 2 sentences max. Reference the user's real goal or today's workout specifically — no generic phrases like 'stay focused' or 'you've got this'. Be concrete. No emojis.",
      messages: [{ role: 'user', content: ctx }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ text: null })
  }
}
