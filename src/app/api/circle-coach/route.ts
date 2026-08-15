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
    const { circleName, covenant, healthScore, daysLeft, seasonDuration, members, commitments, recentPosts, creatorName } = summary

    const memberLines = members
      .map(m => {
        const name = m.full_name ?? 'Anonymous'
        const posted = m.post_count_week > 0 ? `posted ${m.post_count_week}x` : 'no posts'
        const commitment = commitments.find(c => c.full_name === name)
        const goal = m.active_goal ? `working on "${m.active_goal.title}"` : ''
        return `- ${name}: ${posted}${commitment ? `, committed to "${commitment.text}"` : ', no commitment'}${goal ? `, ${goal}` : ''}`
      }).join('\n')

    const postLines = recentPosts
      .slice(0, 5)
      .map(p => `- ${p.author_name ?? 'Member'} (${p.type}): "${p.content.slice(0, 80)}"`)
      .join('\n')

    const ctx = [
      `Circle: "${circleName}"`,
      covenant ? `Covenant: "${covenant}"` : '',
      `Season: ${daysLeft ?? '?'} days remaining of ${seasonDuration}-day season`,
      `Health score: ${healthScore}%`,
      `Creator: ${creatorName ?? 'the leader'}`,
      '',
      `Members this week (${members.length} total):`,
      memberLines,
      '',
      recentPosts.length > 0 ? `Recent posts:\n${postLines}` : 'No posts this week.',
    ].filter(s => s !== undefined).join('\n')

    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 350,
      system: `You are a sharp, direct circle leadership coach. You write weekly insights for circle creators on an accountability platform.

Your response has exactly 3 parts, each a single short paragraph with no headers or labels:
1. What went well this week — name specific people and what they did. Be specific.
2. Who needs attention — if anyone went quiet, name them. Be honest but not harsh.
3. One concrete action for the creator to take this week — specific and actionable, not generic.

Tone: direct, warm, no fluff. No emojis. Max 4 sentences total across all 3 parts.`,
      messages: [{ role: 'user', content: ctx }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    return NextResponse.json({ text })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ text: null })
  }
}
