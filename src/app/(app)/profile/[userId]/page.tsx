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
      .maybeSingle()
      .then((r: { data: unknown; error: { code?: string } | null }) =>
        r.error?.code === '42P01' ? { data: null, error: null } : r
      ),
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

  // ── Goal reactions + comments (covers every goal shown on this page,
  // including the pinned goal which may not be in publicGoals) ──
  const goalIds = goals.map(g => g.id)
  const [{ data: goalReactionRows }, { data: goalCommentRows }] = await Promise.all([
    goalIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from('goal_reactions') as any).select('goal_id, user_id, type').in('goal_id', goalIds)
      : Promise.resolve({ data: [] }),
    goalIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from('goal_comments') as any).select('id, goal_id, user_id, content, created_at').in('goal_id', goalIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])
  const goalReactions = (goalReactionRows ?? []) as { goal_id: string; user_id: string; type: string }[]
  const goalComments  = (goalCommentRows ?? []) as { id: string; goal_id: string; user_id: string; content: string; created_at: string }[]
  const goalCommentAuthorIds = [...new Set(goalComments.map(c => c.user_id))]
  const { data: goalCommentAuthorRows } = goalCommentAuthorIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', goalCommentAuthorIds)
    : { data: [] }
  const goalCommentAuthorMap = new Map<string, string | null>(
    ((goalCommentAuthorRows ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name])
  )
  const goalSocial = Object.fromEntries(goalIds.map(id => {
    const gr = goalReactions.filter(r => r.goal_id === id)
    const gc = goalComments.filter(c => c.goal_id === id).map(c => ({
      id: c.id, user_id: c.user_id, content: c.content, created_at: c.created_at,
      author_name: goalCommentAuthorMap.get(c.user_id) ?? null,
    }))
    return [id, {
      reactions: {
        fire: gr.filter(r => r.type === 'fire').length,
        believe: gr.filter(r => r.type === 'believe').length,
        cheer: gr.filter(r => r.type === 'cheer').length,
      },
      myReactions: {
        fire: gr.some(r => r.user_id === user.id && r.type === 'fire'),
        believe: gr.some(r => r.user_id === user.id && r.type === 'believe'),
        cheer: gr.some(r => r.user_id === user.id && r.type === 'cheer'),
      },
      comments: gc,
    }]
  }))

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
      goalSocial={goalSocial}
    />
  )
}
