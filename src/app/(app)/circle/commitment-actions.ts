'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function thisWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

export async function postCommitment(circleId: string, text: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('circle_commitments') as any).upsert({
    circle_id: circleId,
    user_id: user.id,
    week_start: thisWeekStart(),
    text: text.trim(),
    status: 'active',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'circle_id,user_id,week_start' })

  if (error) return { error: error.message }
  revalidatePath('/circle')
  return { success: true }
}

export async function witnessCommitment(commitmentId: string, toUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('commitment_witnesses') as any).insert({
    commitment_id: commitmentId,
    user_id: user.id,
  })
  if (error) return { error: error.message }

  const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const myName = (myProfile as { full_name: string | null } | null)?.full_name ?? 'Someone'

  await supabase.from('notifications').insert({
    to_user_id: toUserId,
    from_user_id: user.id,
    type: 'witness',
    data: { author_name: myName, message: `${myName} is witnessing your commitment` },
  })

  revalidatePath('/circle')
  return { success: true }
}

export async function updateCommitmentStatus(commitmentId: string, status: 'done' | 'failed') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('circle_commitments') as any)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', commitmentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/circle')
  return { success: true }
}
