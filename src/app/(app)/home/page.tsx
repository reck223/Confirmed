import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HomeClient } from './HomeClient'
import { PLAYBOOK } from '../playbook/content'
import type { Profile, Goal } from '@/lib/types/database'

function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()
}

function getLast7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function getWeekStart(): string {
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  return sunday.toISOString().split('T')[0]
}

const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const last7 = getLast7Dates()
  const sevenDaysAgo = last7[0]

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: profileData },
    { data: goalsData },
    { data: checkInData },
    { data: playbookRows },
    { data: assessmentData },
    { data: journalToday },
    { data: energyRow },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, streak, xp, level, pinned_goal_id, assessment_day').eq('id', user.id).single(),
    supabase.from('goals')
      .select('id, title, category, progress, next_action, deadline')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase.from('check_ins').select('date').eq('user_id', user.id).gte('date', sevenDaysAgo),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('playbook_progress') as any).select('lesson_id').eq('user_id', user.id),
    supabase.from('assessments').select('id, rating, week_title').eq('user_id', user.id).eq('week_start', getWeekStart()).maybeSingle(),
    supabase.from('journal_entries').select('id').eq('user_id', user.id).gte('created_at', today).limit(1),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('daily_checkins') as any).select('energy').eq('user_id', user.id).eq('date', today).maybeSingle(),
  ])

  type ProfileRow = Pick<Profile, 'full_name' | 'streak' | 'xp' | 'level' | 'pinned_goal_id'> & { assessment_day?: string }
  const profile = profileData as ProfileRow | null
  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there'

  type GoalRow = Pick<Goal, 'id' | 'title' | 'category' | 'progress' | 'next_action' | 'deadline'>
  const goals = (goalsData ?? []) as GoalRow[]

  // 7-day momentum: one dot per day, gold if check-in exists
  const checkedDates = new Set((checkInData ?? []).map((r: { date: string }) => r.date))
  const momentumDays = last7.map(date => ({
    date,
    dayLabel: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
    done: checkedDates.has(date),
  }))

  // Mission: pinned goal first, else most recently updated active goal
  const pinnedId = profile?.pinned_goal_id
  const missionGoal = (pinnedId ? goals.find(g => g.id === pinnedId) : undefined) ?? goals[0] ?? null

  // Rings: top 3 active goals
  const ringGoals = goals.slice(0, 3)

  // Weekly reflection state
  const assessmentDay = profile?.assessment_day ?? 'Sun'
  const setDayNum = DAY_MAP[assessmentDay] ?? 0
  const todayNum = new Date().getDay()
  const lateDay = (setDayNum + 1) % 7
  const reflectionUnlocked = todayNum === setDayNum || todayNum === lateDay
  const reflectionDayName = DAY_NAMES[setDayNum]
  type AssessRow = { id: string; rating: number | null; week_title: string | null }
  const weeklyReflection = assessmentData
    ? { rating: (assessmentData as AssessRow).rating ?? 5, weekTitle: (assessmentData as AssessRow).week_title }
    : null

  // Next playbook lesson: first uncompleted across all modules
  const completedIds = new Set((playbookRows ?? []).map((r: { lesson_id: string }) => r.lesson_id))
  type NextLesson = { moduleEmoji: string; moduleTitle: string; moduleColor: string; lessonTitle: string; duration: string }
  let nextLesson: NextLesson | null = null
  outer: for (const mod of PLAYBOOK) {
    for (const lesson of mod.lessons) {
      if (!completedIds.has(lesson.id)) {
        nextLesson = { moduleEmoji: mod.emoji, moduleTitle: mod.title, moduleColor: mod.color, lessonTitle: lesson.title, duration: lesson.duration }
        break outer
      }
    }
  }

  const qodAnswered  = (journalToday ?? []).length > 0
  const missionDone  = checkedDates.has(today)
  const energyToday  = (energyRow as { energy: number } | null)?.energy ?? null

  return (
    <HomeClient
      firstName={firstName}
      streak={profile?.streak ?? 0}
      xp={profile?.xp ?? 0}
      level={profile?.level ?? 1}
      todayLabel={getTodayLabel()}
      momentumDays={momentumDays}
      missionGoal={missionGoal}
      ringGoals={ringGoals}
      nextLesson={nextLesson}
      weeklyReflection={weeklyReflection}
      reflectionUnlocked={reflectionUnlocked}
      reflectionDayName={reflectionDayName}
      qodAnswered={qodAnswered}
      missionDone={missionDone}
      energyToday={energyToday}
    />
  )
}
