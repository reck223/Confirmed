'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { addBook, updateBookStatus, logReadingSession, deleteBook } from './actions'
import ShareToFeedSheet from '@/components/ShareToFeedSheet'

type BookSession = { id: string; book_id: string; session_date: string; pages_read: number; note: string | null }
type Book = {
  id: string; title: string; author: string | null; total_pages: number | null
  current_page: number; status: 'want' | 'reading' | 'finished'
  goal_id: string | null; started_date: string | null; finished_date: string | null
  notes: string | null; created_at: string; sessions: BookSession[]
}
type Goal = { id: string; title: string; category: string | null; progress: number }

const CAT_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  health:        { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.2)'   },
  career:        { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.2)'  },
  business:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)'  },
  finance:       { color: '#D4AF37', bg: 'rgba(212,175,55,0.1)',  border: 'rgba(212,175,55,0.2)'  },
  learning:      { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.2)'  },
  creative:      { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.2)'  },
  relationships: { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.2)'   },
  personal:      { color: '#14b8a6', bg: 'rgba(20,184,166,0.1)',  border: 'rgba(20,184,166,0.2)'  },
  adventure:     { color: '#84cc16', bg: 'rgba(132,204,22,0.1)',  border: 'rgba(132,204,22,0.2)'  },
  spiritual:     { color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.2)' },
}
const DEFAULT_CC = { color: '#D4AF37', bg: 'rgba(212,175,55,0.1)', border: 'rgba(212,175,55,0.2)' }
function goalCatColor(cat: string | null) { return CAT_COLORS[cat ?? ''] ?? DEFAULT_CC }

type Tab = 'reading' | 'want' | 'finished'

const STATUS_LABEL: Record<Tab, string>  = { reading: 'Reading', want: 'Want to Read', finished: 'Finished' }
const STATUS_EMOJI: Record<Tab, string>  = { reading: '📖', want: '📋', finished: '✅' }

const INP: React.CSSProperties = {
  width: '100%', padding: '11px 13px', borderRadius: 11, boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
  color: '#EFEFEF', fontSize: 14, fontFamily: 'Satoshi,sans-serif', outline: 'none',
}
const LBL: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)', marginBottom: 5 }

function coverColor(title: string): string {
  const colors = ['#38bdf8','#a78bfa','#f97316','#22c55e','#f43f5e','#D4AF37','#14b8a6','#e879f9']
  let h = 0; for (const c of title) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(h) % colors.length]
}

