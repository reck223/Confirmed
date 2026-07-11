'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAssessment, updateAssessment } from './actions'

const RATING_COLOR: Record<number, string> = {
  1: '#f87171', 2: '#f87171', 3: '#fb923c', 4: '#fbbf24', 5: '#fbbf24',
  6: '#D4AF37', 7: '#D4AF37', 8: '#4ade80', 9: '#4ade80', 10: '#22c55e',
}

type Props = {
  assessment: {
    id: string; week_start: string; week_title: string | null; rating: number | null
    wins: string | null; challenges: string | null; lessons: string | null
    intentions: string | null; gratitude: string | null
  }
  chapterNum: number
}

function Field({ label, emoji, content, accent }: { label: string; emoji: string; content: string; accent: string }) {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${accent}14` }}>
      <div style={{ padding: '8px 14px 7px', background: `${accent}08`, borderBottom: `1px solid ${accent}10`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12 }}>{emoji}</span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: accent, opacity: 0.8 }}>{label}</span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 13, color: '#AAA', fontWeight: 300, lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>{content}</p>
      </div>
    </div>
  )
}

export function ArchiveChapterCard({ assessment: a, chapterNum }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'view' | 'edit' | 'confirmDelete'>('view')
  const [open, setOpen] = useState(false)

  const rating = a.rating ?? 7
  const rColor = RATING_COLOR[rating] ?? '#D4AF37'
  const dateLabel = new Date(a.week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const preview = a.wins?.slice(0, 80)

  // Edit form state
  const [form, setForm] = useState({
    week_title: a.week_title ?? '',
    rating: String(rating),
    wins: a.wins ?? '',
    challenges: a.challenges ?? '',
    lessons: a.lessons ?? '',
    intentions: a.intentions ?? '',
    gratitude: a.gratitude ?? '',
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSave() {
    startTransition(async () => {
      await updateAssessment(a.id, {
        week_title: form.week_title,
        rating: Math.max(1, Math.min(10, parseInt(form.rating) || rating)),
        wins: form.wins, challenges: form.challenges,
        lessons: form.lessons, intentions: form.intentions, gratitude: form.gratitude,
      })
      setMode('view')
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteAssessment(a.id)
      router.push('/assess')
    })
  }

  const editRating = Math.max(1, Math.min(10, parseInt(form.rating) || rating))
  const editColor = RATING_COLOR[editRating] ?? '#D4AF37'

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${rColor}18`, background: 'rgba(255,255,255,0.005)' }}>
      {/* Color strip */}
      <div style={{ height: 4, background: `linear-gradient(90deg,${rColor},${rColor}44)` }} />

      {/* Card header — always visible, click to expand */}
      <button
        onClick={() => mode === 'view' && setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: mode === 'view' ? 'pointer' : 'default', textAlign: 'left', padding: '20px 22px 16px', display: 'block' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: rColor, opacity: 0.7 }}>CHAPTER {chapterNum}</span>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.2, marginTop: 4, marginBottom: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.week_title ? `"${a.week_title}"` : dateLabel}
            </h3>
            {a.week_title && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{dateLabel}</p>}
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color: rColor, textShadow: `0 0 20px ${rColor}50` }}>{rating}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em' }}>/10</div>
          </div>
        </div>
        {preview && mode === 'view' && !open && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.6, fontStyle: 'italic', marginTop: 10 }}>
            &ldquo;{preview}{(a.wins?.length ?? 0) > 80 ? '…' : ''}&rdquo;
          </p>
        )}
        {mode === 'view' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{open ? '▲ Close' : '▼ Read'}</span>
          </div>
        )}
      </button>

      {/* Expanded / Edit content */}
      {(open || mode === 'edit') && (
        <div style={{ borderTop: `1px solid ${rColor}12`, padding: '20px 22px', background: '#080808' }}>

          {mode === 'edit' ? (
            /* ── EDIT FORM ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: '#D4AF37', margin: 0, opacity: 0.8 }}>EDITING CHAPTER {chapterNum}</p>

              {/* Week title */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)' }}>WEEK TITLE</span>
                <input value={form.week_title} onChange={set('week_title')} placeholder="Name this chapter…" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '10px 12px', color: '#EFEFEF', fontSize: 14, fontFamily: 'Satoshi,sans-serif', outline: 'none' }} />
              </label>

              {/* Rating */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)' }}>RATING
                  <span style={{ color: editColor, marginLeft: 8 }}>{editRating}/10</span>
                </span>
                <input type="range" min={1} max={10} value={form.rating} onChange={set('rating')} style={{ accentColor: editColor, width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>
                  <span>1</span><span>5</span><span>10</span>
                </div>
              </label>

              {[
                { k: 'wins' as const,        label: 'WINS',         emoji: '🏆', accent: '#22c55e' },
                { k: 'challenges' as const,  label: 'CHALLENGES',   emoji: '⚡', accent: '#f59e0b' },
                { k: 'lessons' as const,     label: 'LESSON',       emoji: '💡', accent: '#a78bfa' },
                { k: 'intentions' as const,  label: 'NEXT 7 DAYS',  emoji: '🎯', accent: '#D4AF37' },
                { k: 'gratitude' as const,   label: 'YOUR CIRCLE',  emoji: '🤝', accent: '#38bdf8' },
              ].map(({ k, label, emoji, accent }) => (
                <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: accent, opacity: 0.8 }}>{emoji} {label}</span>
                  <textarea
                    value={form[k]}
                    onChange={set(k)}
                    rows={3}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}20`, borderRadius: 10, padding: '10px 12px', color: '#EFEFEF', fontSize: 13, fontFamily: 'Satoshi,sans-serif', fontWeight: 300, lineHeight: 1.65, resize: 'vertical', outline: 'none' }}
                  />
                </label>
              ))}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg,#D4AF37,#9A7010)', border: 'none', color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
                >
                  {isPending ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setMode('view')}
                  style={{ padding: '12px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.50)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : mode === 'confirmDelete' ? (
            /* ── DELETE CONFIRM ── */
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.58)', marginBottom: 16 }}>Permanently delete Chapter {chapterNum}?</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  style={{ padding: '10px 22px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
                >
                  {isPending ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setMode('view')}
                  style={{ padding: '10px 22px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.50)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ── VIEW MODE ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {a.wins       && <Field label="WINS"        emoji="🏆" content={a.wins}       accent="#22c55e" />}
              {a.challenges && <Field label="CHALLENGES"  emoji="⚡" content={a.challenges} accent="#f59e0b" />}
              {a.lessons    && <Field label="LESSON"      emoji="💡" content={a.lessons}    accent="#a78bfa" />}
              {a.intentions && <Field label="NEXT 7 DAYS" emoji="🎯" content={a.intentions} accent="#D4AF37" />}
              {a.gratitude  && <Field label="YOUR CIRCLE" emoji="🤝" content={a.gratitude}  accent="#38bdf8" />}

              {/* Edit / Delete row */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 6 }}>
                <button
                  onClick={() => setMode('edit')}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.58)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                <button
                  onClick={() => setMode('confirmDelete')}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
