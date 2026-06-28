'use client'
import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createJournalEntry } from './actions'
import { getTodayQod } from '@/lib/qod'

type JournalEntry = {
  id: string
  type: 'gratitude' | 'cbt' | 'write' | 'checkin' | null
  content: Record<string, string>
  created_at: string
}

type Tab = 'checkin' | 'gratitude' | 'cbt' | 'write'

const MOODS = ['😞','😕','😐','🙂','😄']
const MOOD_LABELS = ['Rough','Low','Okay','Good','Great']

const DISTORTIONS = [
  { name: 'All-or-Nothing',          desc: 'Seeing only extremes — perfect or a total failure, no middle ground.' },
  { name: 'Overgeneralization',      desc: 'One bad event becomes a pattern: "I always fail," "This never works."' },
  { name: 'Mental Filter',           desc: 'Locking onto one negative detail while filtering out everything positive.' },
  { name: 'Disqualifying Positives', desc: 'Dismissing good things: "That doesn\'t count," "I just got lucky."' },
  { name: 'Mind Reading',            desc: 'Assuming you know what others think — without any real evidence.' },
  { name: 'Fortune Telling',         desc: 'Predicting a bad outcome as though it\'s already certain.' },
  { name: 'Catastrophizing',         desc: 'Magnifying a problem into the worst possible disaster.' },
  { name: 'Emotional Reasoning',     desc: '"I feel anxious, so something must be wrong." Feelings treated as facts.' },
  { name: 'Should Statements',       desc: 'Rigid self-rules using "must," "should," or "have to" that breed guilt.' },
  { name: 'Labeling',                desc: 'Attaching a global negative label: "I\'m a failure," "I\'m an idiot."' },
  { name: 'Minimization',            desc: 'Shrinking your positives, strengths, or wins until they feel meaningless.' },
  { name: 'Personalization',         desc: 'Taking full blame for things partly or wholly outside your control.' },
]

const WRITE_PROMPTS = [
  "What's one thing I did today that I'm proud of?",
  "What am I avoiding and why?",
  "What would I tell a friend in my exact situation?",
  "What does the best version of my day look like?",
]

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function JournalClient({ entries }: { entries: JournalEntry[] }) {
  const [tab, setTab] = useState<Tab>('checkin')

  const checkinEntries  = entries.filter(e => e.type === 'checkin')
  const gratitudeEntries = entries.filter(e => e.type === 'gratitude')
  const cbtEntries       = entries.filter(e => e.type === 'cbt')
  const writeEntries     = entries.filter(e => e.type === 'write')

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }} className="view-panel">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>PERSONAL TOOLS</p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1 }}>Your private<br />space.</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span style={{ fontSize: 10, color: '#555', fontWeight: 600, letterSpacing: '0.04em' }}>PRIVATE</span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#555', fontWeight: 300, marginBottom: 24 }}>Only you can ever see this. Never shared with your Circle.</p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
        <button onClick={() => setTab('checkin')}  className={`comm-tab${tab === 'checkin'  ? ' active' : ''}`}>✅ Check-in</button>
        <button onClick={() => setTab('gratitude')} className={`comm-tab${tab === 'gratitude' ? ' active' : ''}`}>🌸 Gratitude</button>
        <button onClick={() => setTab('cbt')}       className={`comm-tab${tab === 'cbt'       ? ' active' : ''}`}>🧠 CBT</button>
        <button onClick={() => setTab('write')}     className={`comm-tab${tab === 'write'     ? ' active' : ''}`}>✍️ Write</button>
      </div>

      {tab === 'checkin'  && <CheckinTab   entries={checkinEntries} />}
      {tab === 'gratitude' && <GratitudeTab entries={gratitudeEntries} />}
      {tab === 'cbt'       && <CBTTab       entries={cbtEntries} />}
      {tab === 'write'     && <WriteTab     entries={writeEntries} />}
    </div>
  )
}

/* ─── DAILY CHECK-IN TAB ─── */
const ENERGY_COLOR = (n: number) => n <= 3 ? '#f87171' : n <= 6 ? '#fbbf24' : '#4ade80'
const checkinDraftKey = (section: string) => `cc_draft_checkin_${section}`

