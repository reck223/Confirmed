import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PublicProfileClient } from './PublicProfileClient'

export default async function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (user.id === targetId) redirect('/profile')

  const [{ data: profileData }, { data: goalRows }, { data: connectionRow }, { data: assessRows }, { data: postRows }] = await Promise.all([
    supabase.from('profiles')
      .select('id, full_name, username, bio, tagline, streak, goals_complete, assessments_submitted, avatar_url, cover_url, pinned_goal_id, created_at')
      .eq('id', targetId)
      .single(),
    supabase.from('goals')
      .select('id, title, category, progress, deadline, status, visibility')
      .eq('user_id', targetId)
      .neq('goal_type', 'letter')
      .order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('connections') as any)
      .select('status')
      .or(`and(proposer_id.eq.${user.id},receiver_id.eq.${targetId}),and(proposer_id.eq.${targetId},receiver_id.eq.${user.id})`)
      .in('status', ['pending', 'active'])
      .maybeSingle(),
    supabase.from('assessments').select('week_start, rating').eq('user_id', targetId).order('week_start', { ascending: false }).limit(26),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('posts') as any).select('id, content, type, created_at, media_url, media_type').eq('user_id', targetId).eq('visibility', 'public').order('created_at', { ascending: false }).limit(30),
  ])

  if (!profileData) notFound()

  const profile = profileData as {
    id: string; full_name: string | null; username: string | null; bio: string | null
    tagline: string | null; streak: number; goals_complete: number; assessments_submitted: number
    avatar_url: string | null; cover_url: string | null; pinned_goal_id: string | null; created_at: string
  }

  const goals = (goalRows ?? []) as { id: string; title: string; category: string | null; progress: number; deadline: string | null; status: string; visibility: string }[]
  const publicGoals = goals.filter(g => g.visibility === 'public')
  const assessmentHistory = (assessRows ?? []) as { week_start: string; rating: number | null }[]
  const posts = (postRows ?? []) as { id: string; content: string; type: string; created_at: string; media_url: string | null; media_type: string | null }[]

  const connStatus = connectionRow as { status: string } | null
  const existingConnectionStatus: 'none' | 'pending' | 'active' =
    connStatus?.status === 'active' ? 'active' : connStatus?.status === 'pending' ? 'pending' : 'none'

  return (
    <PublicProfileClient
      profile={profile}
      goals={publicGoals}
      allGoals={goals}
      currentUserId={user.id}
      assessmentHistory={assessmentHistory}
      posts={posts}
      existingConnectionStatus={existingConnectionStatus}
    />
  )
}
