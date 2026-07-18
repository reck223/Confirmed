import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const {
      circleName, covenant, seasonDuration, members, totalPosts,
      topContributors, weeklyHighs, creatorName,
    } = await req.json()

    const memberLines = (members as { full_name: string | null; post_count_total: number; streak: number }[])
      .sort((a, b) => b.post_count_total - a.post_count_total)
      .map(m => `- ${m.full_name ?? 'Member'}: ${m.post_count_total} posts, ${m.streak}-week streak`)
      .join('\n')

    const ctx = [
      `Circle: "${circleName}"`,
      covenant ? `Covenant: "${covenant}"` : '',
      `Season length: ${seasonDuration} days`,
      `Creator: ${creatorName ?? 'the leader'}`,
      `Total posts this season: ${totalPosts}`,
      `Members (${members.length} total):`,
      memberLines,
      topContributors?.length ? `\nTop contributors: ${(topContributors as string[]).join(', ')}` : '',
      weeklyHighs?.length ? `\nWeekly highlights: ${(weeklyHighs as string[]).join('; ')}` : '',
    ].filter(Boolean).join('\n')

    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 450,
      system: `You are writing the end-of-season recap for an accountability circle on a goal-tracking app called Confirmed Creations.

Write exactly 3 short paragraphs, no headers or labels:
1. What this circle achieved — the energy, the highlights, specific wins if you can infer them. Make it feel earned.
2. Who stood out — name the top contributors and what their consistency says about them.
3. A send-off line for the next season — one motivating sentence that calls them forward.

Tone: warm, specific, earned — like a coach who actually watched the season. No fluff. No emojis. Max 5 sentences total.`,
      messages: [{ role: 'user', content: ctx }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ text })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ text: null })
  }
}
