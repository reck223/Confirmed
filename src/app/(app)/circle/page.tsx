import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CircleClient } from './CircleClient'

export default async function CirclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // Get circles user belongs to
  const { data: memberRows } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', user.id)

  const circleIds = ((memberRows ?? []) as { circle_id: string }[]).map(r => r.circle_id)

  if (circleIds.length === 0) {
    return <CircleClient posts={[]} circles={[]} userId={user.id} />
  }

  // Get circle info
  const { data: circleRows } = await supabase
    .from('circles')
    .select('id, name, code')
    .in('id', circleIds)

  const circles = ((circleRows ?? []) as { id: string; name: string; code: string }[])

  // Get posts — RLS handles visibility
  const { data: postRows } = await supabase
    .from('posts')
    .select('id, content, type, created_at, user_id, circle_id')
    .order('created_at', { ascending: false })
    .limit(50)

  const posts = (postRows ?? []) as { id: string; content: string; type: string; created_at: string; user_id: string; circle_id: string | null }[]

  // Get author profiles
  const authorIds = [...new Set(posts.map(p => p.user_id))]
  const { data: profileRows } = authorIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', authorIds)
    : { data: [] }

  const profileMap = Object.fromEntries(
    ((profileRows ?? []) as { id: string; full_name: string | null }[]).map(p => [p.id, p.full_name])
  )

  // Get reactions for these posts
  const postIds = posts.map(p => p.id)
  const { data: reactionRows } = postIds.length
    ? await supabase.from('post_reactions').select('post_id, user_id, type').in('post_id', postIds)
    : { data: [] }

  const reactions = (reactionRows ?? []) as { post_id: string; user_id: string; type: string }[]

  const enriched = posts.map(post => {
    const postReactions = reactions.filter(r => r.post_id === post.id)
    return {
      ...post,
      author_name: profileMap[post.user_id] ?? null,
      reactions: {
        fire: postReactions.filter(r => r.type === 'fire').length,
        strong: postReactions.filter(r => r.type === 'strong').length,
        relate: postReactions.filter(r => r.type === 'relate').length,
      },
      my_reactions: {
        fire: postReactions.some(r => r.user_id === user.id && r.type === 'fire'),
        strong: postReactions.some(r => r.user_id === user.id && r.type === 'strong'),
        relate: postReactions.some(r => r.user_id === user.id && r.type === 'relate'),
      },
    }
  })

  return <CircleClient posts={enriched} circles={circles} userId={user.id} />
}
