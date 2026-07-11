'use server'
import { createClient } from '@/lib/supabase/server'

export async function getPublicFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
    (supabase.from('follows') as any).select('id', { count: 'exact', head: true }).eq('following_id', userId),
    (supabase.from('follows') as any).select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ])
  return { followersCount: followersCount ?? 0, followingCount: followingCount ?? 0 }
}
