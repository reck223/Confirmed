import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push'

export const runtime = 'nodejs'

const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function getWeekStart(now: Date): string {
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  return sunday.toISOString().split('T')[0]
}

// Fires once daily. For each user, their weekly reflection unlocks on their
// chosen assessment_day and stays open through the following day (the
// "late" grace day) — see the identical reflectionUnlocked logic in
// src/app/(app)/home/page.tsx. This only nudges on that grace day itself:
// the very last chance before the streak resets, not the day it merely
// becomes available (which isn't actually "at risk" yet).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, full_name, streak, assessment_day')
    .gt('streak', 0)
    .limit(500)

  if (profilesErr || !profiles) {
    return NextResponse.json({ error: profilesErr?.message ?? 'No profiles' }, { status: 500 })
  }

  const now = new Date()
  const todayNum = now.getDay()
  const weekStartStr = getWeekStart(now)

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const profile of profiles as { id: string; full_name: string | null; streak: number; assessment_day: string | null }[]) {
    try {
      const setDayNum = DAY_MAP[profile.assessment_day ?? 'Sun'] ?? 0
      const lateDay = (setDayNum + 1) % 7
      if (todayNum !== lateDay) { skipped++; continue }

      const { data: thisWeek } = await supabase
        .from('assessments')
        .select('id')
        .eq('user_id', profile.id)
        .eq('week_start', weekStartStr)
        .maybeSingle()

      if (thisWeek) { skipped++; continue } // already reflected this week — streak is safe

      const firstName = profile.full_name?.split(' ')[0] ?? 'there'
      await sendPushToUser(supabase, profile.id, {
        title: `${profile.streak}-week streak ends today, ${firstName}`,
        body: 'Do your weekly reflection before the day is out to keep it alive.',
        url: '/assess',
      }, 'notify_streak_reminder')
      sent++
    } catch (err) {
      errors.push(`${profile.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({ sent, skipped, errors: errors.slice(0, 10), total: profiles.length })
}
