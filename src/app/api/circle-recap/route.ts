import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCircleSummary } from '@/lib/circleSummary'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ text: null }, { status: 401 })

  try {
    const { circleId } = await req.json() as { circleId: string }
    if (!circleId) return NextResponse.json({ text: null }, { status: 400 })

    const summary = await buildCircleSummary(supabase, user.id, circleId)
    if (!summary) return NextResponse.json({ text: null }, { status: 403 })
    const { circleName, covenant, seasonDuration, members, totalPostsSeason, topContributors, creatorName } = summary

    const memberLines = [...members]
      .sort((a, b) => b.post_count_season - a.post_count_season)
      .map(m => `- ${m.full_name ?? 'Member'}: ${m.post_count_season} posts, ${m.streak}-week streak`)
      .join('\n')

    const ctx = [
      `Circle: "${circleName}"`,
      covenant ? `Covenant: "${covenant}"` : '',
      `Season length: ${seasonDuration} days`,
      `Creator: ${creatorName ?? 'the leader'}`,
      `Total posts this season: ${totalPostsSeason}`,
      `Members (${members.length} total):`,
      memberLines,
      topContributors.length ? `\nTop contributors: ${topContributors.join(', ')}` : '',
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
