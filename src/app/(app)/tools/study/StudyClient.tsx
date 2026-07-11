'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createDeck, deleteDeck, createCard, deleteCard, reviewCard, updateCard } from './actions'

type Card  = { id: string; front: string; back: string; next_review: string; interval_days: number }
type Deck  = { id: string; name: string; description: string | null; color: string; cardCount: number; dueCount: number; cards: Card[] }

const DECK_COLORS = ['#fbbf24','#4ade80','#38bdf8','#a78bfa','#f472b6','#fb923c','#f87171','#34d399']

type View = 'decks' | 'cards' | 'review'

export function StudyClient({ decks: initDecks }: { decks: Deck[] }) {
  const [decks, setDecks]             = useState(initDecks)
  const [view, setView]               = useState<View>('decks')
  const [activeDeck, setActiveDeck]   = useState<Deck | null>(null)
  const [showNewDeck, setShowNewDeck] = useState(false)
  const [showNewCard, setShowNewCard] = useState(false)
  const [deckName, setDeckName]       = useState('')
  const [deckDesc, setDeckDesc]       = useState('')
  const [deckColor, setDeckColor]     = useState('#fbbf24')
  const [cardFront, setCardFront]     = useState('')
  const [cardBack, setCardBack]       = useState('')
  const [saving, setSaving]           = useState(false)
  const [editCard, setEditCard]       = useState<Card | null>(null)
  const [editFront, setEditFront]     = useState('')
  const [editBack, setEditBack]       = useState('')
  // Review state
  const [reviewQueue, setReviewQueue] = useState<Card[]>([])
  const [reviewIdx, setReviewIdx]     = useState(0)
  const [flipped, setFlipped]         = useState(false)
  const [reviewed, setReviewed]       = useState(0)
  const [, startT] = useTransition()

  const today = new Date().toISOString().split('T')[0]

  /* ── Deck actions ── */
  async function handleCreateDeck() {
    if (!deckName.trim()) return
    setSaving(true)
    const tmp: Deck = { id: crypto.randomUUID(), name: deckName.trim(), description: deckDesc.trim() || null, color: deckColor, cardCount: 0, dueCount: 0, cards: [] }
    setDecks(prev => [tmp, ...prev])
    setShowNewDeck(false); setDeckName(''); setDeckDesc(''); setDeckColor('#fbbf24')
    await createDeck(deckName.trim(), deckDesc.trim(), deckColor)
    setSaving(false)
  }

  async function handleDeleteDeck(id: string) {
    setDecks(prev => prev.filter(d => d.id !== id))
    if (activeDeck?.id === id) { setActiveDeck(null); setView('decks') }
    await deleteDeck(id)
  }

  /* ── Card actions ── */
  async function handleCreateCard() {
    if (!cardFront.trim() || !cardBack.trim() || !activeDeck) return
    setSaving(true)
    const tmp: Card = { id: crypto.randomUUID(), front: cardFront.trim(), back: cardBack.trim(), next_review: today, interval_days: 1 }
    const updated = { ...activeDeck, cardCount: activeDeck.cardCount + 1, dueCount: activeDeck.dueCount + 1, cards: [...activeDeck.cards, tmp] }
    setActiveDeck(updated)
    setDecks(prev => prev.map(d => d.id === activeDeck.id ? updated : d))
    setShowNewCard(false); setCardFront(''); setCardBack('')
    await createCard(activeDeck.id, tmp.front, tmp.back)
    setSaving(false)
  }

  async function handleUpdateCard() {
    if (!editCard || !editFront.trim() || !editBack.trim() || !activeDeck) return
    setSaving(true)
    const updated = { ...editCard, front: editFront.trim(), back: editBack.trim() }
    const updatedDeck = { ...activeDeck, cards: activeDeck.cards.map(c => c.id === editCard.id ? updated : c) }
    setActiveDeck(updatedDeck)
    setDecks(prev => prev.map(d => d.id === activeDeck.id ? updatedDeck : d))
    setEditCard(null)
    await updateCard(editCard.id, editFront.trim(), editBack.trim())
    setSaving(false)
  }

  async function handleDeleteCard(cardId: string) {
    if (!activeDeck) return
    const updated = { ...activeDeck, cardCount: activeDeck.cardCount - 1, cards: activeDeck.cards.filter(c => c.id !== cardId) }
    setActiveDeck(updated)
    setDecks(prev => prev.map(d => d.id === activeDeck.id ? updated : d))
    await deleteCard(cardId)
  }

  /* ── Review ── */
  function startReview(deck: Deck) {
    const queue = deck.cards.filter(c => c.next_review <= today)
    setReviewQueue(queue)
    setReviewIdx(0)
    setFlipped(false)
    setReviewed(0)
    setActiveDeck(deck)
    setView('review')
  }

  function handleRate(rating: 'easy' | 'good' | 'hard') {
    const card = reviewQueue[reviewIdx]
    startT(() => reviewCard(card.id, rating))
    if (reviewIdx + 1 >= reviewQueue.length) {
      setReviewed(reviewQueue.length)
      setView('done' as View)
    } else {
      setReviewIdx(i => i + 1)
      setFlipped(false)
    }
  }

  /* ── Deck list ── */
  if (view === 'decks') return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardFlip { from{transform:rotateY(0deg)} to{transform:rotateY(180deg)} }
        .flip-card { perspective: 1200px; }
        .flip-inner { transform-style: preserve-3d; transition: transform 0.55s cubic-bezier(0.4,0,0.2,1); }
        .flip-inner.flipped { transform: rotateY(180deg); }
        .flip-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .flip-back { transform: rotateY(180deg); }
        .deck-card { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1); cursor: pointer; }
        .deck-card:hover { transform: translateY(-2px); }
      `}</style>

      <div style={{ paddingTop: 4, paddingBottom: 20, animation: 'fadeUp 0.3s ease both' }}>
        <Link href="/tools" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>← Tools</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, animation: 'fadeUp 0.35s 0.05s ease both' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 4 }}>Study</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{decks.length} deck{decks.length !== 1 ? 's' : ''} · {decks.reduce((s, d) => s + d.dueCount, 0)} cards due</p>
        </div>
        <button onClick={() => setShowNewDeck(true)} style={{ padding: '10px 18px', borderRadius: 14, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', fontSize: 13, fontWeight: 800, color: '#fbbf24', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
          + New Deck
        </button>
      </div>

      {decks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'fadeUp 0.4s 0.1s ease both' }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>📚</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#EFEFEF', marginBottom: 8 }}>No decks yet</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, marginBottom: 24 }}>Create your first deck and start building knowledge that sticks.</p>
          <button onClick={() => setShowNewDeck(true)} style={{ padding: '13px 28px', borderRadius: 16, background: 'linear-gradient(135deg,#fbbf24,#f97316)', border: 'none', fontSize: 13, fontWeight: 800, color: '#0A0A0A', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
            Create First Deck →
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {decks.map((d, i) => (
            <div key={d.id} className="deck-card" onClick={() => { setActiveDeck(d); setView('cards') }}
              style={{ borderRadius: 20, background: '#0d0d0d', border: `1px solid ${d.color}30`, overflow: 'hidden', animation: `fadeUp 0.35s ${i * 0.05}s ease both` }}>
              {/* Color band */}
              <div style={{ height: 5, background: `linear-gradient(90deg, ${d.color}, ${d.color}66)` }} />
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${d.color}18`, border: `1px solid ${d.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 22 }}>📖</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#EFEFEF', marginBottom: 3 }}>{d.name}</p>
                  {d.description && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</p>}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{d.cardCount} card{d.cardCount !== 1 ? 's' : ''}</span>
                    {d.dueCount > 0 && <span style={{ fontSize: 11, color: d.color, fontWeight: 700 }}>⚡ {d.dueCount} due</span>}
                  </div>
                </div>
                {d.dueCount > 0 && (
                  <button onClick={e => { e.stopPropagation(); startReview(d) }}
                    style={{ padding: '9px 16px', borderRadius: 12, background: `linear-gradient(135deg,${d.color},${d.color}bb)`, border: 'none', fontSize: 12, fontWeight: 800, color: '#0A0A0A', cursor: 'pointer', flexShrink: 0, fontFamily: 'Satoshi,sans-serif' }}>
                    Study
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Deck modal */}
      {showNewDeck && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px 16px' }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF' }}>New Deck</p>
              <button onClick={() => setShowNewDeck(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <input value={deckName} onChange={e => setDeckName(e.target.value)} placeholder="Deck name…" style={{ width: '100%', padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none' }} />
            <input value={deckDesc} onChange={e => setDeckDesc(e.target.value)} placeholder="Description (optional)…" style={{ width: '100%', padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 14, marginBottom: 20, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none' }} />
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>COLOR</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              {DECK_COLORS.map(c => (
                <button key={c} onClick={() => setDeckColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${deckColor === c ? '#fff' : 'transparent'}`, cursor: 'pointer', boxShadow: deckColor === c ? `0 0 12px ${c}` : 'none', transition: 'all 0.2s ease' }} />
              ))}
            </div>
            <button onClick={handleCreateDeck} disabled={!deckName.trim() || saving} style={{ width: '100%', padding: '14px 0', borderRadius: 16, background: deckName.trim() ? `linear-gradient(135deg,${deckColor},${deckColor}aa)` : 'rgba(255,255,255,0.05)', border: 'none', fontSize: 14, fontWeight: 800, color: deckName.trim() ? '#0A0A0A' : '#333', cursor: deckName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif' }}>
              {saving ? 'SAVING…' : 'CREATE DECK'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  /* ── Cards view ── */
  if (view === 'cards' && activeDeck) return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`.flip-inner{transform-style:preserve-3d;transition:transform 0.55s cubic-bezier(0.4,0,0.2,1)}.flip-inner.flipped{transform:rotateY(180deg)}.flip-face{backface-visibility:hidden;-webkit-backface-visibility:hidden}.flip-back{transform:rotateY(180deg)} @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ paddingTop: 4, paddingBottom: 20 }}>
        <button onClick={() => { setActiveDeck(null); setView('decks') }} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0 }}>← Study</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ width: 12, height: 4, borderRadius: 99, background: activeDeck.color, marginBottom: 8 }} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#EFEFEF', marginBottom: 4 }}>{activeDeck.name}</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{activeDeck.cardCount} card{activeDeck.cardCount !== 1 ? 's' : ''}{activeDeck.dueCount > 0 ? ` · ${activeDeck.dueCount} due` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {activeDeck.dueCount > 0 && (
            <button onClick={() => startReview(activeDeck)} style={{ padding: '10px 16px', borderRadius: 12, background: `linear-gradient(135deg,${activeDeck.color},${activeDeck.color}bb)`, border: 'none', fontSize: 12, fontWeight: 800, color: '#0A0A0A', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Study {activeDeck.dueCount}</button>
          )}
          <button onClick={() => setShowNewCard(true)} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>+ Card</button>
          <button onClick={() => handleDeleteDeck(activeDeck.id)} style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 14, color: 'rgba(255,255,255,0.28)', cursor: 'pointer' }}>🗑</button>
        </div>
      </div>

      {activeDeck.cards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🃏</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 8 }}>No cards yet</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>Add your first card to start studying.</p>
          <button onClick={() => setShowNewCard(true)} style={{ padding: '12px 24px', borderRadius: 14, background: `linear-gradient(135deg,${activeDeck.color},${activeDeck.color}bb)`, border: 'none', fontSize: 13, fontWeight: 800, color: '#0A0A0A', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Add First Card →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeDeck.cards.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 16, background: '#0d0d0d', border: `1px solid ${c.next_review <= today ? activeDeck.color + '25' : 'rgba(255,255,255,0.06)'}`, animation: `fadeUp 0.3s ${i * 0.04}s ease both` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', marginBottom: 4 }}>{c.front}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>{c.back}</p>
                {c.next_review <= today && <span style={{ fontSize: 10, color: activeDeck.color, fontWeight: 700, marginTop: 6, display: 'block' }}>⚡ Due today</span>}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => { setEditCard(c); setEditFront(c.front); setEditBack(c.back) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 13, padding: '4px 6px' }}>✏️</button>
                <button onClick={() => handleDeleteCard(c.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.18)', cursor: 'pointer', fontSize: 15, padding: '4px 6px' }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit card modal */}
      {editCard && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px 16px' }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF' }}>Edit Card</p>
              <button onClick={() => setEditCard(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>FRONT</p>
            <textarea value={editFront} onChange={e => setEditFront(e.target.value)} rows={3} style={{ width: '100%', padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none', resize: 'none' }} />
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>BACK</p>
            <textarea value={editBack} onChange={e => setEditBack(e.target.value)} rows={3} style={{ width: '100%', padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 14, marginBottom: 24, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none', resize: 'none' }} />
            <button onClick={handleUpdateCard} disabled={!editFront.trim() || !editBack.trim() || saving} style={{ width: '100%', padding: '14px 0', borderRadius: 16, background: editFront.trim() && editBack.trim() ? `linear-gradient(135deg,${activeDeck.color},${activeDeck.color}aa)` : 'rgba(255,255,255,0.05)', border: 'none', fontSize: 14, fontWeight: 800, color: editFront.trim() && editBack.trim() ? '#0A0A0A' : '#333', cursor: editFront.trim() && editBack.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif' }}>
              {saving ? 'SAVING…' : 'SAVE CHANGES'}
            </button>
          </div>
        </div>
      )}

      {/* Add card modal */}
      {showNewCard && (
        <div className="modal-open" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px 16px' }}>
          <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px', animation: 'scaleIn 0.2s ease both', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF' }}>New Card</p>
              <button onClick={() => { setShowNewCard(false); setCardFront(''); setCardBack('') }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>FRONT</p>
            <textarea value={cardFront} onChange={e => setCardFront(e.target.value)} placeholder="Question or term…" rows={3} style={{ width: '100%', padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none', resize: 'none' }} />
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>BACK</p>
            <textarea value={cardBack} onChange={e => setCardBack(e.target.value)} placeholder="Answer or definition…" rows={3} style={{ width: '100%', padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF', fontSize: 14, marginBottom: 24, boxSizing: 'border-box', fontFamily: 'Satoshi,sans-serif', outline: 'none', resize: 'none' }} />
            <button onClick={handleCreateCard} disabled={!cardFront.trim() || !cardBack.trim() || saving} style={{ width: '100%', padding: '14px 0', borderRadius: 16, background: cardFront.trim() && cardBack.trim() ? `linear-gradient(135deg,${activeDeck.color},${activeDeck.color}aa)` : 'rgba(255,255,255,0.05)', border: 'none', fontSize: 14, fontWeight: 800, color: cardFront.trim() && cardBack.trim() ? '#0A0A0A' : '#333', cursor: cardFront.trim() && cardBack.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif' }}>
              {saving ? 'SAVING…' : 'ADD CARD'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  /* ── Review view ── */
  if ((view === 'review' || view === ('done' as View)) && activeDeck) {
    const isDone = view === ('done' as View) || reviewIdx >= reviewQueue.length
    const current = reviewQueue[reviewIdx]
    const progress = reviewQueue.length > 0 ? reviewIdx / reviewQueue.length : 1

    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 60px', fontFamily: 'Satoshi,sans-serif', minHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <style>{`.flip-inner{transform-style:preserve-3d;transition:transform 0.55s cubic-bezier(0.4,0,0.2,1)}.flip-inner.flipped{transform:rotateY(180deg)}.flip-face{backface-visibility:hidden;-webkit-backface-visibility:hidden;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:28px}.flip-back{transform:rotateY(180deg)} @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 20 }}>
          <button onClick={() => { setView('cards'); setFlipped(false) }} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0 }}>← {activeDeck.name}</button>
          {!isDone && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{reviewIdx + 1} / {reviewQueue.length}</span>}
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', marginBottom: 32, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: `linear-gradient(90deg,${activeDeck.color},${activeDeck.color}88)`, borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>

        {isDone ? (
          /* ── Done screen ── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', animation: 'fadeUp 0.4s ease both' }}>
            <p style={{ fontSize: 60, marginBottom: 20 }}>🎉</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#EFEFEF', marginBottom: 8, letterSpacing: '-0.02em' }}>Session Complete</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', marginBottom: 32 }}>You reviewed {reviewQueue.length} card{reviewQueue.length !== 1 ? 's' : ''}. Come back tomorrow for the next round.</p>
            <button onClick={() => setView('cards')} style={{ padding: '14px 32px', borderRadius: 16, background: `linear-gradient(135deg,${activeDeck.color},${activeDeck.color}bb)`, border: 'none', fontSize: 14, fontWeight: 800, color: '#0A0A0A', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Back to Deck →</button>
          </div>
        ) : (
          /* ── Flash card ── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeUp 0.35s ease both' }}>
            {/* Flip card */}
            <div className="flip-card" style={{ width: '100%', height: 280, marginBottom: 24 }} onClick={() => setFlipped(f => !f)}>
              <div className={`flip-inner${flipped ? ' flipped' : ''}`} style={{ width: '100%', height: '100%', position: 'relative' }}>
                {/* Front */}
                <div className="flip-face" style={{ borderRadius: 24, background: '#0d0d0d', border: `2px solid ${activeDeck.color}40`, boxShadow: `0 8px 40px ${activeDeck.color}20`, cursor: 'pointer' }}>
                  <div style={{ textAlign: 'center', padding: '28px' }}>
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: activeDeck.color, marginBottom: 20 }}>QUESTION</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.5 }}>{current?.front}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 20 }}>Tap to reveal answer</p>
                  </div>
                </div>
                {/* Back */}
                <div className="flip-face flip-back" style={{ borderRadius: 24, background: `${activeDeck.color}0f`, border: `2px solid ${activeDeck.color}60`, boxShadow: `0 8px 40px ${activeDeck.color}30`, cursor: 'pointer' }}>
                  <div style={{ textAlign: 'center', padding: '28px' }}>
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: activeDeck.color, marginBottom: 20 }}>ANSWER</p>
                    <p style={{ fontSize: 18, fontWeight: 600, color: '#EFEFEF', lineHeight: 1.6 }}>{current?.back}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rating buttons — only show after flip */}
            {flipped ? (
              <div style={{ width: '100%', display: 'flex', gap: 10, animation: 'fadeUp 0.3s ease both' }}>
                <button onClick={() => handleRate('hard')} style={{ flex: 1, padding: '14px 0', borderRadius: 16, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', fontSize: 13, fontWeight: 800, color: '#f87171', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  Hard
                  <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#f87171', opacity: 0.7, marginTop: 2 }}>Again tomorrow</span>
                </button>
                <button onClick={() => handleRate('good')} style={{ flex: 1, padding: '14px 0', borderRadius: 16, background: `${activeDeck.color}18`, border: `1px solid ${activeDeck.color}40`, fontSize: 13, fontWeight: 800, color: activeDeck.color, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  Good
                  <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: activeDeck.color, opacity: 0.7, marginTop: 2 }}>+{Math.max(1, Math.floor(1 * 2.5))}d</span>
                </button>
                <button onClick={() => handleRate('easy')} style={{ flex: 1, padding: '14px 0', borderRadius: 16, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', fontSize: 13, fontWeight: 800, color: '#4ade80', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  Easy
                  <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#4ade80', opacity: 0.7, marginTop: 2 }}>Long interval</span>
                </button>
              </div>
            ) : (
              <button onClick={() => setFlipped(true)} style={{ width: '100%', padding: '16px 0', borderRadius: 18, background: `linear-gradient(135deg,${activeDeck.color},${activeDeck.color}bb)`, border: 'none', fontSize: 14, fontWeight: 800, color: '#0A0A0A', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                Show Answer →
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return null
}
