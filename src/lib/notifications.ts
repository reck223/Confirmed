'use server'
import { createClient } from '@/lib/supabase/server'

export type NotifType = 'follow' | 'circle_join' | 'circle_invite' | 'message' | 'reaction' | 'assessment' | 'comment' | 'goal_complete' | 'new_session' | 'win_posted' | 'goal_reaction' | 'goal_comment' | 'witness' | 'connection_request' | 'connection_accepted'

export async function createNotification(
  toUserId: string,
  type: NotifType,
  data: Record<string, string | number> = {}
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id === toUserId) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('notifications') as any).insert({
    to_user_id: toUserId,
    from_user_id: user.id,
    type,
    data,
  })
}
