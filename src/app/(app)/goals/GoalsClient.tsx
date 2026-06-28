'use client'
import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createGoal, updateGoalProgress, completeGoal, restartGoal, deleteGoal, toggleMilestone, saveMilestones, addBook, setBookReading, markBookDone, removeBook, unmarkBookDone, updateGoalVisibility, updateGoalNotes, updateGoalDeadline } from './actions'
import { CATEGORIES, categoryLabel } from '@/lib/categories'
import type { Goal, GoalMilestone, GoalBook } from '@/lib/types/database'

const CAT: Record<string, { accent: string; bg: string; border: string; text: string }> = {
  health:        { accent: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   text: '#4ade80' },  // emerald
  career:        { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)',  text: '#a78bfa' },  // violet
  business:      { accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  text: '#60a5fa' },  // blue
  finance:       { accent: '#D4AF37', bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.22)', text: '#D4AF37' },  // gold
  learning:      { accent: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.2)',  text: '#7dd3fc' },  // sky
  creative:      { accent: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  text: '#fb923c' },  // orange
  relationships: { accent: '#f43f5e', bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)',   text: '#fb7185' },  // rose
  personal:      { accent: '#14b8a6', bg: 'rgba(20,184,166,0.08)',  border: 'rgba(20,184,166,0.2)',  text: '#2dd4bf' },  // teal
  adventure:     { accent: '#84cc16', bg: 'rgba(132,204,22,0.08)',  border: 'rgba(132,204,22,0.2)',  text: '#a3e635' },  // lime
  material:      { accent: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   text: '#f87171' },  // red
  spiritual:     { accent: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)', text: '#d8b4fe' },  // purple
}
const fallback = { accent: '#D4AF37', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.22)', text: '#D4AF37' }
function cc(cat: string | null) { return CAT[cat ?? ''] ?? fallback }

const VIS_LABEL: Record<string, string> = { circle: '👥 Circle', private: '🔒 Private', public: '🌍 Public' }
const VIS_DESC:  Record<string, string> = {
  private: 'Only you can see this goal.',
  circle:  'Your Circle members can see this.',
  public:  'Anyone on the platform can see this.',
}
const SPINE_COLORS = ['#d97706','#7c3aed','#0f766e','#b91c1c','#1d4ed8','#be185d','#92400e','#065f46','#c2410c','#4338ca','#0e7490','#6d28d9']

type GoalType = 'standard' | 'reading' | 'letter'

