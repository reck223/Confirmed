import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM_EMAIL = 'Manifest <digest@confirmedcreations.com>'

function buildEmailHtml(params: {
  firstName: string
  streak: number
  postsCount: number
  rating: number | null
  doneGoals: string[]
  preview: string
}): string {
  const { firstName, streak, postsCount, rating, doneGoals } = params
  const streakLine = streak > 0 ? `<p style="margin:0 0 6px;font-size:13px;color:#888">🔥 ${streak}-week streak</p>` : ''
  const goalItems = doneGoals.map(t => `<li style="margin-bottom:4px">${t}</li>`).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;color:#EFEFEF">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto">

        <!-- Header -->
        <tr><td style="padding:0 24px 32px">
          <p style="margin:0 0 24px;font-size:11px;font-weight:800;letter-spacing:0.14em;color:#D4AF37">MANIFEST · WEEKLY DIGEST</p>
          <h1 style="margin:0 0 8px;font-size:32px;font-weight:900;color:#EFEFEF;line-height:1.1">Your week,<br><span style="color:#D4AF37">${firstName}.</span></h1>
          ${streakLine}
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 24px"><div style="height:1px;background:rgba(255,255,255,0.08);margin-bottom:28px"></div></td></tr>

        <!-- Stats row -->
        <tr><td style="padding:0 24px 28px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${rating !== null ? `<td align="center" style="padding:16px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:12px">
                <p style="margin:0 0 4px;font-size:28px;font-weight:900;color:#D4AF37">${rating}/10</p>
                <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4)">WEEK RATING</p>
              </td>
              <td width="12"></td>` : ''}
              <td align="center" style="padding:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px">
                <p style="margin:0 0 4px;font-size:28px;font-weight:900;color:#EFEFEF">${postsCount}</p>
                <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.4)">POST${postsCount !== 1 ? 'S' : ''} SHARED</p>
              </td>
            </tr>
          </table>
        </td></tr>

        ${doneGoals.length > 0 ? `<!-- Goals completed -->
        <tr><td style="padding:0 24px 24px">
          <p style="margin:0 0 12px;font-size:10px;font-weight:800;letter-spacing:0.12em;color:rgba(255,255,255,0.4)">GOALS COMPLETED THIS WEEK</p>
          <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:16px">
            <ul style="margin:0;padding:0 0 0 18px;color:#4ade80;font-size:14px;font-weight:600;line-height:1.6">
              ${goalItems}
            </ul>
          </div>
        </td></tr>` : ''}

        <!-- CTA -->
        <tr><td style="padding:0 24px 32px">
          <a href="https://www.confirmedcreations.com/home" style="display:block;text-align:center;padding:14px;background:linear-gradient(135deg,#D4AF37,#f0c94c);border-radius:12px;font-size:13px;font-weight:800;color:#111;text-decoration:none;letter-spacing:0.04em">
            OPEN MANIFEST →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 24px">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);text-align:center;line-height:1.6">
            Manifest · Confirmed Creations<br>
            <a href="https://www.confirmedcreations.com/settings" style="color:rgba(255,255,255,0.25)">Manage email preferences</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
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

  // Get all users with their emails
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 500 })
  const emailMap: Record<string, string> = {}
  for (const u of authUsers?.users ?? []) {
    if (u.email) emailMap[u.id] = u.email
  }

  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, full_name, streak, goals_complete, assessments_submitted')
    .limit(500)

  if (profilesErr || !profiles) {
    return NextResponse.json({ error: profilesErr?.message ?? 'No profiles' }, { status: 500 })
  }

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() - 6)
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  let sent = 0
  let emailed = 0
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

      const rating = (weekAssessment as { rating: number | null } | null)?.rating ?? null
      const postsCount = weekPosts?.length ?? 0
      const doneGoals = (completedGoals ?? []) as { title: string }[]
      const firstName = profile.full_name?.split(' ')[0] ?? 'there'

      let preview = `Week of ${todayStr}`
      if (doneGoals.length > 0) {
        preview = `You completed: ${doneGoals.map(g => g.title).join(', ')}`
      } else if (rating !== null) {
        preview = `Week rating: ${rating}/10 · ${postsCount} post${postsCount !== 1 ? 's' : ''} shared`
      } else if (postsCount > 0) {
        preview = `You shared ${postsCount} update${postsCount !== 1 ? 's' : ''} this week`
      } else {
        preview = `Your streak is ${profile.streak} weeks. Keep going.`
      }

      // In-app notification
      const { error: notifErr } = await supabase.from('notifications').insert({
        to_user_id: profile.id,
        from_user_id: profile.id,
        type: 'assessment',
        data: { author_name: 'Weekly Digest', week_title: preview },
      })
      if (notifErr) errors.push(`notif ${profile.id}: ${notifErr.message}`)
      else sent++

      // Email via Resend
      const userEmail = emailMap[profile.id]
      if (resend && userEmail) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: userEmail,
            subject: `Your Manifest week in review, ${firstName}`,
            html: buildEmailHtml({
              firstName,
              streak: profile.streak ?? 0,
              postsCount,
              rating,
              doneGoals: doneGoals.map(g => g.title),
              preview,
            }),
          })
          emailed++
        } catch (emailErr) {
          errors.push(`email ${profile.id}: ${String(emailErr)}`)
        }
      }
    } catch (err) {
      errors.push(`${profile.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({ sent, emailed, errors: errors.slice(0, 10), total: profiles.length })
}
