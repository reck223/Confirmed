import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Every table with a user-owned row worth handing back. Best-effort: a
// table that doesn't exist yet or a query that errors is skipped rather
// than failing the whole export, since new tools tables get added often.
const USER_TABLES: { table: string; column: string }[] = [
  { table: 'goals', column: 'user_id' },
  { table: 'goal_milestones', column: 'user_id' },
  { table: 'goal_entries', column: 'user_id' },
  { table: 'assessments', column: 'user_id' },
  { table: 'journal_entries', column: 'user_id' },
  { table: 'posts', column: 'user_id' },
  { table: 'post_reactions', column: 'user_id' },
  { table: 'circle_members', column: 'user_id' },
  { table: 'follows', column: 'follower_id' },
  { table: 'messages', column: 'sender_id' },
  { table: 'notifications', column: 'to_user_id' },
  { table: 'daily_checkins', column: 'user_id' },
  { table: 'challenges', column: 'user_id' },
  { table: 'challenge_logs', column: 'user_id' },
  { table: 'budget_transactions', column: 'user_id' },
  { table: 'body_metrics', column: 'user_id' },
  { table: 'workout_sessions', column: 'user_id' },
  { table: 'meal_entries', column: 'user_id' },
  { table: 'water_logs', column: 'user_id' },
  { table: 'book_sessions', column: 'user_id' },
  { table: 'coach_briefings', column: 'user_id' },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  const data: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile,
  }

  for (const { table, column } of USER_TABLES) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await (supabase.from(table) as any).select('*').eq(column, user.id)
      if (rows) data[table] = rows
    } catch {
      // table doesn't exist or query failed — skip, don't fail the whole export
    }
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="manifest-export-${user.id}.json"`,
    },
  })
}