export function GoalsClient({ goals, milestones, books: allBooks }: { goals: Goal[]; milestones: GoalMilestone[]; books: GoalBook[] }) {
  const [showCreate, setShowCreate] = useState(false)
  const [goalType, setGoalType] = useState<GoalType>('standard')
  const [visibility, setVisibility] = useState<'private' | 'circle' | 'public'>('circle')
  const [milestoneInputs, setMilestoneInputs] = useState<string[]>([''])
  const [logGoalId, setLogGoalId] = useState<string | null>(null)
  const [logTab, setLogTab] = useState<'milestones' | 'notes' | 'details'>('milestones')
  const [editingMs, setEditingMs] = useState(false)
  const [draftMs, setDraftMs] = useState<{ id?: string; text: string }[]>([])
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadlineDraft, setDeadlineDraft] = useState('')
  const [addingBook, setAddingBook] = useState(false)
  const [pendingBook, setPendingBook] = useState<BookResult | null>(null)
  const [markDoneBookId, setMarkDoneBookId] = useState<string | null>(null)
  const [markDoneRating, setMarkDoneRating] = useState(0)
  const [markDoneDate, setMarkDoneDate] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  const milestonesByGoal = milestones.reduce<Record<string, GoalMilestone[]>>((acc, m) => {
    ;(acc[m.goal_id] ??= []).push(m)
    return acc
  }, {})

  const booksByGoal = allBooks.reduce<Record<string, GoalBook[]>>((acc, b) => {
    ;(acc[b.goal_id] ??= []).push(b)
    return acc
  }, {})

  const typeOrder = (g: Goal) => g.goal_type === 'reading' ? 0 : g.goal_type === 'letter' ? 2 : 1
  const active   = goals.filter(g => g.status === 'active').sort((a, b) => typeOrder(a) - typeOrder(b))
  const complete = goals.filter(g => g.status === 'complete')
  const logGoal  = goals.find(g => g.id === logGoalId) ?? null
  const hasActiveReadingGoal = goals.some(g => g.goal_type === 'reading' && g.status !== 'complete')

  function openCreate() { setGoalType('standard'); setVisibility('circle'); setError(''); setMilestoneInputs(['']); setShowCreate(true) }
  function closeCreate() { setShowCreate(false); setError('') }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError('')
    startTransition(async () => {
      const result = await createGoal(formData)
      if (result?.error) { setError(result.error) }
    })
  }

  function handleProgress(id: string, p: number) {
    startTransition(async () => {
      await updateGoalProgress(id, p)
      setLogGoalId(null)
      router.refresh()
    })
  }

  function handleComplete(id: string) {
    startTransition(async () => {
      await completeGoal(id)
      setLogGoalId(null)
      router.refresh()
    })
  }

  function handleRestart(id: string) {
    startTransition(async () => {
      await restartGoal(id)
      router.refresh()
    })
  }

  function handleSaveMilestones(goalId: string) {
    startTransition(async () => {
      await saveMilestones(goalId, draftMs)
      setEditingMs(false)
      router.refresh()
    })
  }

  function handleToggleMilestone(id: string, done: boolean, goalId: string) {
    startTransition(async () => {
      await toggleMilestone(id, done, goalId)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      setConfirmDeleteId(null)
      await deleteGoal(id)
    })
  }

  function handleAddBook(goalId: string, book: BookResult) {
    startTransition(async () => {
      await addBook(goalId, book.title, book.author, book.cover)
      setAddingBook(false)
      setPendingBook(null)
      router.refresh()
    })
  }

  function handleSetBookReading(bookId: string, goalId: string, title: string) {
    startTransition(async () => {
      await setBookReading(bookId, goalId, title)
      router.refresh()
    })
  }

  function handleMarkBookDone(bookId: string, goalId: string, rating: number, dateFinished: string) {
    startTransition(async () => {
      await markBookDone(bookId, goalId, rating, dateFinished)
      setMarkDoneBookId(null)
      setMarkDoneRating(0)
      setMarkDoneDate('')
      router.refresh()
    })
  }

  function handleRemoveBook(bookId: string, goalId: string) {
    startTransition(async () => {
      await removeBook(bookId, goalId)
      router.refresh()
    })
  }

  function handleUnmarkBookDone(bookId: string, goalId: string) {
    startTransition(async () => {
      await unmarkBookDone(bookId, goalId)
      router.refresh()
    })
  }

  function handleUpdateVisibility(goalId: string, vis: 'private' | 'circle' | 'public') {
    startTransition(async () => {
      await updateGoalVisibility(goalId, vis)
      router.refresh()
    })
  }

  function handleUpdateNotes(goalId: string, text: string) {
    startTransition(async () => {
      await updateGoalNotes(goalId, text)
      setEditingNotes(false)
      router.refresh()
    })
  }

  function handleUpdateDeadline(goalId: string, date: string) {
    startTransition(async () => {
      await updateGoalDeadline(goalId, date || null)
      setEditingDeadline(false)
      router.refresh()
    })
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 32px' }} className="view-panel">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>YOUR GOALS</p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            What you&apos;re<br />building.
          </h1>
          <p style={{ fontSize: 12, color: '#555', fontWeight: 300, marginTop: 6 }}>
            {active.length} active · {complete.length} complete
          </p>
        </div>
        <button onClick={openCreate} className="btn-gold" style={{ width: 'auto', padding: '10px 18px', fontSize: 11 }}>+ NEW GOAL</button>
      </div>

      {/* Active goals */}
      {active.length === 0 ? (
        <div style={{ borderRadius: 18, background: 'linear-gradient(135deg,rgba(212,175,55,0.1) 0%,rgba(212,175,55,0.04) 100%)', border: '1px solid rgba(212,175,55,0.25)', padding: '32px 24px', textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 36, marginBottom: 14 }}>🎯</p>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', marginBottom: 8 }}>No goals yet</h3>
          <p style={{ fontSize: 13, color: '#666', fontWeight: 300, marginBottom: 20 }}>Add your first commitment to start tracking your progress.</p>
          <button onClick={openCreate} className="btn-gold" style={{ width: 'auto', padding: '12px 24px' }}>ADD YOUR FIRST GOAL</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {active.map(g => {
            if (g.goal_type === 'letter')  return <LetterCard  key={g.id} goal={g} />
            if (g.goal_type === 'reading') return <ReadingCard key={g.id} goal={g} books={booksByGoal[g.id] ?? []} onLog={() => { setLogGoalId(g.id); setLogTab('milestones'); setEditingMs(false); setAddingBook(false); setMarkDoneBookId(null) }} />
            return <GoalCard key={g.id} goal={g} onLog={() => { setLogGoalId(g.id); setLogTab('milestones'); setEditingMs(false) }} onDelete={() => setConfirmDeleteId(g.id)} />
          })}
        </div>
      )}

      {/* Completed goals */}
      {complete.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#666', marginBottom: 10 }}>COMPLETED</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {complete.map(g => (
              <div key={g.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.08))', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</p>
                  {g.completed_date && <p style={{ fontSize: 10, color: '#444', marginTop: 2 }}>Completed {g.completed_date}</p>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleRestart(g.id)} disabled={isPending}
                    style={{ fontSize: 10, fontWeight: 700, padding: '5px 11px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#555', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                    Restart →
                  </button>
                  <button onClick={() => setConfirmDeleteId(g.id)} disabled={isPending}
                    style={{ fontSize: 10, fontWeight: 700, padding: '5px 11px', borderRadius: 8, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GOAL DETAIL MODAL ── */}
      {logGoal && (() => {
        const c = cc(logGoal.category)
        const progress = logGoal.progress ?? 0
        const isReading = logGoal.goal_type === 'reading'
        const accent = isReading ? '#38bdf8' : c.accent
        const ms = milestonesByGoal[logGoal.id] ?? []
        const doneCount = ms.filter(m => m.done).length
        const booksTotal = isReading ? (parseInt(logGoal.why_it_matters ?? '') || 12) : 0
        const books = booksByGoal[logGoal.id] ?? []

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', padding: '20px 16px' }} onClick={() => { setLogGoalId(null); setEditingNotes(false); setEditingDeadline(false) }}>
            <div style={{ width: '100%', maxWidth: 480, borderRadius: 24, background: '#111', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: '22px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: 19, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 6 }}>{logGoal.title}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {logGoal.category && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: isReading ? 'rgba(56,189,248,0.09)' : c.bg, border: `1px solid ${isReading ? 'rgba(56,189,248,0.18)' : c.border}`, padding: '2px 9px', borderRadius: 6 }}>
                          {categoryLabel(logGoal.category)}
                        </span>
                      )}
                      {logGoal.deadline && <span style={{ fontSize: 11, color: '#555' }}>Due {logGoal.deadline}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${accent}18`, border: `2px solid ${accent}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: accent, lineHeight: 1 }}>{progress}%</span>
                    </div>
                    <button onClick={() => { setLogGoalId(null); setEditingNotes(false); setEditingDeadline(false) }} style={{ fontSize: 22, color: '#555', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
                  {(['milestones', 'notes', 'details'] as const).filter(tab => !(isReading && tab === 'notes')).map(tab => {
                    const label = tab === 'milestones' ? (isReading ? '📚 Books' : 'Milestones') : tab === 'notes' ? 'Notes' : 'Details'
                    return (
                      <button key={tab} type="button" onClick={() => { setLogTab(tab); setEditingNotes(false) }}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', border: 'none',
                          background: logTab === tab ? `${accent}18` : 'transparent',
                          color: logTab === tab ? accent : '#555' }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

                {logTab === 'milestones' && (
                  <>
                    {isReading ? (
                      <>
                        {/* ── CURRENTLY READING ── */}
                        {(() => {
                          const readingBook = books.find(b => b.status === 'reading')
                          const legacyTitle = !books.length && logGoal.next_action ? logGoal.next_action : null
                          if (readingBook) return (
                            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', marginBottom: 16 }}>
                              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#38bdf8', marginBottom: 10 }}>CURRENTLY READING</p>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                {readingBook.cover_url
                                  ? <img src={readingBook.cover_url} alt="" style={{ width: 48, height: 68, objectFit: 'cover', borderRadius: 5, flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }} />
                                  : <div style={{ width: 48, height: 68, background: SPINE_COLORS[0], borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📖</div>
                                }
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.3, marginBottom: 3 }}>{readingBook.title}</p>
                                  {readingBook.author && <p style={{ fontSize: 11, color: '#38bdf8', fontWeight: 300, marginBottom: 12 }}>{readingBook.author}</p>}
                                  {markDoneBookId === readingBook.id ? (
                                    <div>
                                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#D4AF37', marginBottom: 8 }}>RATE THIS BOOK</p>
                                      <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
                                        {[1,2,3,4,5].map(s => (
                                          <button key={s} type="button" onClick={() => setMarkDoneRating(s)}
                                            style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: s <= markDoneRating ? '#D4AF37' : '#2a2a2a', padding: '0 1px', lineHeight: 1 }}>★</button>
                                        ))}
                                      </div>
                                      <input type="date" value={markDoneDate} onChange={e => setMarkDoneDate(e.target.value)} className="cc-input" style={{ fontSize: 12, colorScheme: 'dark', marginBottom: 10 }} />
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="button" onClick={() => { setMarkDoneBookId(null); setMarkDoneRating(0) }}
                                          style={{ flex: 1, padding: '8px 0', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#555', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                                          Cancel
                                        </button>
                                        <button type="button" onClick={() => handleMarkBookDone(readingBook.id, logGoal.id, markDoneRating, markDoneDate)} disabled={isPending}
                                          style={{ flex: 2, padding: '8px 0', borderRadius: 9, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                                          {isPending ? 'Saving…' : 'Mark as Done ✓'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => { setMarkDoneBookId(readingBook.id); setMarkDoneRating(0); setMarkDoneDate(new Date().toISOString().slice(0,10)) }}
                                      style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: 'rgba(56,189,248,0.09)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}>
                                      Finished this book?
                                    </button>
                                  )}
                                </div>
                                <button type="button" onClick={() => handleRemoveBook(readingBook.id, logGoal.id)} disabled={isPending}
                                  style={{ fontSize: 18, color: '#333', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                              </div>
                            </div>
                          )
                          if (legacyTitle) return (
                            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', marginBottom: 16 }}>
                              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#38bdf8', marginBottom: 6 }}>CURRENTLY READING</p>
                              <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF' }}>{legacyTitle}</p>
                              <p style={{ fontSize: 10, color: '#555', marginTop: 4 }}>Add books below to track your full list</p>
                            </div>
                          )
                          return (
                            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)', marginBottom: 16, textAlign: 'center' }}>
                              <p style={{ fontSize: 13, color: '#555' }}>Not reading anything right now</p>
                              <p style={{ fontSize: 11, color: '#3a3a3a', marginTop: 4, fontWeight: 300 }}>Add a book and start reading</p>
                            </div>
                          )
                        })()}

                        {/* ── READ ── */}
                        {books.filter(b => b.status === 'read').length > 0 && (
                          <>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#555', marginBottom: 10 }}>
                              READ — {books.filter(b => b.status === 'read').length} of {booksTotal}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                              {[...books.filter(b => b.status === 'read')].reverse().map(book => (
                                <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  {book.cover_url
                                    ? <img src={book.cover_url} alt="" style={{ width: 30, height: 42, objectFit: 'cover', borderRadius: 4, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
                                    : <div style={{ width: 30, height: 42, borderRadius: 4, background: 'rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📚</div>
                                  }
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                                    {book.author && <p style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{book.author}</p>}
                                  </div>
                                  <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                    {[1,2,3,4,5].map(s => (
                                      <span key={s} style={{ fontSize: 11, color: s <= (book.rating ?? 0) ? '#D4AF37' : '#222' }}>★</span>
                                    ))}
                                  </div>
                                  {book.date_finished && <span style={{ fontSize: 9, color: '#444', flexShrink: 0 }}>{book.date_finished}</span>}
                                  <button type="button" onClick={() => handleUnmarkBookDone(book.id, logGoal.id)} disabled={isPending} title="Undo — move back to queue"
                                    style={{ fontSize: 11, color: '#2a2a2a', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                                    onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}>
                                    ↩
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* ── TO READ ── */}
                        {books.filter(b => b.status === 'queue').length > 0 && (
                          <>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#555', marginBottom: 8 }}>
                              TO READ — {books.filter(b => b.status === 'queue').length} queued
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
                              {books.filter(b => b.status === 'queue').map((book, i, arr) => (
                                <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                  <div style={{ width: 24, height: 34, borderRadius: 3, background: 'rgba(255,255,255,0.04)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, opacity: 0.6 }}>📚</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 12, fontWeight: 600, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                                    {book.author && <p style={{ fontSize: 10, color: '#444' }}>{book.author}</p>}
                                  </div>
                                  <button type="button" onClick={() => handleSetBookReading(book.id, logGoal.id, book.title)} disabled={isPending}
                                    style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: 'rgba(56,189,248,0.07)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.15)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    Start Reading
                                  </button>
                                  <button type="button" onClick={() => handleRemoveBook(book.id, logGoal.id)} disabled={isPending}
                                    style={{ fontSize: 16, color: '#2a2a2a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* ── ADD BOOK ── */}
                        {addingBook ? (
                          <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 12 }}>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#555', marginBottom: 10 }}>WHAT BOOK ARE YOU ADDING?</p>
                            <BookSearch onSelect={setPendingBook} />
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                              <button type="button" onClick={() => { setAddingBook(false); setPendingBook(null) }}
                                style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                                Cancel
                              </button>
                              <button type="button" onClick={() => pendingBook && handleAddBook(logGoal.id, pendingBook)} disabled={!pendingBook || isPending}
                                style={{ flex: 2, padding: '9px 0', borderRadius: 10, background: pendingBook ? 'rgba(56,189,248,0.09)' : 'rgba(255,255,255,0.03)', border: pendingBook ? '1px solid rgba(56,189,248,0.2)' : '1px solid rgba(255,255,255,0.06)', color: pendingBook ? '#38bdf8' : '#444', fontSize: 12, fontWeight: 700, cursor: pendingBook ? 'pointer' : 'default', fontFamily: 'Satoshi,sans-serif' }}>
                                {isPending ? 'Adding…' : 'Add to List'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setAddingBook(true)}
                            style={{ width: '100%', fontSize: 12, fontWeight: 700, padding: '10px 0', borderRadius: 11, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(56,189,248,0.15)', color: '#38bdf8', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 12 }}>
                            + Add a Book
                          </button>
                        )}

                        {/* progress summary */}
                        <div style={{ padding: '10px 14px', borderRadius: 11, background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#555' }}>Books read</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#38bdf8' }}>{books.filter(b => b.status === 'read').length} / {booksTotal}</span>
                        </div>
                      </>
                    ) : ms.length > 0 || editingMs ? (
                      <>
                        {/* Edit / Save header */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                          {editingMs ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button type="button" onClick={() => setEditingMs(false)} disabled={isPending}
                                style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#555', transition: 'all 0.15s' }}>
                                Cancel
                              </button>
                              <button type="button" onClick={() => handleSaveMilestones(logGoal.id)} disabled={isPending}
                                style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, transition: 'all 0.15s' }}>
                                {isPending ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => { setDraftMs(ms.map(m => ({ id: m.id, text: m.text }))); setEditingMs(true) }}
                              style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#777', transition: 'all 0.15s' }}>
                              Edit
                            </button>
                          )}
                        </div>

                        {editingMs ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {draftMs.map((m, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                  value={m.text}
                                  onChange={e => { const u = [...draftMs]; u[i] = { ...u[i], text: e.target.value }; setDraftMs(u) }}
                                  className="cc-input"
                                  style={{ flex: 1, fontSize: 13 }}
                                  placeholder={`Step ${i + 1}…`}
                                />
                                <button type="button" onClick={() => setDraftMs(draftMs.filter((_, j) => j !== i))}
                                  style={{ padding: '0 11px', height: 40, borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>×</button>
                              </div>
                            ))}
                            {draftMs.length < 10 && (
                              <button type="button" onClick={() => setDraftMs([...draftMs, { text: '' }])}
                                style={{ fontSize: 11, fontWeight: 700, padding: '9px 0', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', color: '#555', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginTop: 2 }}>
                                + Add Step
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {ms.map(m => (
                              <button key={m.id} type="button" onClick={() => handleToggleMilestone(m.id, !m.done, logGoal.id)} disabled={isPending}
                                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: m.done ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)', border: m.done ? '1px solid rgba(34,197,94,0.18)' : '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s' }}>
                                <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: m.done ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.12)', background: m.done ? 'rgba(34,197,94,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                  {m.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 13L9.5 18.5L21 5" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <span style={{ fontSize: 13, color: m.done ? '#555' : '#EFEFEF', textDecoration: m.done ? 'line-through' : 'none', flex: 1, lineHeight: 1.4 }}>{m.text}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setDraftMs([{ text: '' }]); setEditingMs(true) }}
                          style={{ width: '100%', fontSize: 12, fontWeight: 700, padding: '10px 0', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', color: '#666', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 18 }}>
                          + Add Milestones
                        </button>
                        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#555', marginBottom: 8 }}>UPDATE PROGRESS</p>
                        <div className="progress-track" style={{ height: 5, marginBottom: 14 }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg,${accent}88,${accent})`, borderRadius: 999 }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                          {[10,25,50,75,100].map(p => (
                            <button key={p} onClick={() => handleProgress(logGoal.id, p)} disabled={isPending}
                              style={{ padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: progress===p ? c.bg : 'rgba(255,255,255,0.04)', color: progress===p ? c.text : '#555', border: progress===p ? `1px solid ${c.border}` : '1px solid rgba(255,255,255,0.08)', transition: 'all 0.15s' }}>
                              {p}%
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Progress summary */}
                    {ms.length > 0 && (
                      <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#666' }}>Progress</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 15, fontWeight: 900, color: accent }}>{progress}%</span>
                          <p style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{doneCount} of {ms.length} complete</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {logTab === 'notes' && (() => {
                  const daysSince = Math.floor((Date.now() - new Date(logGoal.created_at).getTime()) / 86400000)
                  const isReadingGoal = logGoal.goal_type === 'reading'

                  if (editingNotes) return (
                    <div>
                      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#555', marginBottom: 10 }}>YOUR WHY</p>
                      <textarea
                        value={notesDraft}
                        onChange={e => setNotesDraft(e.target.value)}
                        rows={6}
                        placeholder="What's driving this goal? What will it mean when you achieve it?"
                        autoFocus
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: `1.5px solid ${accent}40`, borderRadius: 14, padding: '14px 16px', fontSize: 14, color: '#EFEFEF', fontFamily: 'Georgia,serif', outline: 'none', resize: 'none', lineHeight: 1.75, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                        onFocus={e => (e.target.style.borderColor = `${accent}80`)}
                        onBlur={e => (e.target.style.borderColor = `${accent}40`)}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button type="button" onClick={() => setEditingNotes(false)} disabled={isPending}
                          style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                          Cancel
                        </button>
                        <button type="button" onClick={() => handleUpdateNotes(logGoal.id, notesDraft)} disabled={isPending}
                          style={{ flex: 2, padding: '10px 0', borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                          {isPending ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )

                  if (logGoal.why_it_matters && !isReadingGoal) return (
                    <div>
                      {/* Decorative quote block */}
                      <div style={{ position: 'relative', padding: '28px 20px 20px', borderRadius: 18, background: `linear-gradient(135deg,${accent}08 0%,rgba(0,0,0,0) 60%)`, border: `1px solid ${accent}18`, marginBottom: 18, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -12, left: 10, fontSize: 100, lineHeight: 1, color: accent, opacity: 0.08, fontFamily: 'Georgia,serif', userSelect: 'none', pointerEvents: 'none' }}>&ldquo;</div>
                        <p style={{ fontSize: 15, color: '#D0D0D0', fontWeight: 300, lineHeight: 1.85, fontFamily: 'Georgia,serif', letterSpacing: '0.01em', position: 'relative', zIndex: 1 }}>
                          {logGoal.why_it_matters}
                        </p>
                        <button type="button" onClick={() => { setNotesDraft(logGoal.why_it_matters ?? ''); setEditingNotes(true) }}
                          style={{ marginTop: 16, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '5px 12px', borderRadius: 7, background: 'transparent', border: `1px solid ${accent}28`, color: accent, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', opacity: 0.7, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
                          ✎ EDIT
                        </button>
                      </div>

                      {/* Metadata strip */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#444', marginBottom: 1 }}>DAY</p>
                          <p style={{ fontSize: 15, fontWeight: 900, color: accent, lineHeight: 1 }}>{daysSince}</p>
                        </div>
                        {logGoal.deadline && (
                          <div style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#444', marginBottom: 1 }}>DUE</p>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#888', lineHeight: 1 }}>{logGoal.deadline}</p>
                          </div>
                        )}
                        <div style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#444', marginBottom: 1 }}>PROGRESS</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: accent, lineHeight: 1 }}>{logGoal.progress ?? 0}%</p>
                        </div>
                      </div>
                    </div>
                  )

                  /* Empty state */
                  return (
                    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${accent}10`, border: `1px solid ${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 26 }}>✍️</div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 6 }}>What&apos;s driving this?</p>
                      <p style={{ fontSize: 12, color: '#444', fontWeight: 300, lineHeight: 1.7, marginBottom: 22, maxWidth: 260, margin: '0 auto 22px' }}>
                        Write your &ldquo;why&rdquo; — the deeper reason behind this commitment. It&apos;s what you come back to when things get hard.
                      </p>
                      <button type="button" onClick={() => { setNotesDraft(''); setEditingNotes(true) }}
                        style={{ padding: '10px 22px', borderRadius: 11, background: `${accent}14`, border: `1px solid ${accent}30`, color: accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                        + Add your why
                      </button>
                    </div>
                  )
                })()}

                {logTab === 'details' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      ['Goal Type', logGoal.goal_type ?? 'standard'],
                      ['Status', logGoal.status ?? 'active'],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: 12, color: '#EFEFEF', textTransform: 'capitalize' }}>{value}</span>
                      </div>
                    ))}

                    {/* Editable deadline */}
                    <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {editingDeadline ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>Deadline</span>
                          <input
                            type="date"
                            value={deadlineDraft}
                            onChange={e => setDeadlineDraft(e.target.value)}
                            className="cc-input"
                            style={{ fontSize: 13, colorScheme: 'dark' }}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={() => setEditingDeadline(false)} disabled={isPending}
                              style={{ flex: 1, padding: '8px 0', borderRadius: 9, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#555', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                              Cancel
                            </button>
                            {deadlineDraft && (
                              <button type="button" onClick={() => handleUpdateDeadline(logGoal.id, '')} disabled={isPending}
                                style={{ flex: 1, padding: '8px 0', borderRadius: 9, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                                Remove
                              </button>
                            )}
                            <button type="button" onClick={() => handleUpdateDeadline(logGoal.id, deadlineDraft)} disabled={isPending}
                              style={{ flex: 2, padding: '8px 0', borderRadius: 9, background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                              {isPending ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>Deadline</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 12, color: '#EFEFEF' }}>{logGoal.deadline ?? '—'}</span>
                            <button type="button" onClick={() => { setDeadlineDraft(logGoal.deadline ?? ''); setEditingDeadline(true) }}
                              style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#555', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                              Edit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Editable visibility */}
                    <div style={{ paddingTop: 16 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#555', marginBottom: 10 }}>VISIBILITY</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        {(['private', 'circle', 'public'] as const).map(v => {
                          const active = (logGoal.visibility ?? 'circle') === v
                          return (
                            <button key={v} type="button" onClick={() => handleUpdateVisibility(logGoal.id, v)} disabled={isPending}
                              style={{ padding: '9px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s',
                                background: active ? `${accent}18` : 'rgba(255,255,255,0.03)',
                                color: active ? accent : '#555',
                                border: active ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.07)' }}>
                              {VIS_LABEL[v]}
                            </button>
                          )
                        })}
                      </div>
                      <p style={{ fontSize: 11, color: '#444', marginTop: 8, fontWeight: 300 }}>{VIS_DESC[logGoal.visibility ?? 'circle']}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 22px 22px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => { setLogGoalId(null); setEditingNotes(false); setEditingDeadline(false) }}
                  style={{ width: '100%', padding: 15, borderRadius: 14, background: `linear-gradient(135deg,${accent}22,${accent}10)`, border: `1px solid ${accent}44`, color: accent, fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
                  CLOSE
                </button>
              </div>

            </div>
          </div>
        )
      })()}

      {/* ── DELETE CONFIRMATION ── */}
      {confirmDeleteId && (() => {
        const target = goals.find(g => g.id === confirmDeleteId)
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', padding: '20px 16px' }} onClick={() => setConfirmDeleteId(null)}>
            <div style={{ width: '100%', maxWidth: 360, borderRadius: 22, background: '#111', border: '1px solid rgba(248,113,113,0.2)', padding: '28px 24px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 22 }}>🗑</div>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.01em', marginBottom: 8 }}>Delete this goal?</h3>
              {target && <p style={{ fontSize: 13, color: '#555', fontWeight: 300, marginBottom: 6, lineHeight: 1.5 }}>&ldquo;{target.title}&rdquo;</p>}
              <p style={{ fontSize: 12, color: '#3a3a3a', fontWeight: 300, marginBottom: 24 }}>This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setConfirmDeleteId(null)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#777', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  Cancel
                </button>
                <button type="button" onClick={() => handleDelete(confirmDeleteId)} disabled={isPending}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                  {isPending ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── CREATE GOAL DRAWER ── */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={closeCreate} />
          {/* Drawer panel */}
          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, height: '100%', overflowY: 'auto', background: '#0E0E0E', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '28px 24px 32px', flex: 1 }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em' }}>New Commitment</h2>
              <button type="button" onClick={closeCreate} style={{ fontSize: 24, color: '#666', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
            </div>

            {/* Type selector — compact tab strip */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
              {([
                ['standard', '🎯', 'Standard'] as const,
                ['reading',  '📚', 'Reading']  as const,
                ['letter',   '✉️', 'Letter']   as const,
              ]).filter(([type]) => !(type === 'reading' && hasActiveReadingGoal)).map(([type, emoji, label]) => {
                const isActive = goalType === type
                return (
                  <button key={type} type="button" onClick={() => { setGoalType(type as GoalType); setError('') }}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 9, fontFamily: 'Satoshi,sans-serif', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center', fontSize: 11, fontWeight: 700, border: 'none', background: isActive ? (type === 'reading' ? 'rgba(56,189,248,0.15)' : 'rgba(212,175,55,0.12)') : 'transparent', color: isActive ? (type === 'reading' ? '#38bdf8' : '#D4AF37') : '#555' }}>
                    {emoji} {label}
                  </button>
                )
              })}
            </div>

            {/* Form — hidden inputs carry goal_type + visibility into FormData */}
            <form autoComplete="off" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="hidden" name="goal_type" value={goalType} onChange={() => {}} />
              <input type="hidden" name="visibility" value={visibility} onChange={() => {}} />

              {/* ── STANDARD ── */}
              {goalType === 'standard' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>COMMITMENT</label>
                    <input name="title" required placeholder="What will you accomplish?" className="cc-input" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>CATEGORY</label>
                    <select name="category" className="cc-input" style={{ fontSize: 14 }}>
                      <option value="" style={{ background: '#0D0D0D' }}>Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#0D0D0D' }}>{categoryLabel(c)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>TARGET DATE</label>
                    <input name="deadline" type="date" className="cc-input" style={{ fontSize: 14, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>MILESTONES</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {milestoneInputs.map((m, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8 }}>
                          <input
                            name="milestone"
                            value={m}
                            onChange={e => { const u = [...milestoneInputs]; u[i] = e.target.value; setMilestoneInputs(u) }}
                            placeholder={`Step ${i + 1}…`}
                            className="cc-input"
                            style={{ flex: 1 }}
                          />
                          {milestoneInputs.length > 1 && (
                            <button type="button" onClick={() => setMilestoneInputs(milestoneInputs.filter((_, j) => j !== i))}
                              style={{ padding: '0 12px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                          )}
                        </div>
                      ))}
                      {milestoneInputs.length < 5 && (
                        <button type="button" onClick={() => setMilestoneInputs([...milestoneInputs, ''])}
                          style={{ fontSize: 11, fontWeight: 700, padding: '8px 0', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: '#555', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
                          + Add Step
                        </button>
                      )}
                    </div>
                  </div>
                  <VisibilityPicker visibility={visibility} onChange={setVisibility} />
                </>
              )}

              {/* ── READING ── */}
              {goalType === 'reading' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>GOAL TITLE</label>
                    <input name="title" required placeholder="e.g. Read 24 Books This Year" className="cc-input" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>HOW MANY BOOKS?</label>
                      <input name="why" required type="number" min="1" max="365" placeholder="12" className="cc-input" style={{ fontSize: 15 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>TARGET DATE</label>
                      <input name="deadline" type="date" className="cc-input" style={{ fontSize: 14, colorScheme: 'dark' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>
                      CURRENTLY READING <span style={{ color: '#444', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                    </label>
                    <BookSearch />
                  </div>
                  <VisibilityPicker visibility={visibility} onChange={setVisibility} />
                </>
              )}

              {/* ── LETTER TO SELF ── */}
              {goalType === 'letter' && (
                <>
                  <input type="hidden" name="title" defaultValue="Letter to Self" />
                  <div style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 12, padding: 14, display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
                    <p style={{ fontSize: 12, color: '#888', fontWeight: 300, lineHeight: 1.65 }}>
                      Write a letter to your future self. Set the date you want it to unlock. You won&apos;t be able to read it until that date arrives — not even if you come back and click on it.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>UNLOCK DATE</label>
                    <input name="deadline" type="date" required className="cc-input" style={{ fontSize: 14, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>YOUR LETTER</label>
                    <textarea name="why" rows={8} placeholder={'Dear Future Me,\n\nI\'m writing this today, and I want you to know…'}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, fontSize: 13, color: '#EFEFEF', fontFamily: 'Georgia,serif', outline: 'none', resize: 'none', lineHeight: 1.8, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(212,175,55,0.3)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                    <p style={{ fontSize: 10, color: '#444', marginTop: 6, fontWeight: 300 }}>Once sealed, you can&apos;t edit this letter. Write freely.</p>
                  </div>
                </>
              )}

              {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={closeCreate} className="btn-ghost" style={{ width: 'auto', paddingLeft: 18, paddingRight: 18 }}>Cancel</button>
                <button type="submit" disabled={isPending} className="btn-gold">
                  {isPending ? 'SAVING…' : goalType === 'letter' ? '🔒 SEAL & SAVE' : goalType === 'reading' ? 'START READING GOAL' : 'ADD COMMITMENT'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── VISIBILITY PICKER ── */
function VisibilityPicker({ visibility, onChange }: { visibility: string; onChange: (v: 'private' | 'circle' | 'public') => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 10 }}>WHO CAN SEE THIS</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <button type="button" onClick={() => onChange('private')} className={`vis-btn${visibility === 'private' ? ' active-private' : ''}`}>🔒 Private</button>
        <button type="button" onClick={() => onChange('circle')}  className={`vis-btn${visibility === 'circle'  ? ' active-circle'  : ''}`}>👥 Circle</button>
        <button type="button" onClick={() => onChange('public')}  className={`vis-btn${visibility === 'public'  ? ' active-public'  : ''}`}>🌍 Public</button>
      </div>
      <p style={{ fontSize: 11, color: '#555', marginTop: 8, fontWeight: 300 }}>{VIS_DESC[visibility]}</p>
    </div>
  )
}

/* ── DEADLINE URGENCY PILL ── */
function DeadlinePill({ deadline }: { deadline: string | null }) {
  if (!deadline) return null
  const daysLeft = Math.ceil((new Date(deadline + 'T12:00:00').getTime() - Date.now()) / 86400000)
  if (daysLeft > 7) return null
  const overdue   = daysLeft < 0
  const critical  = !overdue && daysLeft <= 3
  const color  = overdue || critical ? '#f87171' : '#f59e0b'
  const bg     = overdue || critical ? 'rgba(248,113,113,0.1)' : 'rgba(245,158,11,0.1)'
  const border = overdue || critical ? 'rgba(248,113,113,0.3)' : 'rgba(245,158,11,0.3)'
  const label  = overdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 6, color, background: bg, border: `1px solid ${border}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
      {overdue ? '!' : '⏳'} {label}
    </span>
  )
}

/* ── STANDARD GOAL CARD ── */
function GoalCard({ goal, onLog, onDelete }: { goal: Goal; onLog: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  const c = cc(goal.category)
  const progress = goal.progress ?? 0
  const dotsFilled = Math.round(progress / 10)

  return (
    <div className="card lift" style={{ padding: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer', borderLeft: `3px solid ${c.accent}`, background: `linear-gradient(120deg,${c.bg} 0%,#111111 40%)` }} onClick={onLog} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button type="button" onClick={e => { e.stopPropagation(); onDelete() }} style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, width: 26, height: 26, borderRadius: '50%', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, lineHeight: 1, opacity: hovered ? 1 : 0, transform: `scale(${hovered ? 1 : 0.75})`, transition: 'opacity 0.15s, transform 0.15s', pointerEvents: hovered ? 'auto' : 'none' }}>×</button>
      <div style={{ position: 'absolute', top: -30, left: -20, width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(40px)', opacity: 0.6, background: c.accent }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, position: 'relative', zIndex: 1 }}>
        <ProgressRing progress={progress} accent={c.accent} text={c.text} label={`${progress}%`} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 8 }}>{goal.title}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {goal.category && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '3px 9px', borderRadius: 6, color: c.text, background: c.bg, border: `1px solid ${c.border}` }}>{categoryLabel(goal.category)}</span>}
            {goal.visibility && <span className={`vis-badge vis-${goal.visibility}`}>{VIS_LABEL[goal.visibility]}</span>}
            <DeadlinePill deadline={goal.deadline} />
          </div>
          {goal.next_action && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <p style={{ fontSize: 12, color: '#777', fontWeight: 300 }}>Next: <span style={{ color: '#EFEFEF', fontWeight: 600 }}>{goal.next_action}</span></p>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flex: 1, minWidth: 0 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, transition: 'background 0.3s', background: i < dotsFilled ? c.accent : 'rgba(255,255,255,0.07)', boxShadow: i < dotsFilled ? `0 0 6px ${c.accent}` : 'none' }} />
          ))}
          <span style={{ fontSize: 11, color: '#777', fontWeight: 300, marginLeft: 6, whiteSpace: 'nowrap' }}>{progress}%</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button type="button" onClick={e => { e.stopPropagation(); onLog() }} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', background: c.bg, color: c.accent, border: `1px solid ${c.border}`, transition: 'all 0.15s' }}>
            Log Progress
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── READING GOAL CARD ── */
function ReadingCard({ goal, books, onLog }: { goal: Goal; books: GoalBook[]; onLog: () => void }) {
  const progress = goal.progress ?? 0
  const booksTotal = parseInt(goal.why_it_matters ?? '') || 12
  const readBooks  = books.filter(b => b.status === 'read')
  const booksDone  = books.length > 0 ? readBooks.length : Math.round(progress / 100 * booksTotal)
  const booksLeft  = booksTotal - booksDone
  const currentBook = books.find(b => b.status === 'reading')

  const spines = Array.from({ length: booksDone }, (_, i) => ({
    color: SPINE_COLORS[i % SPINE_COLORS.length],
    height: 14 + (i * 7 % 9),
  }))

  return (
    <div className="card lift" style={{ padding: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer', borderLeft: '3px solid #38bdf8', background: 'linear-gradient(120deg,rgba(56,189,248,0.06) 0%,#111111 40%)' }} onClick={onLog}>
      <div style={{ position: 'absolute', top: -30, left: -20, width: 120, height: 120, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(40px)', opacity: 0.5, background: '#38bdf8' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
        <div style={{ width: 68, height: 68, position: 'relative', flexShrink: 0 }}>
          <svg width="68" height="68" viewBox="0 0 68 68">
            <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
            <circle cx="34" cy="34" r="28" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round"
              strokeDasharray="175.9" strokeDashoffset={175.9 * (1 - progress / 100)}
              transform="rotate(-90 34 34)" style={{ transition: 'stroke-dashoffset 0.8s ease', filter: 'drop-shadow(0 0 5px #38bdf8)' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: '#38bdf8', lineHeight: 1 }}>{booksDone}</p>
            <p style={{ fontSize: 7, color: '#555', fontWeight: 600, letterSpacing: '0.05em' }}>BOOKS</p>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 6 }}>{goal.title}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {goal.category && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: '#38bdf8', background: 'rgba(56,189,248,0.09)', border: '1px solid rgba(56,189,248,0.18)' }}>{categoryLabel(goal.category)}</span>}
            {goal.visibility && <span className={`vis-badge vis-${goal.visibility}`}>{VIS_LABEL[goal.visibility]}</span>}
            <DeadlinePill deadline={goal.deadline} />
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 36, overflow: 'hidden' }}>
            {readBooks.length > 0
              ? readBooks.slice(0, 18).map((b, i) => (
                  b.cover_url
                    ? <img key={b.id} src={b.cover_url} alt="" style={{ width: 24, height: 34, objectFit: 'cover', borderRadius: '2px 2px 0 0', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }} />
                    : <div key={b.id} style={{ width: 8, height: 14 + (i * 7 % 9), borderRadius: '2px 2px 0 0', flexShrink: 0, background: SPINE_COLORS[i % SPINE_COLORS.length], opacity: 0.85 }} />
                ))
              : spines.map((s, i) => (
                  <div key={i} style={{ width: 8, height: s.height, borderRadius: '2px 2px 0 0', flexShrink: 0, background: s.color, opacity: 0.85 }} />
                ))
            }
            {booksDone === 0 && <p style={{ fontSize: 10, color: '#444', fontWeight: 300, lineHeight: '36px' }}>No books read yet</p>}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div>
          {(currentBook?.title ?? goal.next_action)
            ? <p style={{ fontSize: 11, color: '#777', fontWeight: 300 }}>Reading: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{currentBook?.title ?? goal.next_action}</span></p>
            : <p style={{ fontSize: 11, color: '#555', fontWeight: 300 }}>Not currently reading</p>
          }
          <p style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{booksLeft} book{booksLeft !== 1 ? 's' : ''} left · {booksTotal} total</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button type="button" onClick={e => { e.stopPropagation(); onLog() }} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', whiteSpace: 'nowrap', background: 'rgba(56,189,248,0.09)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.18)', transition: 'all 0.15s' }}>
            My Books
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── LETTER TO SELF CARD ── */
function LetterCard({ goal }: { goal: Goal }) {
  const revealDate = goal.deadline ? new Date(goal.deadline + 'T12:00:00') : null
  const daysLeft   = revealDate ? Math.max(0, Math.ceil((revealDate.getTime() - Date.now()) / 86400000)) : null
  const unlocked   = daysLeft !== null && daysLeft === 0

  return (
    <div className="letter-card">
      <div style={{ height: 3, background: 'linear-gradient(90deg,#d946ef,#7c3aed)' }} />
      <div className="letter-sealed">
        <div className="letter-wax">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f0abfc" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.01em', marginBottom: 6 }}>Letter to Self</p>
        <p style={{ fontSize: 11, color: '#666', fontWeight: 300, marginBottom: 16 }}>Written and sealed · Private</p>
        {revealDate ? (
          <div style={{ background: 'rgba(217,70,239,0.07)', border: '1px solid rgba(217,70,239,0.2)', borderRadius: 12, padding: '12px 20px', marginBottom: 16, width: '100%' }}>
            {unlocked ? (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#22c55e', marginBottom: 4 }}>✓ UNLOCKED</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#EFEFEF' }}>You can read it now</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#d946ef', marginBottom: 4 }}>OPENS IN</p>
                <p style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em' }}>{daysLeft} days</p>
                <p style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                  {revealDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </>
            )}
          </div>
        ) : (
          <div style={{ background: 'rgba(217,70,239,0.07)', border: '1px solid rgba(217,70,239,0.2)', borderRadius: 12, padding: '12px 20px', marginBottom: 16, width: '100%' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#d946ef', marginBottom: 4 }}>NO UNLOCK DATE SET</p>
          </div>
        )}
        <p style={{ fontSize: 11, color: '#444', fontStyle: 'italic', marginBottom: 14 }}>&ldquo;You&apos;ll know on that day whether you became who you said you would.&rdquo;</p>
      </div>
    </div>
  )
}

/* ── BOOK SEARCH ── */
type BookResult = { id: string; title: string; author: string; cover: string | null; year: string }

function BookSearch({ onSelect }: { onSelect?: (book: BookResult | null) => void } = {}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookResult[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [selected, setSelected] = useState<BookResult | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function search(q: string) {
    if (q.trim().length < 2) { setResults([]); setDone(false); return }
    setLoading(true); setDone(false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function mapItunes(item: any): BookResult {
      return {
        id: String(item.trackId),
        title: item.trackName ?? '',
        author: item.artistName ?? '',
        cover: item.artworkUrl100?.replace('100x100bb', '300x300bb') ?? null,
        year: item.releaseDate ? String(new Date(item.releaseDate).getFullYear()) : '',
      }
    }

    Promise.allSettled([
      // Server-side proxy (tries Open Library then iTunes server-side)
      fetch(`/api/books?q=${encodeURIComponent(q)}`).then(r => r.json() as Promise<BookResult[]>),
      // Direct iTunes from browser — CORS-friendly, works regardless of server network
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=ebook&limit=7&country=us`)
        .then(r => r.json())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((d: any): BookResult[] => (d.results ?? []).map(mapItunes).filter((b: BookResult) => b.title)),
    ]).then(([srv, direct]) => {
      const a = srv.status === 'fulfilled' && Array.isArray(srv.value) ? srv.value as BookResult[] : []
      const b = direct.status === 'fulfilled' ? direct.value as BookResult[] : []
      setResults(a.length > 0 ? a : b)
    }).finally(() => { setLoading(false); setDone(true) })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v); setSelected(null); setDone(false)
    if (onSelect) onSelect(null)
    if (timer.current) clearTimeout(timer.current)
    if (v.trim().length < 2) { setResults([]); return }
    timer.current = setTimeout(() => search(v), 350)
  }

  function pick(book: BookResult) {
    setSelected(book); setResults([])
    if (onSelect) onSelect(book)
  }

  function clear() {
    setSelected(null); setQuery(''); setResults([]); setDone(false)
    if (onSelect) onSelect(null)
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const showResults = !selected && results.length > 0 && !loading
  const showEmpty   = !selected && done && !loading && results.length === 0 && query.trim().length >= 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Search input */}
      {!selected && (
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search by title or author…"
          className="cc-input"
          autoComplete="off"
        />
      )}

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[1, 0.7, 0.45].map((op, i) => (
            <div key={i} className="animate-pulse"
              style={{ height: 68, borderRadius: 12, background: `rgba(56,189,248,${op * 0.04})`, border: `1px solid rgba(56,189,248,${op * 0.08})` }} />
          ))}
        </div>
      )}

      {/* Results list — fully inline, no absolute/fixed positioning */}
      {showResults && (
        <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', background: '#0f0f0f' }}>
          {results.map((book, i) => (
            <button key={book.id} type="button" onClick={() => pick(book)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'none', border: 'none', borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', textAlign: 'left', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              {book.cover
                ? <img src={book.cover} alt="" style={{ width: 42, height: 60, objectFit: 'cover', borderRadius: 6, flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.7)' }} />
                : <div style={{ width: 42, height: 60, borderRadius: 6, background: 'linear-gradient(135deg,rgba(56,189,248,0.12),rgba(56,189,248,0.04))', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid rgba(56,189,248,0.1)' }}>📚</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                <p style={{ fontSize: 11, color: '#38bdf8', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>
                {book.year && <p style={{ fontSize: 10, color: '#444', fontWeight: 300 }}>{book.year}</p>}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {showEmpty && (
        <div style={{ padding: '20px 16px', textAlign: 'center', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>No books found for &ldquo;{query}&rdquo;</p>
          <p style={{ fontSize: 11, color: '#333', fontWeight: 300 }}>Try a different title or author name</p>
        </div>
      )}

      {/* Selected book — large card */}
      {selected && (
        <div style={{ display: 'flex', gap: 18, padding: '18px 16px', borderRadius: 16, background: 'linear-gradient(135deg,rgba(56,189,248,0.07),rgba(56,189,248,0.02))', border: '1px solid rgba(56,189,248,0.25)' }}>
          {selected.cover
            ? <img src={selected.cover} alt="" style={{ width: 64, height: 90, objectFit: 'cover', borderRadius: 8, flexShrink: 0, boxShadow: '0 10px 28px rgba(0,0,0,0.7)' }} />
            : <div style={{ width: 64, height: 90, borderRadius: 8, background: 'linear-gradient(135deg,rgba(56,189,248,0.2),rgba(56,189,248,0.06))', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '1px solid rgba(56,189,248,0.2)' }}>📚</div>
          }
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#38bdf8', marginBottom: 8 }}>SELECTED</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF', lineHeight: 1.3, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</p>
            <p style={{ fontSize: 12, color: '#38bdf8', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.author}</p>
            {selected.year && <p style={{ fontSize: 11, color: '#555' }}>{selected.year}</p>}
            <button type="button" onClick={clear}
              style={{ marginTop: 12, alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#666' }}>
              Change book
            </button>
          </div>
          {!onSelect && (
            <>
              <input type="hidden" name="next_action"    value={selected.title}      onChange={() => {}} />
              <input type="hidden" name="book_author"    value={selected.author}     onChange={() => {}} />
              <input type="hidden" name="book_cover_url" value={selected.cover ?? ''} onChange={() => {}} />
            </>
          )}
        </div>
      )}

    </div>
  )
}

/* ── SHARED PROGRESS RING ── */
function ProgressRing({ progress, accent, text, label }: { progress: number; accent: string; text: string; label: string }) {
  return (
    <div style={{ width: 68, height: 68, position: 'relative', flexShrink: 0 }}>
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
        <circle cx="34" cy="34" r="28" fill="none" strokeWidth="5"
          stroke={accent} strokeLinecap="round"
          strokeDasharray="175.9" strokeDashoffset={175.9 * (1 - progress / 100)}
          transform="rotate(-90 34 34)"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${accent})` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: text }}>{label}</p>
      </div>
    </div>
  )
}
