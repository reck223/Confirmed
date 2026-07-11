'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDeck(name: string, description: string, color: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('study_decks') as any).insert({ user_id: user.id, name, description, color })
  revalidatePath('/tools/study')
  revalidatePath('/tools')
}

export async function deleteDeck(deckId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('study_decks') as any).delete().eq('id', deckId).eq('user_id', user.id)
  revalidatePath('/tools/study')
}

export async function createCard(deckId: string, front: string, back: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('study_cards') as any).insert({ deck_id: deckId, user_id: user.id, front, back })
  revalidatePath('/tools/study')
}

export async function deleteCard(cardId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('study_cards') as any).delete().eq('id', cardId).eq('user_id', user.id)
  revalidatePath('/tools/study')
}

export async function updateCard(cardId: string, front: string, back: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('study_cards') as any).update({ front, back }).eq('id', cardId).eq('user_id', user.id)
  revalidatePath('/tools/study')
}

export async function reviewCard(cardId: string, rating: 'easy' | 'good' | 'hard') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('study_cards') as any)
    .select('ease_factor, interval_days').eq('id', cardId).eq('user_id', user.id).single()
  if (!data) return

  type Card = { ease_factor: number; interval_days: number }
  const card = data as Card
  let { ease_factor, interval_days } = card

  if (rating === 'easy') {
    ease_factor  = Math.min(3.0, ease_factor + 0.1)
    interval_days = Math.max(2, Math.floor(interval_days * ease_factor * 1.3))
  } else if (rating === 'good') {
    interval_days = Math.max(1, Math.floor(interval_days * ease_factor))
  } else {
    ease_factor  = Math.max(1.3, ease_factor - 0.15)
    interval_days = 1
  }

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval_days)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('study_cards') as any).update({
    ease_factor, interval_days,
    next_review: nextReview.toISOString().split('T')[0],
    last_reviewed: new Date().toISOString(),
  }).eq('id', cardId).eq('user_id', user.id)

  revalidatePath('/tools/study')
}
