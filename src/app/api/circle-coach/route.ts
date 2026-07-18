import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { circleName, covenant, healthScore, daysLeft, seasonDuration, members, commitments, recentPosts, creatorName } = await req.json()

    const memberLines = (members as { full_name: string | null; post_count_week: number; streak: number; active_goal: { title: string } | null }[])
      .map(m => {
        const name = m.full_name ?? 'Anonymous'
        const posted = m.post_count_week > 0 ? `posted ${m.post_count_week}x` : 'no posts'
        const commitment = (commitments as { full_name: string | null; text: string }[]).find(c => c.full_name === name)
        const goal = m.active_goal ? `working on "${m.active_goal.title}"` : ''
        return `- ${name}: ${posted}${commitment ? `, committed to "${commitment.text}"` : ', no commitment'}${goal ? `, ${goal}` : ''}`
      }).join('\n')

    const postLines = (recentPosts as { author_name: string | null; type: string; content: string }[])
      .slice(0, 5)
      .map(p => `- ${p.author_name ?? 'Member'} (${p.type}): "${p.content.slice(0, 80)}"`)
      .join('\n')

    const ctx = [
      `Circle: "${circleName}"`,
      covenant ? `Covenant: "${covenant}"` : '',
      `Season: ${daysLeft} days remaining of ${seasonDuration}-day season`,
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
