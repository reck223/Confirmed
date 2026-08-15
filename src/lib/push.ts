import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types/database'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

type PushPayload = { title: string; body: string; url?: string }
// Matches the boolean columns added in supabase/notification_prefs.sql —
// pass the one relevant to what's being sent so a user who muted, say,
// circle activity still gets their streak reminder.
type PrefColumn = 'notify_circle_activity' | 'notify_streak_reminder' | 'notify_goal_recommendations' | 'notify_stale_goal_nudge'

// Typed against the plain SupabaseClient shape (not the SSR-specific
// createClient() return type) so this works from both request-scoped
// Server Actions and service-role contexts like cron routes, which have
// no cookies/user session to build an SSR client from.
export async function sendPushToUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: PushPayload,
  prefColumn?: PrefColumn,
) {
  if (prefColumn) {
    const { data: profile } = await supabase.from('profiles').select(prefColumn).eq('id', userId).maybeSingle()
    if (profile?.[prefColumn] === false) return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs } = await (supabase as any)
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs?.length) return

  await Promise.allSettled(
    (subs as { endpoint: string; p256dh: string; auth: string }[]).map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ).catch(() => {})
    )
  )
}