function CheckinTab({ entries }: { entries: JournalEntry[] }) {
  const [section, setSection] = useState<'morning' | 'evening'>('morning')
  const [mood, setMood] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [draftKey, setDraftKey] = useState(0)
  const router = useRouter()

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const todayKey = new Date().toISOString().split('T')[0]
  const qod = getTodayQod()

  useEffect(() => {
    const saved = localStorage.getItem(checkinDraftKey(section))
    if (saved) {
      try {
        const { fields, mood: m } = JSON.parse(saved)
        if (fields) { setDraft(fields); setDraftKey(k => k + 1) }
        if (m) setMood(m)
      } catch { /* ignore */ }
    } else {
      setDraft({})
      setDraftKey(k => k + 1)
      setMood(null)
    }
  }, [section])

  function saveDraft(e: React.ChangeEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget)
    const fields: Record<string, string> = {}
    fd.forEach((v, k) => { if (typeof v === 'string') fields[k] = v })
    localStorage.setItem(checkinDraftKey(section), JSON.stringify({ fields, mood }))
  }

  function clearDraft() {
    localStorage.removeItem(checkinDraftKey(section))
    setDraft({})
    setMood(null)
    setDraftKey(k => k + 1)
  }
  const todayEntries = entries.filter(e => e.created_at.startsWith(todayKey))
  const morningDone = todayEntries.some(e => e.content.checkin_type === 'morning')
  const eveningDone = todayEntries.some(e => e.content.checkin_type === 'evening')

  function handleMoodSelect(m: number) {
    const next = mood === m ? null : m
    setMood(next)
    const saved = localStorage.getItem(checkinDraftKey(section))
    const existing = saved ? JSON.parse(saved) : {}
    localStorage.setItem(checkinDraftKey(section), JSON.stringify({ ...existing, mood: next }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.set('type', 'checkin')
    formData.set('checkin_type', section)
    formData.set('mood', mood ? String(mood) : '')
    startTransition(async () => {
      const result = await createJournalEntry(formData)
      if (result.error) { setError(result.error); return }
      clearDraft()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    })
  }

  return (
    <div>
      {/* Date header */}
      <div style={{ marginBottom: 20, padding: '16px 20px', borderRadius: 18, background: 'linear-gradient(135deg,rgba(212,175,55,0.07),rgba(212,175,55,0.03))', border: '1px solid rgba(212,175,55,0.15)' }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 4, opacity: 0.7 }}>TODAY</p>
        <p style={{ fontSize: 18, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em' }}>{todayStr}</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: morningDone ? '#4ade80' : '#333' }} />
            <span style={{ fontSize: 11, color: morningDone ? '#4ade80' : '#444', fontWeight: 600 }}>Morning</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: eveningDone ? '#4ade80' : '#333' }} />
            <span style={{ fontSize: 11, color: eveningDone ? '#4ade80' : '#444', fontWeight: 600 }}>Evening</span>
          </div>
        </div>
      </div>

      {/* Section toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 4 }}>
        <button onClick={() => setSection('morning')} className={`comm-tab${section === 'morning' ? ' active' : ''}`}>🌅 Morning</button>
        <button onClick={() => setSection('evening')} className={`comm-tab${section === 'evening' ? ' active' : ''}`}>🌙 Evening</button>
      </div>

      {/* Form */}
      <form key={draftKey} autoComplete="off" onSubmit={handleSubmit} onChange={saveDraft} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Mood */}
        <div style={{ padding: '16px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#D4AF37', marginBottom: 14 }}>HOW ARE YOU FEELING?</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {MOODS.map((emoji, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <button type="button" className={`mood-btn${mood === i + 1 ? ' sel' : ''}`} onClick={() => handleMoodSelect(i + 1)}>
                  {emoji}
                </button>
                <span style={{ fontSize: 9, color: '#444', fontWeight: 600 }}>{MOOD_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {section === 'morning' ? (
          <>
            <div style={{ borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg,rgba(212,175,55,0.09),rgba(212,175,55,0.04))', border: '1px solid rgba(212,175,55,0.2)' }}>
              <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{qod.emoji}</span>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#D4AF37', marginBottom: 2 }}>QUESTION OF THE DAY · {qod.label.toUpperCase()}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.4 }}>{qod.q}</p>
                </div>
              </div>
              <textarea name="qod_answer" autoComplete="off" defaultValue={draft.qod_answer || ''} placeholder="Take a moment. Be honest…" rows={3} className="cc-input" style={{ fontSize: 13, resize: 'none', borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', borderTop: '1px solid rgba(212,175,55,0.15)', background: 'rgba(0,0,0,0.2)', lineHeight: 1.6 }} />
              <input type="hidden" name="qod_question" value={qod.q} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#38bdf8', marginBottom: 8 }}>🎯 TODAY&apos;S INTENTION</label>
              <input name="intention" autoComplete="off" defaultValue={draft.intention || ''} placeholder="What's your main focus today?" className="cc-input" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>TOP 3 TASKS</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input name="task1" autoComplete="off" defaultValue={draft.task1 || ''} placeholder="1. Most important thing today…" className="cc-input" style={{ fontSize: 13 }} />
                <input name="task2" autoComplete="off" defaultValue={draft.task2 || ''} placeholder="2. Second priority…" className="cc-input" style={{ fontSize: 13 }} />
                <input name="task3" autoComplete="off" defaultValue={draft.task3 || ''} placeholder="3. Third priority…" className="cc-input" style={{ fontSize: 13 }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>ONE THING I&apos;M EXCITED ABOUT</label>
              <input name="excited" autoComplete="off" defaultValue={draft.excited || ''} placeholder="Something to look forward to today…" className="cc-input" style={{ fontSize: 13 }} />
            </div>
          </>
        ) : (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#4ade80', marginBottom: 8 }}>🏆 BIGGEST WIN TODAY</label>
              <input name="win" autoComplete="off" defaultValue={draft.win || ''} placeholder="What went well or what are you proud of?" className="cc-input" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', marginBottom: 8 }}>⚡ BIGGEST CHALLENGE</label>
              <input name="challenge" autoComplete="off" defaultValue={draft.challenge || ''} placeholder="What was hard today?" className="cc-input" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#a78bfa', marginBottom: 8 }}>💡 WHAT I LEARNED</label>
              <textarea name="lesson" autoComplete="off" defaultValue={draft.lesson || ''} placeholder="Something today taught me…" rows={2} className="cc-input" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>
                ⚡ ENERGY LEVEL <span style={{ color: '#EFEFEF', marginLeft: 6 }} id="energy-display">5/10</span>
              </label>
              <input type="range" name="energy" min="1" max="10" defaultValue="5" style={{ width: '100%', accentColor: '#D4AF37', cursor: 'pointer' }}
                onInput={e => {
                  const v = (e.target as HTMLInputElement).value
                  const el = document.getElementById('energy-display')
                  if (el) { el.textContent = v + '/10'; el.style.color = ENERGY_COLOR(parseInt(v)) }
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#333', marginTop: 2 }}>
                <span>Drained</span><span>Neutral</span><span>Energized</span>
              </div>
            </div>
          </>
        )}

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>{error}</p>
          </div>
        )}
        <button type="submit" disabled={isPending} className="btn-gold" style={{ marginTop: 4 }}>
          {saved ? '✓ SAVED' : isPending ? 'SAVING…' : `SAVE ${section.toUpperCase()} CHECK-IN`}
        </button>
      </form>

      {/* Past check-ins */}
      {entries.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#555', marginBottom: 12 }}>PAST CHECK-INS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map(e => {
              const c = e.content
              const isMorning = c.checkin_type === 'morning'
              const moodNum = c.mood ? parseInt(c.mood) : null
              const accent = isMorning ? '#38bdf8' : '#a78bfa'
              return (
                <div key={e.id} className="journal-entry" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{isMorning ? '🌅' : '🌙'}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: accent }}>{isMorning ? 'MORNING' : 'EVENING'}</span>
                      {moodNum && moodNum >= 1 && moodNum <= 5 && <span style={{ fontSize: 14 }}>{MOODS[moodNum - 1]}</span>}
                    </div>
                    <span style={{ fontSize: 10, color: '#444' }}>{formatDate(e.created_at)}</span>
                  </div>
                  {isMorning ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {c.qod_answer && (
                        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(212,175,55,0.06)', borderLeft: '2px solid rgba(212,175,55,0.3)', marginBottom: 4 }}>
                          <p style={{ fontSize: 10, color: '#D4AF37', fontWeight: 700, marginBottom: 3 }}>Q OF THE DAY</p>
                          <p style={{ fontSize: 11, color: '#777', fontWeight: 300, fontStyle: 'italic' }}>&ldquo;{c.qod_answer}&rdquo;</p>
                        </div>
                      )}
                      {c.intention && <p style={{ fontSize: 12, color: '#D4AF37', fontWeight: 600 }}>🎯 {c.intention}</p>}
                      {[c.task1, c.task2, c.task3].filter(Boolean).map((t, i) => (
                        <p key={i} style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>{i + 1}. {t}</p>
                      ))}
                      {c.excited && <p style={{ fontSize: 12, color: '#777', fontStyle: 'italic' }}>Looking forward to: {c.excited}</p>}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {c.win && <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 600 }}>🏆 {c.win}</p>}
                      {c.challenge && <p style={{ fontSize: 12, color: '#888', fontWeight: 300 }}>⚡ {c.challenge}</p>}
                      {c.lesson && <p style={{ fontSize: 12, color: '#a78bfa', fontWeight: 300 }}>💡 {c.lesson}</p>}
                      {c.energy && <p style={{ fontSize: 11, color: ENERGY_COLOR(parseInt(c.energy)), fontWeight: 700 }}>Energy: {c.energy}/10</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── GRATITUDE TAB ─── */
const GRATITUDE_DRAFT_KEY = 'cc_draft_gratitude'

function GratitudeTab({ entries }: { entries: JournalEntry[] }) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [draftKey, setDraftKey] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem(GRATITUDE_DRAFT_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Object.values(parsed).some((v) => (v as string).trim())) {
          setDraft(parsed)
          setDraftKey(k => k + 1)
          setShowForm(true)
        }
      } catch { /* ignore */ }
    }
  }, [])

  function saveDraft(e: React.ChangeEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget)
    const d: Record<string, string> = {}
    fd.forEach((v, k) => { if (typeof v === 'string') d[k] = v })
    localStorage.setItem(GRATITUDE_DRAFT_KEY, JSON.stringify(d))
  }

  function clearDraft() {
    localStorage.removeItem(GRATITUDE_DRAFT_KEY)
    setDraft({})
  }

  function handleSubmit(formData: FormData) {
    setError('')
    formData.set('type', 'gratitude')
    startTransition(async () => {
      const result = await createJournalEntry(formData)
      if (result.error) { setError(result.error); return }
      clearDraft()
      setShowForm(false)
      router.refresh()
    })
  }

  return (
    <div>
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn-gold" style={{ marginBottom: 20 }}>
          + TODAY&apos;S GRATITUDE ENTRY
        </button>
      )}

      {showForm && (
        <div className="card" style={{ padding: 22, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF' }}>Today&apos;s Entry</p>
            <p style={{ fontSize: 11, color: '#555' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <form key={draftKey} autoComplete="off" action={handleSubmit} onChange={saveDraft} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#D4AF37', marginBottom: 8 }}>3 THINGS I&apos;M GRATEFUL FOR</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input type="text" name="g1" defaultValue={draft.g1 || ''} placeholder="1. Something or someone I'm grateful for..." className="cc-input" style={{ fontSize: 13 }} />
                <input type="text" name="g2" defaultValue={draft.g2 || ''} placeholder="2. Something I often overlook..." className="cc-input" style={{ fontSize: 13 }} />
                <input type="text" name="g3" defaultValue={draft.g3 || ''} placeholder="3. Something that happened today..." className="cc-input" style={{ fontSize: 13 }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>ONE WIN FROM TODAY</label>
              <input type="text" name="win" defaultValue={draft.win || ''} placeholder="Something I did well or pushed through..." className="cc-input" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#777', marginBottom: 8 }}>ONE THING I&apos;M LOOKING FORWARD TO</label>
              <input type="text" name="lookForward" defaultValue={draft.lookForward || ''} placeholder="Something coming up that excites me..." className="cc-input" style={{ fontSize: 13 }} />
            </div>
            {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => { clearDraft(); setShowForm(false) }} className="btn-ghost" style={{ width: 'auto', padding: '12px 18px' }}>Cancel</button>
              <button type="submit" disabled={isPending} className="btn-gold">{isPending ? 'SAVING...' : 'SAVE ENTRY'}</button>
            </div>
          </form>
        </div>
      )}

      {entries.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#D4AF37', marginBottom: 12 }}>PAST ENTRIES</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map(e => {
              const c = e.content
              return (
                <div key={e.id} className="journal-entry" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37' }}>{formatDate(e.created_at)}</p>
                    <span style={{ fontSize: 10, background: 'rgba(212,175,55,0.08)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.18)', borderRadius: 6, padding: '2px 8px' }}>🌸 GRATITUDE</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {(['g1','g2','g3'] as const).filter(k => c[k]).map(k => (
                      <li key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ color: '#D4AF37', fontSize: 11, flexShrink: 0 }}>✦</span>
                        <p style={{ fontSize: 13, color: '#AAA', fontWeight: 300, lineHeight: 1.5 }}>{c[k]}</p>
                      </li>
                    ))}
                  </ul>
                  {c.win && <p style={{ fontSize: 11, color: '#4ade80', fontWeight: 600, marginBottom: 3 }}>Win: <span style={{ fontWeight: 300, color: '#888' }}>{c.win}</span></p>}
                  {c.lookForward && <p style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>Looking forward: <span style={{ fontWeight: 300, color: '#888' }}>{c.lookForward}</span></p>}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── CBT TAB ─── */
const CBT_DRAFT_KEY = 'cc_draft_cbt'

function CBTTab({ entries }: { entries: JournalEntry[] }) {
  const [showForm, setShowForm] = useState(false)
  const [openSection, setOpenSection] = useState(-1)
  const [selectedDistortions, setSelectedDistortions] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [draftKey, setDraftKey] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem(CBT_DRAFT_KEY)
    if (saved) {
      try {
        const { fields, distortions } = JSON.parse(saved)
        const hasContent = fields && Object.values(fields).some((v) => (v as string).trim())
        if (hasContent) {
          setDraft(fields)
          setDraftKey(k => k + 1)
          setShowForm(true)
          if (distortions?.length) setSelectedDistortions(distortions)
        }
      } catch { /* ignore */ }
    }
  }, [])

  function saveDraft(e: React.ChangeEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget)
    const fields: Record<string, string> = {}
    fd.forEach((v, k) => { if (typeof v === 'string') fields[k] = v })
    localStorage.setItem(CBT_DRAFT_KEY, JSON.stringify({ fields, distortions: selectedDistortions }))
  }

  function clearDraft() {
    localStorage.removeItem(CBT_DRAFT_KEY)
    setDraft({})
    setSelectedDistortions([])
  }

  function toggleDistortion(name: string) {
    setSelectedDistortions(prev => {
      const next = prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]
      const saved = localStorage.getItem(CBT_DRAFT_KEY)
      const existing = saved ? JSON.parse(saved) : {}
      localStorage.setItem(CBT_DRAFT_KEY, JSON.stringify({ ...existing, distortions: next }))
      return next
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.set('type', 'cbt')
    formData.set('distortions', selectedDistortions.join(','))
    startTransition(async () => {
      const result = await createJournalEntry(formData)
      if (result.error) { setError(result.error); return }
      clearDraft()
      setShowForm(false)
      setOpenSection(-1)
      router.refresh()
    })
  }

  const toggle = (i: number) => setOpenSection(prev => prev === i ? -1 : i)

  return (
    <div>
      {!showForm && (
        <>
          <button onClick={() => setShowForm(true)} className="btn-gold" style={{ marginBottom: 6 }}>+ NEW CBT ENTRY</button>
          <p style={{ fontSize: 11, color: '#555', fontWeight: 300, lineHeight: 1.65, marginBottom: 20 }}>Reframe a difficult thought using cognitive behavioral techniques.</p>
        </>
      )}

      {showForm && (
        <div className="card" style={{ padding: 22, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF' }}>New Entry</p>
            <p style={{ fontSize: 11, color: '#555' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <form key={draftKey} autoComplete="off" onSubmit={handleSubmit} onChange={saveDraft} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Section 1: Situation */}
            <div className={`cbt-section${openSection === 0 ? ' open' : ''}`}>
              <button type="button" className="cbt-section-header" onClick={() => toggle(0)}>
                <span style={{ fontSize: 18 }}>🔍</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF' }}>Situation</p>
                  <p style={{ fontSize: 11, color: '#555', fontWeight: 300, marginTop: 1 }}>What happened?</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openSection === 0 ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {openSection === 0 && (
                <div style={{ padding: '0 16px 14px' }}>
                  <textarea name="situation" defaultValue={draft.situation || ''} placeholder="Describe what happened. Just the facts — no interpretation yet." rows={3} className="cc-input" style={{ fontSize: 13 }} />
                </div>
              )}
            </div>

            {/* Section 2: Automatic Thought */}
            <div className={`cbt-section${openSection === 1 ? ' open' : ''}`}>
              <button type="button" className="cbt-section-header" onClick={() => toggle(1)}>
                <span style={{ fontSize: 18 }}>💭</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF' }}>Automatic Thought</p>
                  <p style={{ fontSize: 11, color: '#555', fontWeight: 300, marginTop: 1 }}>What went through your mind?</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openSection === 1 ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {openSection === 1 && (
                <div style={{ padding: '0 16px 14px' }}>
                  <textarea name="thought" defaultValue={draft.thought || ''} placeholder='What thought immediately showed up? (e.g. "I always fail", "They must hate me")' rows={3} className="cc-input" style={{ fontSize: 13, marginBottom: 16 }} />
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#a78bfa', marginBottom: 4 }}>COGNITIVE DISTORTION</label>
                  <p style={{ fontSize: 11, color: '#555', fontWeight: 300, lineHeight: 1.55, marginBottom: 10 }}>Which thinking pattern might be driving this? Tap all that apply.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {DISTORTIONS.map(d => (
                      <button key={d.name} type="button" onClick={() => toggleDistortion(d.name)}
                        style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', background: selectedDistortions.includes(d.name) ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)', color: selectedDistortions.includes(d.name) ? '#a78bfa' : '#666', border: selectedDistortions.includes(d.name) ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.07)' }}>
                        {d.name}
                      </button>
                    ))}
                  </div>
                  {selectedDistortions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {selectedDistortions.map(name => {
                        const d = DISTORTIONS.find(x => x.name === name)
                        return d ? (
                          <div key={name} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.05)', borderLeft: '2px solid rgba(139,92,246,0.3)' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 2 }}>{name}</p>
                            <p style={{ fontSize: 11, color: '#777', fontWeight: 300, lineHeight: 1.5 }}>{d.desc}</p>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Emotion */}
            <div className={`cbt-section${openSection === 2 ? ' open' : ''}`}>
              <button type="button" className="cbt-section-header" onClick={() => toggle(2)}>
                <span style={{ fontSize: 18 }}>❤️</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF' }}>Emotion</p>
                  <p style={{ fontSize: 11, color: '#555', fontWeight: 300, marginTop: 1 }}>How did that make you feel?</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openSection === 2 ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {openSection === 2 && (
                <div style={{ padding: '0 16px 14px' }}>
                  <input type="text" name="emotion" defaultValue={draft.emotion || ''} placeholder="Name the emotion (e.g. shame, anxiety, anger)" className="cc-input" style={{ fontSize: 13, marginBottom: 10 }} />
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#777', marginBottom: 8 }}>INTENSITY (1–10)</label>
                  <input type="range" name="intensity" min="1" max="10" defaultValue="5" style={{ width: '100%', accentColor: '#a78bfa', cursor: 'pointer' }} />
                </div>
              )}
            </div>

            {/* Section 4: Evidence */}
            <div className={`cbt-section${openSection === 3 ? ' open' : ''}`}>
              <button type="button" className="cbt-section-header" onClick={() => toggle(3)}>
                <span style={{ fontSize: 18 }}>⚖️</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF' }}>Evidence</p>
                  <p style={{ fontSize: 11, color: '#555', fontWeight: 300, marginTop: 1 }}>For and against the thought</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openSection === 3 ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {openSection === 3 && (
                <div style={{ padding: '0 16px 14px' }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#f87171', marginBottom: 6 }}>SUPPORTS THE THOUGHT</label>
                  <textarea name="evidenceFor" defaultValue={draft.evidenceFor || ''} placeholder="Facts that back up this thought..." rows={2} className="cc-input" style={{ fontSize: 13, marginBottom: 10 }} />
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#4ade80', marginBottom: 6 }}>CHALLENGES THE THOUGHT</label>
                  <textarea name="evidenceAgainst" defaultValue={draft.evidenceAgainst || ''} placeholder="Facts, past experiences, or context that contradict this thought..." rows={2} className="cc-input" style={{ fontSize: 13 }} />
                </div>
              )}
            </div>

            {/* Section 5: Reframe */}
            <div className={`cbt-section${openSection === 4 ? ' open' : ''}`}>
              <button type="button" className="cbt-section-header" onClick={() => toggle(4)}>
                <span style={{ fontSize: 18 }}>✨</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF' }}>Balanced Perspective</p>
                  <p style={{ fontSize: 11, color: '#555', fontWeight: 300, marginTop: 1 }}>A more balanced view</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openSection === 4 ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {openSection === 4 && (
                <div style={{ padding: '0 16px 14px' }}>
                  <textarea name="balanced" defaultValue={draft.balanced || ''} placeholder="Write a balanced thought that accounts for both sides. Not toxic positivity — just accuracy." rows={3} className="cc-input" style={{ fontSize: 13, marginBottom: 10 }} />
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#777', marginBottom: 6 }}>HOW DO YOU FEEL NOW? (1–10)</label>
                  <input type="range" name="outcome" min="1" max="10" defaultValue="5" style={{ width: '100%', accentColor: '#4ade80', cursor: 'pointer' }} />
                </div>
              )}
            </div>

            {error && <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => { clearDraft(); setShowForm(false); setOpenSection(-1) }} className="btn-ghost" style={{ width: 'auto', padding: '12px 18px' }}>Cancel</button>
              <button type="submit" disabled={isPending} className="btn-gold">{isPending ? 'SAVING...' : 'SAVE ENTRY'}</button>
            </div>
          </form>
        </div>
      )}

      {entries.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#a78bfa', marginBottom: 12 }}>PAST ENTRIES</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map(e => {
              const c = e.content
              const dists = c.distortions ? c.distortions.split(',').filter(Boolean) : []
              return (
                <div key={e.id} className="journal-entry" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>{formatDate(e.created_at)}</p>
                    <span style={{ fontSize: 10, background: 'rgba(139,92,246,0.08)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 6, padding: '2px 8px' }}>🧠 CBT</span>
                  </div>
                  {c.thought && <p style={{ fontSize: 13, fontWeight: 600, color: '#EFEFEF', marginBottom: 4 }}>&quot;{c.thought}&quot;</p>}
                  {c.situation && <p style={{ fontSize: 12, color: '#777', fontWeight: 300, lineHeight: 1.55, marginBottom: 8 }}>{c.situation}</p>}
                  {dists.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                      {dists.map(d => (
                        <span key={d} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 6, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.22)', fontWeight: 600 }}>{d}</span>
                      ))}
                    </div>
                  )}
                  {c.balanced && (
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.06)', borderLeft: '2px solid rgba(139,92,246,0.3)' }}>
                      <p style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, marginBottom: 3 }}>REFRAME</p>
                      <p style={{ fontSize: 12, color: '#AAA', fontWeight: 300, lineHeight: 1.55 }}>{c.balanced}</p>
                    </div>
                  )}
                  {(c.intensity || c.outcome) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                      {c.intensity && <p style={{ fontSize: 11, color: '#555' }}>Emotion intensity: <span style={{ color: '#f87171', fontWeight: 700 }}>{c.intensity}/10</span></p>}
                      {c.intensity && c.outcome && <span style={{ color: '#555' }}>→</span>}
                      {c.outcome && <p style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>{c.outcome}/10 after</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── WRITE TAB ─── */
const WRITE_DRAFT_KEY = 'cc_draft_write'

function WriteTab({ entries }: { entries: JournalEntry[] }) {
  const [mood, setMood] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem(WRITE_DRAFT_KEY)
    if (saved) {
      try {
        const { text: t, mood: m } = JSON.parse(saved)
        if (t) { setText(t); setFocused(true) }
        if (m) setMood(m)
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (text || mood) {
      localStorage.setItem(WRITE_DRAFT_KEY, JSON.stringify({ text, mood }))
    }
  }, [text, mood])

  function handleSave() {
    if (!text.trim()) return
    setError('')
    const formData = new FormData()
    formData.set('type', 'write')
    formData.set('body', text)
    formData.set('mood', mood ? String(mood) : '')
    startTransition(async () => {
      const result = await createJournalEntry(formData)
      if (result.error) { setError(result.error); return }
      localStorage.removeItem(WRITE_DRAFT_KEY)
      setText('')
      setMood(null)
      setFocused(false)
      router.refresh()
    })
  }

  function discard() {
    localStorage.removeItem(WRITE_DRAFT_KEY)
    setText('')
    setMood(null)
    setFocused(false)
  }

  return (
    <div>
      {/* Mood row */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#D4AF37', marginBottom: 14 }}>HOW ARE YOU FEELING?</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {MOODS.map((emoji, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <button className={`mood-btn${mood === i + 1 ? ' sel' : ''}`} onClick={() => setMood(mood === i + 1 ? null : i + 1)}>
                {emoji}
              </button>
              <span style={{ fontSize: 9, color: '#444', fontWeight: 600 }}>{MOOD_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Free-write area */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${focused ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 16, padding: 18, marginBottom: 16, transition: 'border-color 0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#EFEFEF' }}>FREE WRITE</p>
          <p style={{ fontSize: 10, color: '#444' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <textarea
          ref={textareaRef}
          autoComplete="off"
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="What's on your mind? There are no rules here — just write…"
          rows={6}
          style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#EFEFEF', fontFamily: 'Satoshi,sans-serif', resize: 'none', lineHeight: 1.7, boxSizing: 'border-box' }}
        />
        {(focused || text) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 13 }}>
              {mood ? `${MOODS[mood - 1]} ${MOOD_LABELS[mood - 1]}` : <span style={{ fontSize: 11, color: '#444' }}>Select a mood above</span>}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={discard} style={{ padding: '8px 14px', borderRadius: 9, background: 'transparent', color: '#555', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Discard</button>
              <button onClick={handleSave} disabled={isPending || !text.trim()} style={{ padding: '8px 18px', borderRadius: 9, background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)', fontSize: 12, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'Satoshi,sans-serif', opacity: text.trim() ? 1 : 0.4 }}>
                {isPending ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </div>
        )}
      </div>
      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {/* Writing prompts when empty */}
      {!focused && !text && entries.length === 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#555', marginBottom: 10 }}>WRITING PROMPTS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {WRITE_PROMPTS.map(p => (
              <button key={p} onClick={() => { setText(p + ' '); setFocused(true); textareaRef.current?.focus() }}
                style={{ textAlign: 'left', padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 12, color: '#666', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Past entries */}
      {entries.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#555', marginBottom: 12 }}>PAST ENTRIES</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entries.map(e => {
              const moodNum = e.content.mood ? parseInt(e.content.mood) : null
              return (
                <div key={e.id} className="jfree-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {moodNum && moodNum >= 1 && moodNum <= 5 ? (
                        <>
                          <span style={{ fontSize: 18 }}>{MOODS[moodNum - 1]}</span>
                          <span style={{ fontSize: 10, color: '#666', fontWeight: 600 }}>{MOOD_LABELS[moodNum - 1]}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 10, color: '#555' }}>—</span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: '#444' }}>{formatDate(e.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#BBB', fontWeight: 300, lineHeight: 1.65 }}>{e.content.body}</p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