export function ReadingClient({
  books: initBooks,
  goals,
  booksFinishedThisYear,
  totalPagesThisYear,
}: {
  books: Book[]
  goals: Goal[]
  booksFinishedThisYear: number
  totalPagesThisYear: number
}) {
  const [books, setBooks] = useState(initBooks)
  const [tab, setTab]     = useState<Tab>('reading')
  const [showForm, setShowForm]   = useState(false)
  const [logFor, setLogFor]       = useState<string | null>(null)
  const [, startT]                = useTransition()

  // Add book form
  const [newTitle, setNewTitle]   = useState('')
  const [newAuthor, setNewAuthor] = useState('')
  const [newPages, setNewPages]   = useState('')
  const [newStatus, setNewStatus] = useState<'want' | 'reading' | 'finished'>('want')
  const [newGoalId, setNewGoalId] = useState('')
  const [creating, setCreating]   = useState(false)

  // Log session form
  const [logPages, setLogPages]   = useState('')
  const [logNote, setLogNote]     = useState('')
  const [logging, setLogging]     = useState(false)

  const [deleting, setDeleting]   = useState<string | null>(null)
  const [moving, setMoving]       = useState<string | null>(null)
  const [shareCaption, setShareCaption] = useState<string | null>(null)

  const tabBooks = books.filter(b => b.status === tab)
  const goalMap  = Object.fromEntries(goals.map(g => [g.id, g]))

  function resetForm() {
    setNewTitle(''); setNewAuthor(''); setNewPages(''); setNewStatus('want'); setNewGoalId('')
  }

  function handleAdd() {
    if (!newTitle.trim()) return
    setCreating(true)
    startT(async () => {
      await addBook(newTitle.trim(), newAuthor.trim(), newPages ? parseInt(newPages) : null, newStatus, newGoalId || null)
      resetForm(); setShowForm(false); setCreating(false)
    })
  }

  function handleLogSession(book: Book) {
    const pages = parseInt(logPages)
    if (!pages || pages <= 0) return
    const newPage = Math.min(book.current_page + pages, book.total_pages ?? 999999)
    setLogging(true)
    setBooks(prev => prev.map(b => b.id === book.id ? { ...b, current_page: newPage } : b))
    startT(async () => {
      await logReadingSession(book.id, pages, logNote.trim(), newPage)
      setLogPages(''); setLogNote(''); setLogFor(null); setLogging(false)
    })
  }

  function handleMove(bookId: string, newStatus: 'want' | 'reading' | 'finished') {
    setMoving(bookId)
    const book = books.find(b => b.id === bookId)
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, status: newStatus } : b))
    startT(async () => {
      await updateBookStatus(bookId, newStatus)
      setMoving(null)
      if (newStatus === 'finished' && book) {
        const author = book.author ? ` by ${book.author}` : ''
        setShareCaption(`📚 Just finished "${book.title}"${author}. Another one in the books. Knowledge is the asset that compounds. 🔥`)
      }
    })
  }

  function handleDelete(bookId: string) {
    setDeleting(bookId)
    setBooks(prev => prev.filter(b => b.id !== bookId))
    startT(async () => {
      await deleteBook(bookId)
      setDeleting(null)
    })
  }

  const year = new Date().getFullYear()

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 80px', fontFamily: 'Satoshi,sans-serif' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{ paddingTop: 4, paddingBottom: 20, animation: 'fadeUp 0.3s ease both' }}>
        <Link href="/tools" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>← Tools</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, animation: 'fadeUp 0.35s 0.05s ease both' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', marginBottom: 4 }}>Reading</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{books.length} book{books.length !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ padding: '11px 18px', borderRadius: 16, background: showForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#38bdf8,#a78bfa)', border: showForm ? '1px solid rgba(255,255,255,0.1)' : 'none', fontSize: 13, fontWeight: 900, color: showForm ? 'rgba(255,255,255,0.5)' : '#080808', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
          {showForm ? 'Cancel' : '+ Add Book'}
        </button>
      </div>

      {/* Year stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, animation: 'fadeUp 0.37s 0.07s ease both' }}>
        <div style={{ borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(56,189,248,0.15)', padding: '14px 16px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 5 }}>BOOKS FINISHED {year}</p>
          <p style={{ fontSize: 24, fontWeight: 900, color: '#38bdf8' }}>{booksFinishedThisYear}</p>
        </div>
        <div style={{ borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(167,139,250,0.15)', padding: '14px 16px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 5 }}>PAGES READ {year}</p>
          <p style={{ fontSize: 24, fontWeight: 900, color: '#a78bfa' }}>{totalPagesThisYear.toLocaleString()}</p>
        </div>
      </div>

      {/* Add book form */}
      {showForm && (
        <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(56,189,248,0.15)', padding: '20px 18px', marginBottom: 20, animation: 'fadeUp 0.25s ease both' }}>
          <p style={{ fontSize: 15, fontWeight: 900, color: '#EFEFEF', marginBottom: 16 }}>Add a Book</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={LBL}>TITLE</p>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Book title" style={INP} />
            </div>
            <div>
              <p style={LBL}>AUTHOR</p>
              <input value={newAuthor} onChange={e => setNewAuthor(e.target.value)} placeholder="Author name" style={INP} />
            </div>
            <div>
              <p style={LBL}>TOTAL PAGES</p>
              <input type="number" inputMode="numeric" value={newPages} onChange={e => setNewPages(e.target.value)} placeholder="e.g. 320" style={INP} />
            </div>
          </div>

          <p style={LBL}>STATUS</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {(['want', 'reading', 'finished'] as const).map(s => (
              <button key={s} onClick={() => setNewStatus(s)} style={{ padding: '9px 0', borderRadius: 11, background: newStatus === s ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${newStatus === s ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.07)'}`, fontSize: 11, fontWeight: 800, color: newStatus === s ? '#38bdf8' : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                {STATUS_EMOJI[s]} {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {goals.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={LBL}>LINK TO GOAL (optional)</p>
              <select value={newGoalId} onChange={e => setNewGoalId(e.target.value)} style={{ ...INP, appearance: 'none' }}>
                <option value="">— No goal —</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
          )}

          <button onClick={handleAdd} disabled={!newTitle.trim() || creating} style={{ width: '100%', padding: '13px 0', borderRadius: 14, background: newTitle.trim() ? 'linear-gradient(135deg,#38bdf8,#a78bfa)' : 'rgba(255,255,255,0.04)', border: 'none', fontSize: 14, fontWeight: 900, color: newTitle.trim() ? '#080808' : 'rgba(255,255,255,0.2)', cursor: newTitle.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif' }}>
            {creating ? 'ADDING…' : 'ADD BOOK'}
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, animation: 'fadeUp 0.38s 0.08s ease both' }}>
        {(['reading', 'want', 'finished'] as Tab[]).map(t => {
          const cnt = books.filter(b => b.status === t).length
          return (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 14px', borderRadius: 10, background: tab === t ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${tab === t ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.07)'}`, fontSize: 12, fontWeight: 800, color: tab === t ? '#38bdf8' : 'rgba(255,255,255,0.38)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
              {STATUS_EMOJI[t]} {STATUS_LABEL[t]} {cnt > 0 && <span style={{ fontSize: 10, opacity: 0.7 }}>({cnt})</span>}
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {tabBooks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'fadeUp 0.4s 0.1s ease both' }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>{STATUS_EMOJI[tab]}</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#EFEFEF', marginBottom: 8 }}>No books here yet</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            {tab === 'reading' ? 'Start a book to track your reading progress.' : tab === 'want' ? 'Add books you want to read to build your list.' : 'Books you finish will appear here.'}
          </p>
        </div>
      )}

      {/* Book list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tabBooks.map((book, i) => {
          const col   = coverColor(book.title)
          const pct   = book.total_pages ? Math.round((book.current_page / book.total_pages) * 100) : null
          const isLogging = logFor === book.id

          return (
            <div key={book.id} style={{ borderRadius: 20, background: '#0d0d0d', border: `1px solid ${col}20`, overflow: 'hidden', animation: `fadeUp 0.35s ${i*0.06}s ease both`, opacity: deleting === book.id ? 0.4 : 1, transition: 'opacity 0.2s' }}>
              <div style={{ height: 3, background: `linear-gradient(90deg,${col},${col}55)` }} />
              <div style={{ padding: '16px 18px 18px' }}>
                {/* Book header */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                  {/* Cover placeholder */}
                  <div style={{ width: 44, height: 58, borderRadius: 6, background: `${col}20`, border: `1px solid ${col}30`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: col }}>
                    {book.title[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 900, color: '#EFEFEF', lineHeight: 1.2, marginBottom: 3 }}>{book.title}</p>
                    {book.author && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginBottom: 4 }}>{book.author}</p>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {book.total_pages && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{book.total_pages} pages</span>}
                      {tab === 'reading' && pct !== null && <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{pct}%</span>}
                      {tab === 'finished' && book.finished_date && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Finished {new Date(book.finished_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                      {book.sessions.length > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{book.sessions.length} session{book.sessions.length !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(book.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0, alignSelf: 'flex-start' }}>🗑</button>
                </div>

                {/* Progress bar (reading books) */}
                {tab === 'reading' && book.total_pages && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>p. {book.current_page}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>p. {book.total_pages}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 4, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )}

                {/* Goal link — inline goal progress */}
                {book.goal_id && goalMap[book.goal_id] && (() => {
                  const g  = goalMap[book.goal_id]
                  const gc = goalCatColor(g.category)
                  return (
                    <div style={{ padding: '10px 12px', borderRadius: 12, background: gc.bg, border: `1px solid ${gc.border}`, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: gc.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>🎯 {g.title}</p>
                        <Link href={`/goals?goal=${book.goal_id}`} style={{ fontSize: 10, color: gc.color, fontWeight: 700, textDecoration: 'none', opacity: 0.75, flexShrink: 0 }}>View goal →</Link>
                      </div>
                      <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{ height: '100%', width: `${g.progress}%`, background: gc.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>
                      <p style={{ fontSize: 10, color: gc.color, opacity: 0.65 }}>{g.progress}% complete</p>
                    </div>
                  )
                })()}
                {book.goal_id && !goalMap[book.goal_id] && (
                  <Link href={`/goals?goal=${book.goal_id}`} style={{ fontSize: 11, color: col, fontWeight: 700, textDecoration: 'none', opacity: 0.7, display: 'block', marginBottom: 10 }}>→ Linked to goal</Link>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {tab === 'reading' && (
                    <button onClick={() => setLogFor(isLogging ? null : book.id)} style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: isLogging ? 'rgba(255,255,255,0.04)' : `${col}20`, border: `1px solid ${isLogging ? 'rgba(255,255,255,0.08)' : col + '40'}`, fontSize: 12, fontWeight: 800, color: isLogging ? 'rgba(255,255,255,0.35)' : col, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                      {isLogging ? 'Cancel' : '+ Log Session'}
                    </button>
                  )}
                  {tab === 'reading' && (
                    <button onClick={() => handleMove(book.id, 'finished')} disabled={moving === book.id} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 12, fontWeight: 800, color: '#22c55e', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', flexShrink: 0 }}>
                      ✓ Finish
                    </button>
                  )}
                  {tab === 'want' && (
                    <button onClick={() => handleMove(book.id, 'reading')} disabled={moving === book.id} style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: `${col}18`, border: `1px solid ${col}35`, fontSize: 12, fontWeight: 800, color: col, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                      Start Reading →
                    </button>
                  )}
                </div>

                {/* Log session form */}
                {isLogging && (
                  <div style={{ marginTop: 12, padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <p style={LBL}>PAGES READ</p>
                        <input type="number" inputMode="numeric" value={logPages} onChange={e => setLogPages(e.target.value)} placeholder="e.g. 30" style={INP} />
                      </div>
                      <div>
                        <p style={LBL}>CURRENT PAGE</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', paddingTop: 11 }}>{book.current_page + (parseInt(logPages) || 0)}{book.total_pages ? ` / ${book.total_pages}` : ''}</p>
                      </div>
                    </div>
                    <p style={LBL}>NOTE (optional)</p>
                    <input value={logNote} onChange={e => setLogNote(e.target.value)} placeholder="Thoughts, quotes, reflections…" style={{ ...INP, marginBottom: 10 }} />
                    <button onClick={() => handleLogSession(book)} disabled={!logPages || parseInt(logPages) <= 0 || logging} style={{ width: '100%', padding: '11px 0', borderRadius: 12, background: logPages ? `${col}20` : 'rgba(255,255,255,0.03)', border: `1px solid ${logPages ? col + '40' : 'rgba(255,255,255,0.06)'}`, fontSize: 13, fontWeight: 800, color: logPages ? col : 'rgba(255,255,255,0.2)', cursor: logPages ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif' }}>
                      {logging ? 'SAVING…' : 'SAVE SESSION'}
                    </button>
                  </div>
                )}

                {/* Recent sessions (finished books only) */}
                {tab === 'finished' && book.sessions.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {book.sessions.slice(0, 3).map(s => (
                      <div key={s.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{new Date(s.session_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{s.pages_read}p</span>
                        {s.note && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.note}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Finished + linked to goal — log progress CTA */}
                {tab === 'finished' && book.goal_id && goalMap[book.goal_id] && (() => {
                  const g  = goalMap[book.goal_id]
                  const gc = goalCatColor(g.category)
                  return (
                    <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)' }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#D4AF37', marginBottom: 6 }}>🏆 Book complete — update your goal?</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10, lineHeight: 1.5 }}>
                        This book is linked to <span style={{ color: gc.color, fontWeight: 700 }}>{g.title}</span> ({g.progress}% done).
                      </p>
                      <Link href={`/goals?goal=${book.goal_id}`} style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 10, background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', fontSize: 12, fontWeight: 800, color: '#D4AF37', textDecoration: 'none' }}>
                        Log progress on goal →
                      </Link>
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>
      {shareCaption !== null && <ShareToFeedSheet defaultCaption={shareCaption} onClose={() => setShareCaption(null)} />}
    </div>
  )
}
