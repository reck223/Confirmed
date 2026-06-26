'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createJournalEntry } from './actions'

type JournalEntry = {
  id: string
  type: 'gratitude' | 'cbt' | 'write' | null
  content: Record<string, string>
  created_at: string
}

const TYPE_EMOJI: Record<string, string> = { gratitude: '🙏', write: '✍️', cbt: '🧠' }
const TYPE_LABEL: Record<string, string> = { gratitude: 'Gratitude', write: 'Free Write', cbt: 'Reframe' }
const TYPE_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  gratitude: { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.18)',  text: '#4ade80' },
  write:     { bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.18)', text: '#D4AF37' },
  cbt:       { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)', text: '#a78bfa' },
}

export function JournalClient({ entries }: { entries: JournalEntry[] }) {
  const [showForm, setShowForm] = useState(false)
  const [entryType, setEntryType] = useState<'gratitude' | 'write' | 'cbt'>('gratitude')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    setError('')
    formData.set('type', entryType)
    startTransition(async () => {
      const result = await createJournalEntry(formData)
      if (result.error) { setError(result.error); return }
      setShowForm(false)
      router.refresh()
    })
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }} className="view-panel">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>YOUR JOURNAL</p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            The work<br />within.
          </h1>
          <p style={{ fontSize: 12, color: '#555', fontWeight: 300, marginTop: 6 }}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-gold" style={{ width: 'auto', padding: '10px 18px', fontSize: 11 }}>+ WRITE</button>
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 40, marginBottom: 14 }}>📖</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#EFEFEF', marginBottom: 8 }}>Nothing written yet</p>
          <p style={{ fontSize: 13, color: '#555', fontWeight: 300, marginBottom: 24 }}>Take a moment to reflect. It compounds.</p>
          <button onClick={() => setShowForm(true)} className="btn-gold" style={{ width: 'auto', padding: '12px 24px' }}>WRITE YOUR FIRST ENTRY</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(entry => {
            const c = TYPE_COLOR[entry.type ?? 'write']
            const isOpen = expanded === entry.id
            return (
              <div key={entry.id} className="journal-entry" style={{ cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.18s', borderLeft: `3px solid ${c.border}` }} onClick={() => setExpanded(isOpen ? null : entry.id)}>
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{TYPE_EMOJI[entry.type ?? 'write']}</span>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: c.text }}>{(TYPE_LABEL[entry.type ?? 'write']).toUpperCase()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: '#444' }}>{formatDate(entry.created_at)}</span>
                      <span style={{ fontSize: 14, color: '#444', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>›</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#888', fontWeight: 300, lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: isOpen ? undefined : 2, WebkitBoxOrient: 'vertical' }}>
                    {entryPreview(entry)}
                  </p>
                  {isOpen && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <EntryDetail entry={entry} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Entry Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} className="md:items-center md:p-4" onClick={() => setShowForm(false)}>
          <div style={{ width: '100%', maxWidth: 520, borderRadius: '24px 24px 0 0', background: '#111', border: '1px solid rgba(255,255,255,0.08)', padding: 24, maxHeight: '90vh', overflowY: 'auto' }} className="md:rounded-3xl" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 4 }}>NEW ENTRY</p>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF' }}>Reflect & write</h2>
              </div>
              <button onClick={() => setShowForm(false)} style={{ fontSize: 24, color: '#555', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Type picker */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['gratitude', 'write', 'cbt'] as const).map(t => {
                const tc = TYPE_COLOR[t]
                return (
                  <button key={t} type="button" onClick={() => setEntryType(t)} style={{ flex: 1, padding: '10px 4px', borderRadius: 12, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', background: entryType === t ? tc.bg : 'rgba(255,255,255,0.04)', color: entryType === t ? tc.text : '#555', border: entryType === t ? `1px solid ${tc.border}` : '1px solid rgba(255,255,255,0.07)' }}>
                    {TYPE_EMOJI[t]}<br />{TYPE_LABEL[t]}
                  </button>
                )
              })}
            </div>

            <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {entryType === 'gratitude' && (
                <>
                  <p style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>Name three things you&apos;re grateful for today.</p>
                  <textarea name="one" rows={2} placeholder="I'm grateful for…" className="cc-input" />
                  <textarea name="two" rows={2} placeholder="I'm grateful for…" className="cc-input" />
                  <textarea name="three" rows={2} placeholder="I'm grateful for…" className="cc-input" />
                </>
              )}
              {entryType === 'write' && (
                <>
                  <p style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>Free write. No rules.</p>
                  <textarea name="body" rows={8} placeholder="Start writing…" className="cc-input" />
                </>
              )}
              {entryType === 'cbt' && (
                <>
                  <p style={{ fontSize: 12, color: '#555', fontWeight: 300 }}>Examine a thought that&apos;s bothering you.</p>
                  <LabeledField name="thought" label="THE THOUGHT" placeholder="e.g. I'll never be good enough" />
                  <LabeledField name="evidence_for" label="EVIDENCE FOR IT" placeholder="What supports this belief?" />
                  <LabeledField name="evidence_against" label="EVIDENCE AGAINST IT" placeholder="What contradicts this belief?" />
                  <LabeledField name="balanced" label="A MORE BALANCED VIEW" placeholder="What's a fairer way to see this?" />
                </>
              )}

              {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
              <button type="submit" disabled={isPending} className="btn-gold" style={{ marginTop: 8 }}>
                {isPending ? 'SAVING...' : 'SAVE ENTRY'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function EntryDetail({ entry }: { entry: JournalEntry }) {
  const c = entry.content
  if (entry.type === 'gratitude') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['one', 'two', 'three'].filter(k => c[k]).map((k, i) => (
          <p key={k} style={{ fontSize: 13, color: '#EFEFEF', fontWeight: 300, lineHeight: 1.6 }}>
            <span style={{ color: '#D4AF37', fontWeight: 700 }}>{i + 1}.</span> {c[k]}
          </p>
        ))}
      </div>
    )
  }
  if (entry.type === 'write') {
    return <p style={{ fontSize: 13, color: '#AAA', fontWeight: 300, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{c.body}</p>
  }
  if (entry.type === 'cbt') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[['THOUGHT', 'thought'], ['EVIDENCE FOR', 'evidence_for'], ['EVIDENCE AGAINST', 'evidence_against'], ['BALANCED VIEW', 'balanced']].filter(([, k]) => c[k]).map(([label, k]) => (
          <div key={k}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#555', marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 13, color: '#AAA', fontWeight: 300, lineHeight: 1.6 }}>{c[k]}</p>
          </div>
        ))}
      </div>
    )
  }
  return null
}

function LabeledField({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <div>
      <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#555', display: 'block', marginBottom: 8 }}>{label}</label>
      <textarea name={name} rows={3} placeholder={placeholder} className="cc-input" />
    </div>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function entryPreview(entry: JournalEntry): string {
  const c = entry.content
  if (entry.type === 'gratitude') return c.one || ''
  if (entry.type === 'write') return c.body || ''
  if (entry.type === 'cbt') return c.thought || ''
  return ''
}
