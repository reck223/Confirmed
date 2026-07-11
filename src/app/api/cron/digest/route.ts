import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get all user IDs from profiles
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, full_name, streak, goals_complete, assessments_submitted')
    .limit(500)

  if (profilesErr || !profiles) {
    return NextResponse.json({ error: profilesErr?.message ?? 'No profiles' }, { status: 500 })
  }

  // Week span for the digest
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() - 6)
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  // For each user, gather stats to build a personalized digest message
  let sent = 0
  const errors: string[] = []

  for (const profile of profiles) {
    try {
      const [
        { data: weekAssessment },
        { data: weekPosts },
        { data: completedGoals },
      ] = await Promise.all([
        supabase.from('assessments').select('rating, week_title').eq('user_id', profile.id).gte('week_start', weekStartStr).limit(1).single(),
        supabase.from('posts').select('id').eq('user_id', profile.id).gte('created_at', weekStartStr + 'T00:00:00Z').limit(10),
        supabase.from('goals').select('title').eq('user_id', profile.id).eq('status', 'complete').gte('updated_at', weekStartStr + 'T00:00:00Z').limit(3),
      ])

      const rating = weekAssessment?.rating
      const postsCount = weekPosts?.length ?? 0
      const doneGoals = completedGoals ?? []

      let preview = `Week of ${todayStr}`
      if (doneGoals.length > 0) {
        preview = `You completed: ${doneGoals.map(g => g.title).join(', ')}`
      } else if (rating !== null && rating !== undefined) {
        preview = `Week rating: ${rating}/10 · ${postsCount} post${postsCount !== 1 ? 's' : ''} shared`
      } else if (postsCount > 0) {
        preview = `You shared ${postsCount} update${postsCount !== 1 ? 's' : ''} this week`
      } else {
        preview = `Your streak is ${profile.streak} weeks. Keep going.`
      }

      const { error: notifErr } = await supabase.from('notifications').insert({
        to_user_id: profile.id,
        from_user_id: profile.id,
        type: 'assessment',
        data: {
          author_name: 'Weekly Digest',
          week_title: preview,
        },
      })

      if (notifErr) errors.push(`${profile.id}: ${notifErr.message}`)
      else sent++
    } catch (err) {
      errors.push(`${profile.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({ sent, errors: errors.slice(0, 10), total: profiles.length })
}
