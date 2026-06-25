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
    <div className="max-w-[600px] mx-auto px-5 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#EFEFEF] tracking-tight">Journal</h1>
          <p className="text-sm text-[#555] mt-0.5">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black text-xs font-black tracking-wider"
        >
          + WRITE
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📖</p>
          <p className="font-bold text-[#EFEFEF] mb-1">Nothing written yet</p>
          <p className="text-sm text-[#555] mb-5">Take a moment to reflect. It compounds.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black text-xs font-black tracking-wider"
          >
            WRITE YOUR FIRST ENTRY
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map(entry => (
            <div
              key={entry.id}
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 cursor-pointer hover:border-white/[0.1] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{typeEmoji[entry.type ?? 'write']}</span>
                  <span className="text-[9px] font-black tracking-wider text-[#555]">{typeLabel[entry.type ?? 'write']}</span>
                </div>
                <span className="text-xs text-[#444]">{formatDate(entry.created_at)}</span>
              </div>

              <p className="text-sm text-[#EFEFEF]/70 leading-relaxed truncate">{entryPreview(entry)}</p>

              {expanded === entry.id && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <EntryDetail entry={entry} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
          <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl bg-[#111] border border-white/[0.08] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-[#EFEFEF]">New Entry</h2>
              <button onClick={() => setShowForm(false)} className="text-[#555] hover:text-[#EFEFEF] text-2xl leading-none">×</button>
            </div>

            {/* Type picker */}
            <div className="flex gap-2 mb-5">
              {(['gratitude', 'write', 'cbt'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEntryType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black tracking-wide transition-all ${
                    entryType === t
                      ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30'
                      : 'bg-white/[0.04] text-[#555] border border-white/[0.06] hover:text-[#EFEFEF]'
                  }`}
                >
                  {typeEmoji[t]} {typeLabel[t]}
                </button>
              ))}
            </div>

            <form action={handleSubmit} className="flex flex-col gap-4">
              {entryType === 'gratitude' && (
                <>
                  <p className="text-xs text-[#555]">Name three things you&apos;re grateful for today.</p>
                  <Textarea name="one" placeholder="I'm grateful for..." />
                  <Textarea name="two" placeholder="I'm grateful for..." />
                  <Textarea name="three" placeholder="I'm grateful for..." />
                </>
              )}
              {entryType === 'write' && (
                <>
                  <p className="text-xs text-[#555]">Free write. No rules.</p>
                  <Textarea name="body" placeholder="Start writing..." rows={8} />
                </>
              )}
              {entryType === 'cbt' && (
                <>
                  <p className="text-xs text-[#555]">Examine a thought that&apos;s bothering you.</p>
                  <LabeledField name="thought" label="THE THOUGHT" placeholder="e.g. I'll never be good enough" />
                  <LabeledField name="evidence_for" label="EVIDENCE FOR IT" placeholder="What supports this belief?" />
                  <LabeledField name="evidence_against" label="EVIDENCE AGAINST IT" placeholder="What contradicts this belief?" />
                  <LabeledField name="balanced" label="A MORE BALANCED VIEW" placeholder="What's a fairer, more realistic way to see this?" />
                </>
              )}

              {error && <p className="text-sm text-rose-400">{error}</p>}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black text-xs font-black tracking-wider disabled:opacity-50 mt-2"
              >
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
      <div className="flex flex-col gap-2">
        {['one', 'two', 'three'].filter(k => c[k]).map((k, i) => (
          <p key={k} className="text-sm text-[#EFEFEF]/80"><span className="text-[#D4AF37] font-bold">{i + 1}.</span> {c[k]}</p>
        ))}
      </div>
    )
  }
  if (entry.type === 'write') {
    return <p className="text-sm text-[#EFEFEF]/80 leading-relaxed whitespace-pre-wrap">{c.body}</p>
  }
  if (entry.type === 'cbt') {
    return (
      <div className="flex flex-col gap-3">
        {[['THOUGHT', 'thought'], ['EVIDENCE FOR', 'evidence_for'], ['EVIDENCE AGAINST', 'evidence_against'], ['BALANCED VIEW', 'balanced']].filter(([, k]) => c[k]).map(([label, k]) => (
          <div key={k}>
            <p className="text-[9px] font-black tracking-[0.14em] text-[#555] mb-1">{label}</p>
            <p className="text-sm text-[#EFEFEF]/80">{c[k]}</p>
          </div>
        ))}
      </div>
    )
  }
  return null
}

function Textarea({ name, placeholder, rows = 2 }: { name: string; placeholder: string; rows?: number }) {
  return (
    <textarea
      name={name}
      rows={rows}
      placeholder={placeholder}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#444] focus:outline-none focus:border-[#D4AF37]/50 resize-none"
    />
  )
}

function LabeledField({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <div>
      <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">{label}</label>
      <Textarea name={name} placeholder={placeholder} rows={3} />
    </div>
  )
}

const typeEmoji: Record<string, string> = { gratitude: '🙏', write: '✍️', cbt: '🧠' }
const typeLabel: Record<string, string> = { gratitude: 'Gratitude', write: 'Free Write', cbt: 'Reframe' }

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
