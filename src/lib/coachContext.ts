import { createClient } from '@/lib/supabase/server'
import { getLevelInfo } from '@/lib/xp'

function daysAgoIso(n: number) {
  return new Date(Date.now() - n * 86400_000).toISOString()
}
function daysAgoDate(n: number) {
  return daysAgoIso(n).split('T')[0]
}
function weekStartDate() {
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  return sunday.toISOString().split('T')[0]
}

// Cross-domain user context — goals, streak/XP, circle activity, workouts,
// mood/energy, reading, budget. Shared by every coach surface (daily
// briefing, voice chat/fill) so they all draw on the same picture of the
// person instead of each reimplementing a thinner version of it.
export async function buildCoachContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const sevenDaysAgoIso = daysAgoIso(7)
  const sevenDaysAgoDate = daysAgoDate(7)

  const [
    { data: profileData },
    { data: goalsData },
    { data: readingLetterGoals },
    { data: membershipRow },
    { data: journalRows },
    { data: workoutRows },
    { data: budgetRows },
    { data: bookRow },
    { data: checkinRows },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, streak, xp').eq('id', userId).single(),
    supabase.from('goals')
      .select('title, progress, next_action')
      .eq('user_id', userId).eq('status', 'active')
      .order('updated_at', { ascending: false }).limit(5),
    supabase.from('goals').select('goal_type, status').eq('user_id', userId).in('goal_type', ['reading', 'letter']),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('circle_members') as any).select('circle_id').eq('user_id', userId).limit(1).maybeSingle(),
    supabase.from('journal_entries').select('type, content').eq('user_id', userId).gte('created_at', sevenDaysAgoIso),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('workout_sessions') as any).select('name, date').eq('user_id', userId).gte('date', sevenDaysAgoDate),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('budget_transactions') as any).select('id').eq('user_id', userId).gte('txn_date', sevenDaysAgoDate),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('books') as any).select('title, current_page, total_pages').eq('user_id', userId).eq('status', 'reading').limit(1).maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('daily_checkins') as any).select('date, energy').eq('user_id', userId).gte('date', sevenDaysAgoDate).order('date', { ascending: true }),
  ])

  let circleName: string | null = null
  let circlePostsThisWeek = 0
  if (membershipRow?.circle_id) {
    const [{ data: circleRow }, { data: weekPosts }] = await Promise.all([
      supabase.from('circles').select('name').eq('id', membershipRow.circle_id).maybeSingle(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('posts') as any).select('id').eq('user_id', userId).eq('circle_id', membershipRow.circle_id).gte('created_at', weekStartDate() + 'T00:00:00'),
    ])
    circleName = (circleRow as { name: string } | null)?.name ?? null
    circlePostsThisWeek = (weekPosts ?? []).length
  }

  const profile = profileData as { full_name: string | null; streak: number; xp: number } | null
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const goals = (goalsData ?? []) as { title: string; progress: number; next_action: string | null }[]
  const topGoal = goals[0] ?? null
  const readingLetter = (readingLetterGoals ?? []) as { goal_type: string; status: string }[]
  const hasReadingGoal = readingLetter.some(g => g.goal_type === 'reading' && g.status !== 'complete')
  const hasLetterGoal = readingLetter.some(g => g.goal_type === 'letter')

  const journal = (journalRows ?? []) as { type: string; content: Record<string, unknown> }[]
  const moods = journal
    .filter(j => j.type === 'checkin' && j.content?.mood)
    .map(j => parseInt(String(j.content.mood)))
    .filter(m => m >= 1 && m <= 5)
  const journalEntryCount = journal.length

  const workouts = (workoutRows ?? []) as { name: string; date: string }[]
  const budgetEntriesThisWeek = (budgetRows ?? []).length
  const book = bookRow as { title: string; current_page: number; total_pages: number } | null
  const checkins = (checkinRows ?? []) as { date: string; energy: number }[]

  const ctx = [
    `Name: ${firstName}`,
    topGoal ? `Top active goal: "${topGoal.title}" (${topGoal.progress}% done)${topGoal.next_action ? `, next action: ${topGoal.next_action}` : ''}` : 'No active goals yet',
    profile?.streak ? `Streak: ${profile.streak} weeks` : '',
    typeof profile?.xp === 'number' ? `XP: ${profile.xp} (${getLevelInfo(profile.xp).title})` : '',
    circleName ? `Circle: "${circleName}", posted ${circlePostsThisWeek}x this week` : 'Not in a circle yet',
    workouts.length > 0 ? `Worked out ${workouts.length}x in the last 7 days (${workouts.map(w => w.name).join(', ')})` : 'No workouts logged in the last 7 days',
    moods.length >= 2
      ? `Mood check-ins over the last 7 days (oldest→newest, 1=worst 5=best): ${moods.join(', ')} — ${moods.at(-1)! < moods[0] ? 'trending down' : moods.at(-1)! > moods[0] ? 'trending up' : 'steady'}`
      : (journalEntryCount > 0 ? `Journaled ${journalEntryCount}x in the last 7 days` : 'No journal entries in the last 7 days'),
    checkins.length > 0 ? `Energy check-ins (last 7 days, 1-10): ${checkins.map(c => c.energy).join(', ')}` : '',
    book ? `Currently reading "${book.title}" — ${Math.round((book.current_page / book.total_pages) * 100)}% through` : '',
    budgetEntriesThisWeek > 0 ? `Logged ${budgetEntriesThisWeek} budget entries this week` : '',
    hasReadingGoal ? 'Has an active reading goal' : 'Does NOT have a reading goal yet',
    hasLetterGoal ? 'Has already written a letter to self' : 'Has NOT written a letter to self yet',
  ].filter(Boolean).join('\n')

  return { ctx, firstName, streak: profile?.streak ?? 0 }
}

export function daysAgoDateStr(n: number) {
  return daysAgoDate(n)
}
