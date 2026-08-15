import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { sendPushToUser } from '@/lib/push'

export const runtime = 'nodejs'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// A goal counts as "stale" once it's gone this long with no real activity
// (goals.updated_at is bumped by milestone toggles, habit/savings/travel
// entries, and reading completions — see goals/actions.ts). Once nudged,
// it won't be nudged again for RENUDGE_DAYS even if still stale, so this
// is a periodic check-in, not a daily harangue.
const STALE_DAYS = 5
const RENUDGE_DAYS = 4
// Hard ceiling on AI calls per run — safety net against an unexpectedly
// large stale-goal backlog burning through the Anthropic budget unattended.
const MAX_NUDGES_PER_RUN = 150

type StaleGoal = {
  id: string; user_id: string; title: string; category: string | null
  why_it_matters: string | null; goal_type: string; progress: number
  updated_at: string
  full_name: string | null; streak: number; notify_stale_goal_nudge: boolean
}

function fallbackNudge(title: string) {
  return `Your goal "${title}" has been quiet for a few days — want to pick it back up?`
}

async function generateNudge(goal: StaleGoal): Promise<string> {
  const daysQuiet = Math.floor((Date.now() - new Date(goal.updated_at).getTime()) / 86400000)
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `You're a warm, direct accountability coach inside a goals app. A user's goal has gone quiet.

Goal: "${goal.title}"${goal.category ? ` (${goal.category})` : ''}
Why it matters to them: ${goal.why_it_matters || 'not specified'}
Progress so far: ${goal.progress}%
Days since any activity: ${daysQuiet}
Current streak: ${goal.streak} weeks

Write ONE short push-notification-style nudge (max 140 characters) that references something specific about the goal (its name or why it matters) — not generic. No emoji, no quotation marks around the whole thing, second person. Just the nudge text, nothing else.`,
      }],
    })
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
    return text || fallbackNudge(goal.title)
  } catch {
    return fallbackNudge(goal.title)
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const staleCutoff = new Date(Date.now() - STALE_DAYS * 86400_000).toISOString()
  const renudgeCutoff = new Date(Date.now() - RENUDGE_DAYS * 86400_000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: goalRows, error: fetchErr } = await (supabase.from('goals') as any)
    .select('id, user_id, title, category, why_it_matters, goal_type, progress, updated_at, stale_nudge_sent_at')
    .eq('status', 'active')
    .neq('goal_type', 'letter')
    .lt('updated_at', staleCutoff)
    .or(`stale_nudge_sent_at.is.null,stale_nudge_sent_at.lt.${renudgeCutoff}`)
    .limit(MAX_NUDGES_PER_RUN)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  type GoalRow = {
    id: string; user_id: string; title: string; category: string | null
    why_it_matters: string | null; goal_type: string; progress: number; updated_at: string
  }
  const goals = (goalRows ?? []) as GoalRow[]

  const userIds = [...new Set(goals.map(g => g.user_id))]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileRows } = await (supabase.from('profiles') as any)
    .select('id, full_name, streak, notify_stale_goal_nudge')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])
  type ProfileRow = { id: string; full_name: string | null; streak: number; notify_stale_goal_nudge: boolean }
  const profileMap = new Map(((profileRows ?? []) as ProfileRow[]).map(p => [p.id, p]))

  let nudged = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of goals) {
    try {
      const profile = profileMap.get(row.user_id)
      if (!profile || profile.notify_stale_goal_nudge === false) { skipped++; continue }

      const goal: StaleGoal = {
        id: row.id, user_id: row.user_id, title: row.title, category: row.category,
        why_it_matters: row.why_it_matters, goal_type: row.goal_type, progress: row.progress,
        updated_at: row.updated_at,
        full_name: profile.full_name, streak: profile.streak,
        notify_stale_goal_nudge: profile.notify_stale_goal_nudge,
      }

      const message = await generateNudge(goal)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('notifications') as any).insert({
        to_user_id: goal.user_id,
        from_user_id: goal.user_id,
        type: 'stale_goal_nudge',
        data: { title: goal.title, message, goal_id: goal.id },
      })

      await sendPushToUser(supabase, goal.user_id, {
        title: 'A goal could use some attention',
        body: message,
        url: '/goals',
      }, 'notify_stale_goal_nudge')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('goals') as any)
        .update({ stale_nudge_sent_at: new Date().toISOString() })
        .eq('id', goal.id)

      nudged++
    } catch (err) {
      errors.push(`${row.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({ nudged, skipped, errors: errors.slice(0, 10), total: goals.length })
}
