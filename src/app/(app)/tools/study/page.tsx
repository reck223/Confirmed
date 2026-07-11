import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudyClient } from './StudyClient'

export default async function StudyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const today = new Date().toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: deckRows } = await (supabase.from('study_decks') as any)
    .select('id, name, description, color, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  type DeckRow = { id: string; name: string; description: string | null; color: string; created_at: string }
  const deckList = (deckRows ?? []) as DeckRow[]

  if (deckList.length === 0) {
    return <StudyClient decks={[]} />
  }

  // Fetch card counts + due counts for each deck
  const deckIds = deckList.map(d => d.id)

  const [{ data: allCards }, { data: dueCards }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('study_cards') as any)
      .select('id, deck_id, front, back, ease_factor, interval_days, next_review, last_reviewed')
      .in('deck_id', deckIds)
      .eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('study_cards') as any)
      .select('id, deck_id')
      .in('deck_id', deckIds)
      .eq('user_id', user.id)
      .lte('next_review', today),
  ])

  type CardRow = { id: string; deck_id: string; front: string; back: string; ease_factor: number; interval_days: number; next_review: string; last_reviewed: string | null }
  type DueCard = { id: string; deck_id: string }

  const cards = (allCards ?? []) as CardRow[]
  const due   = (dueCards ?? []) as DueCard[]

  const cardsByDeck   = new Map<string, CardRow[]>()
  const dueCountByDeck = new Map<string, number>()
  for (const c of cards) {
    if (!cardsByDeck.has(c.deck_id)) cardsByDeck.set(c.deck_id, [])
    cardsByDeck.get(c.deck_id)!.push(c)
  }
  for (const c of due) {
    dueCountByDeck.set(c.deck_id, (dueCountByDeck.get(c.deck_id) ?? 0) + 1)
  }

  const decks = deckList.map(d => ({
    ...d,
    cardCount: cardsByDeck.get(d.id)?.length ?? 0,
    dueCount:  dueCountByDeck.get(d.id) ?? 0,
    cards:     cardsByDeck.get(d.id) ?? [],
  }))

  return <StudyClient decks={decks} />
}
