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

type Tab = 'checkin' | 'gratitude' | 'cbt' | 'write' | 'letters'
type Letter = { id: string; title: string | null; why_it_matters: string | null; deadline: string | null; created_at: string }

const MOODS = ['😞','😕','😐','🙂','😄']
const MOOD_LABELS = ['Rough','Low','Okay','Good','Great']
const MOOD_COLORS = ['#f87171','#fb923c','#fbbf24','#4ade80','#22c55e']

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
function formatDateGroup(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const TABS: { id: Tab; label: string; icon: string; color: string }[] = [
  { id: 'checkin',   label: 'Check-in',  icon: '☀️',  color: '#fbbf24' },
  { id: 'gratitude', label: 'Gratitude', icon: '🌸',  color: '#f472b6' },
  { id: 'cbt',       label: 'CBT',       icon: '🧠',  color: '#a78bfa' },
  { id: 'write',     label: 'Write',     icon: '✍️',  color: '#38bdf8' },
  { id: 'letters',   label: 'Letters',   icon: '✉️',  color: '#d946ef' },
]

// ── Shared card style ──────────────────────────────────────────
function JCard({ children, accent = '#a78bfa', style = {} }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', background: '#0d0d0d', border: `1px solid ${accent}1a`, boxShadow: '0 2px 16px rgba(0,0,0,0.4)', ...style }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${accent}44)` }} />
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  )
}

// ── Mood picker ────────────────────────────────────────────────
function MoodPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.42)', marginBottom: 14 }}>HOW ARE YOU FEELING?</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {MOODS.map((emoji, i) => {
          const sel = value === i + 1
          const c = MOOD_COLORS[i]
          return (
            <button key={i} type="button" onClick={() => onChange(sel ? null : i + 1)} style={{
              flex: 1, borderRadius: 14, padding: '10px 4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              background: sel ? `${c}18` : 'rgba(255,255,255,0.03)',
              border: sel ? `1.5px solid ${c}55` : '1.5px solid rgba(255,255,255,0.06)',
              cursor: 'pointer', transition: 'all 0.15s',
              transform: sel ? 'translateY(-2px)' : 'none',
              boxShadow: sel ? `0 4px 16px ${c}30` : 'none',
            }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
              <span style={{ fontSize: 8, color: sel ? c : 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.03em' }}>{MOOD_LABELS[i].toUpperCase()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════
export function JournalClient({ entries, letters = [] }: { entries: JournalEntry[]; letters?: Letter[] }) {
  const [tab, setTab] = useState<Tab>('checkin')

  const checkinEntries  = entries.filter(e => e.type === 'checkin')
  const gratitudeEntries = entries.filter(e => e.type === 'gratitude')
  const cbtEntries      = entries.filter(e => e.type === 'cbt')
  const writeEntries    = entries.filter(e => e.type === 'write')

  const activeTab = TABS.find(t => t.id === tab)!

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 40 }} className="view-panel">

      {/* ── HEADER ── */}
      <div style={{ position: 'relative', padding: '32px 20px 24px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -40, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#a78bfa' }}>JOURNAL</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style={{ fontSize: 9, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.06em' }}>PRIVATE</span>
          </div>
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, position: 'relative' }}>
          <span style={{ background: 'linear-gradient(90deg,#EFEFEF,#aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Your private</span><br />
          <span style={{ background: 'linear-gradient(90deg,#c4b5fd,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>space.</span>
        </h1>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 300, marginTop: 8, position: 'relative' }}>Never shared. Only you can see this.</p>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 5 }}>
          {TABS.map(t => {
            const sel = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, borderRadius: 13, padding: '10px 4px 9px', border: 'none', cursor: 'pointer',
                background: sel ? `${t.color}20` : 'transparent',
                outline: sel ? `1.5px solid ${t.color}50` : '1.5px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)', fontFamily: 'Satoshi,sans-serif',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                boxShadow: sel ? `0 0 20px ${t.color}25, inset 0 1px 0 ${t.color}20` : 'none',
                transform: sel ? 'translateY(-1px)' : 'none',
              }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', color: sel ? t.color : 'rgba(255,255,255,0.38)', lineHeight: 1 }}>{t.label.toUpperCase()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ padding: '0 20px' }}>
        {tab === 'checkin'   && <CheckinTab   entries={checkinEntries} />}
        {tab === 'gratitude' && <GratitudeTab entries={gratitudeEntries} />}
        {tab === 'cbt'       && <CBTTab       entries={cbtEntries} />}
        {tab === 'write'     && <WriteTab     entries={writeEntries} />}
        {tab === 'letters'   && <LettersTab   letters={letters} />}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// CHECK-IN TAB
// ══════════════════════════════════════════════════════
const checkinDraftKey = (section: string) => `cc_draft_checkin_${section}`

function CheckinTab({ entries }: { entries: JournalEntry[] }) {
  const todayKey = new Date().toISOString().split('T')[0]
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const qod = getTodayQod()

  const todayEntries = entries.filter(e => e.created_at.startsWith(todayKey))
  const morningDone  = todayEntries.some(e => e.content.checkin_type === 'morning')
  const eveningDone  = todayEntries.some(e => e.content.checkin_type === 'evening')

  // Default to evening if morning is done but evening isn't; otherwise morning
  const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [section, setSection] = useState<'morning' | 'evening'>(
    morningDone && !eveningDone ? 'evening' : 'morning'
  )
  const [mood, setMood] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [draftKey, setDraftKey] = useState(0)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const s = localStorage.getItem(checkinDraftKey(section))
    if (s) {
      try {
        const { fields, mood: m } = JSON.parse(s)
        if (fields) { setDraft(fields); setDraftKey(k => k + 1) }
        if (m) setMood(m)
      } catch { /**/ }
    } else {
      setDraft({}); setDraftKey(k => k + 1); setMood(null)
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
    setDraft({}); setMood(null); setDraftKey(k => k + 1)
  }

  function handleMoodSelect(v: number | null) {
    setMood(v)
    const s = localStorage.getItem(checkinDraftKey(section))
    const ex = s ? JSON.parse(s) : {}
    localStorage.setItem(checkinDraftKey(section), JSON.stringify({ ...ex, mood: v }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('type', 'checkin'); fd.set('checkin_type', section); fd.set('mood', mood ? String(mood) : '')
    startTransition(async () => {
      const result = await createJournalEntry(fd)
      if (result.error) { setError(result.error); return }
      clearDraft(); setSaved(true)
      if (section === 'morning') setTimeout(() => { setSaved(false); setSection('evening') }, 1200)
      else setTimeout(() => setSaved(false), 2500)
      router.refresh()
    })
  }

  // Group past entries by date
  const grouped: Record<string, JournalEntry[]> = {}
  for (const e of entries) {
    const d = e.created_at.split('T')[0]
    grouped[d] = [...(grouped[d] ?? []), e]
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      {/* Today status strip */}
      <div style={{ borderRadius: 18, background: 'linear-gradient(135deg,rgba(251,191,36,0.07),rgba(251,191,36,0.03))', border: '1px solid rgba(251,191,36,0.18)', padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#fbbf24', marginBottom: 4 }}>TODAY</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#EFEFEF' }}>{todayStr}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ label: 'Morning', done: morningDone, color: '#38bdf8' }, { label: 'Evening', done: eveningDone, color: '#a78bfa' }].map(s => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: s.done ? `${s.color}18` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${s.done ? s.color + '55' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {s.done ? '✓' : (s.label === 'Morning' ? '🌅' : '🌙')}
                </div>
                <span style={{ fontSize: 8, fontWeight: 700, color: s.done ? s.color : 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>{s.label.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Morning / Evening toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 4 }}>
        {(['morning', 'evening'] as const).map(s => {
          const sel = section === s; const c = s === 'morning' ? '#38bdf8' : '#a78bfa'
          return (
            <button key={s} onClick={() => setSection(s)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', transition: 'all 0.18s', background: sel ? `${c}18` : 'transparent', color: sel ? c : 'rgba(255,255,255,0.42)', boxShadow: sel ? `0 0 12px ${c}20` : 'none', outline: sel ? `1px solid ${c}44` : '1px solid transparent' }}>
              {s === 'morning' ? '🌅 MORNING' : '🌙 EVENING'}
            </button>
          )
        })}
      </div>

      {/* Form */}
      <form key={draftKey} autoComplete="off" onSubmit={handleSubmit} onChange={saveDraft} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>

        {/* Mood */}
        <div style={{ padding: '16px 18px', borderRadius: 18, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <MoodPicker value={mood} onChange={handleMoodSelect} />
        </div>

        {section === 'morning' ? (
          <>
            {/* QOD */}
            <div style={{ borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(135deg,rgba(212,175,55,0.07),rgba(212,175,55,0.03))', border: '1px solid rgba(212,175,55,0.2)' }}>
              <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{qod.emoji}</span>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#D4AF37', marginBottom: 3 }}>QUESTION OF THE DAY · {qod.label.toUpperCase()}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', lineHeight: 1.4 }}>{qod.q}</p>
                </div>
              </div>
              <textarea name="qod_answer" autoComplete="off" defaultValue={draft.qod_answer || ''} placeholder="Take a moment. Be honest…" rows={3} className="cc-input" style={{ fontSize: 13, resize: 'none', borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', borderTop: '1px solid rgba(212,175,55,0.15)', background: 'rgba(0,0,0,0.2)', lineHeight: 1.6 }} />
              <input type="hidden" name="qod_question" value={qod.q} />
            </div>

            {/* Intention */}
            <div style={{ borderRadius: 16, background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.15)', padding: '14px 16px' }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#38bdf8', marginBottom: 10 }}>🎯 TODAY&apos;S INTENTION</label>
              <input name="intention" autoComplete="off" defaultValue={draft.intention || ''} placeholder="What's your main focus today?" className="cc-input" style={{ fontSize: 13, border: 'none', background: 'transparent', padding: '0' }} />
            </div>

            {/* Tasks */}
            <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px' }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>TOP 3 TASKS</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['task1','Most important thing today…'],['task2','Second priority…'],['task3','Third priority…']].map(([n, p], i) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{i + 1}</div>
                    <input name={n} autoComplete="off" defaultValue={(draft as Record<string,string>)[n] || ''} placeholder={p} className="cc-input" style={{ fontSize: 13, flex: 1, border: 'none', background: 'transparent', padding: '4px 0' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Excited */}
            <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px' }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)', marginBottom: 10 }}>ONE THING I&apos;M EXCITED ABOUT</label>
              <input name="excited" autoComplete="off" defaultValue={draft.excited || ''} placeholder="Something to look forward to today…" className="cc-input" style={{ fontSize: 13, border: 'none', background: 'transparent', padding: '0' }} />
            </div>
          </>
        ) : (
          <>
            {/* Win */}
            <div style={{ borderRadius: 16, background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', padding: '14px 16px' }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#4ade80', marginBottom: 10 }}>🏆 BIGGEST WIN TODAY</label>
              <input name="win" autoComplete="off" defaultValue={draft.win || ''} placeholder="What went well or what are you proud of?" className="cc-input" style={{ fontSize: 13, border: 'none', background: 'transparent', padding: '0' }} />
            </div>

            {/* Challenge */}
            <div style={{ borderRadius: 16, background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.18)', padding: '14px 16px' }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#fb923c', marginBottom: 10 }}>⚡ BIGGEST CHALLENGE</label>
              <input name="challenge" autoComplete="off" defaultValue={draft.challenge || ''} placeholder="What was hard today?" className="cc-input" style={{ fontSize: 13, border: 'none', background: 'transparent', padding: '0' }} />
            </div>

            {/* Lesson */}
            <div style={{ borderRadius: 16, background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.18)', padding: '14px 16px' }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#a78bfa', marginBottom: 10 }}>💡 WHAT I LEARNED</label>
              <textarea name="lesson" autoComplete="off" defaultValue={draft.lesson || ''} placeholder="Something today taught me…" rows={2} className="cc-input" style={{ fontSize: 13, resize: 'none', border: 'none', background: 'transparent', padding: '0' }} />
            </div>

            {/* Energy */}
            <div style={{ borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.42)' }}>⚡ ENERGY LEVEL</label>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#D4AF37' }} id="energy-display">5/10</span>
              </div>
              <input type="range" name="energy" min="1" max="10" defaultValue="5" style={{ width: '100%', accentColor: '#D4AF37', cursor: 'pointer' }}
                onInput={e => {
                  const v = (e.target as HTMLInputElement).value
                  const el = document.getElementById('energy-display')
                  const c = parseInt(v) <= 3 ? '#f87171' : parseInt(v) <= 6 ? '#fbbf24' : '#4ade80'
                  if (el) { el.textContent = v + '/10'; el.style.color = c }
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>
                <span>Drained</span><span>Neutral</span><span>Energized</span>
              </div>
            </div>
          </>
        )}

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>{error}</p>
          </div>
        )}
        <button type="submit" disabled={isPending} className="btn-gold">
          {saved ? '✓ SAVED' : isPending ? 'SAVING…' : `SAVE ${section.toUpperCase()} CHECK-IN`}
        </button>
      </form>

      {/* ── PAST CHECK-INS (grouped by date) ── */}
      {(() => {
        const recentDates  = sortedDates.filter(d => d >= yesterdayKey)
        const archivedDates = sortedDates.filter(d => d < yesterdayKey)
        if (sortedDates.length === 0) return null

        function renderCheckinDay(date: string) {
          const dayEntries = grouped[date]
          const morning = dayEntries.find(e => e.content.checkin_type === 'morning')
          const evening = dayEntries.find(e => e.content.checkin_type === 'evening')
          return (
            <div key={date}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{formatDateGroup(date)}</p>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[morning, evening].filter(Boolean).map(e => {
                  const c = e!.content
                  const isMorning = c.checkin_type === 'morning'
                  const accent = isMorning ? '#38bdf8' : '#a78bfa'
                  const moodNum = c.mood ? parseInt(c.mood) : null
                  const validMood = moodNum && moodNum >= 1 && moodNum <= 5
                  return (
                    <div key={e!.id} style={{ borderRadius: 18, overflow: 'hidden', background: '#0d0d0d', border: `1px solid ${accent}18` }}>
                      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${accent}44)` }} />
                      <div style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{isMorning ? '🌅' : '🌙'}</span>
                            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: accent }}>{isMorning ? 'MORNING' : 'EVENING'}</span>
                          </div>
                          {validMood && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: `${MOOD_COLORS[moodNum! - 1]}12`, border: `1px solid ${MOOD_COLORS[moodNum! - 1]}30` }}>
                              <span style={{ fontSize: 13 }}>{MOODS[moodNum! - 1]}</span>
                              <span style={{ fontSize: 9, fontWeight: 700, color: MOOD_COLORS[moodNum! - 1] }}>{MOOD_LABELS[moodNum! - 1].toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        {isMorning && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {c.intention && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>🎯</span><p style={{ fontSize: 13, fontWeight: 600, color: '#EFEFEF', lineHeight: 1.4 }}>{c.intention}</p></div>}
                            {[c.task1, c.task2, c.task3].filter(Boolean).length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {[c.task1, c.task2, c.task3].filter(Boolean).map((t, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                    <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.28)', flexShrink: 0, minWidth: 12 }}>{i + 1}</span>
                                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 300 }}>{t}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {c.qod_answer && <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(212,175,55,0.06)', borderLeft: '2px solid rgba(212,175,55,0.3)', marginTop: 2 }}><p style={{ fontSize: 9, color: '#D4AF37', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 3 }}>Q OF THE DAY</p><p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.5 }}>&ldquo;{c.qod_answer}&rdquo;</p></div>}
                            {c.excited && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontStyle: 'italic' }}>Looking forward to: {c.excited}</p>}
                          </div>
                        )}
                        {!isMorning && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {c.win && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>🏆</span><p style={{ fontSize: 13, fontWeight: 600, color: '#4ade80', lineHeight: 1.4 }}>{c.win}</p></div>}
                            {c.challenge && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', fontWeight: 300 }}>⚡ {c.challenge}</p>}
                            {c.lesson && <p style={{ fontSize: 12, color: '#a78bfa', fontWeight: 300 }}>💡 {c.lesson}</p>}
                            {c.energy && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
                                  <div style={{ width: `${parseInt(c.energy) * 10}%`, height: '100%', borderRadius: 999, background: parseInt(c.energy) <= 3 ? '#f87171' : parseInt(c.energy) <= 6 ? '#fbbf24' : '#4ade80' }} />
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 800, color: parseInt(c.energy) <= 3 ? '#f87171' : parseInt(c.energy) <= 6 ? '#fbbf24' : '#4ade80', flexShrink: 0 }}>{c.energy}/10</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }

        return (
          <div>
            {recentDates.length > 0 && (
              <>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>PAST CHECK-INS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: archivedDates.length > 0 ? 20 : 0 }}>
                  {recentDates.map(renderCheckinDay)}
                </div>
              </>
            )}
            {archivedDates.length > 0 && (
              <div>
                <button onClick={() => setArchiveOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: archiveOpen ? 16 : 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.42)', textAlign: 'left', letterSpacing: '0.04em' }}>Archive · {archivedDates.length} {archivedDates.length === 1 ? 'day' : 'days'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" style={{ transform: archiveOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {archiveOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {archivedDates.map(renderCheckinDay)}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// GRATITUDE TAB
// ══════════════════════════════════════════════════════
const GRATITUDE_DRAFT_KEY = 'cc_draft_gratitude'

function GratitudeTab({ entries }: { entries: JournalEntry[] }) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [draftKey, setDraftKey] = useState(0)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const router = useRouter()
  const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  useEffect(() => {
    const s = localStorage.getItem(GRATITUDE_DRAFT_KEY)
    if (s) {
      try {
        const p = JSON.parse(s)
        if (Object.values(p).some(v => (v as string).trim())) { setDraft(p); setDraftKey(k => k + 1); setShowForm(true) }
      } catch { /**/ }
    }
  }, [])

  function saveDraft(e: React.ChangeEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget); const d: Record<string, string> = {}
    fd.forEach((v, k) => { if (typeof v === 'string') d[k] = v })
    localStorage.setItem(GRATITUDE_DRAFT_KEY, JSON.stringify(d))
  }

  function clearDraft() { localStorage.removeItem(GRATITUDE_DRAFT_KEY); setDraft({}) }

  function handleSubmit(formData: FormData) {
    setError(''); formData.set('type', 'gratitude')
    startTransition(async () => {
      const result = await createJournalEntry(formData)
      if (result.error) { setError(result.error); return }
      clearDraft(); setShowForm(false); router.refresh()
    })
  }

  return (
    <div>
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn-gold" style={{ marginBottom: 20 }}>+ TODAY&apos;S GRATITUDE ENTRY</button>
      )}

      {showForm && (
        <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(244,114,182,0.18)', padding: 22, marginBottom: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#f472b6', marginBottom: 2 }}>GRATITUDE</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF' }}>Today&apos;s Entry</p>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>

          <form key={draftKey} autoComplete="off" action={handleSubmit} onChange={saveDraft} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderRadius: 14, background: 'rgba(244,114,182,0.05)', border: '1px solid rgba(244,114,182,0.15)', padding: '14px 16px' }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#f472b6', marginBottom: 12 }}>3 THINGS I&apos;M GRATEFUL FOR</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['g1','Something or someone I\'m grateful for…'],['g2','Something I often overlook…'],['g3','Something that happened today…']].map(([n, p], i) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: '#f472b6', fontSize: 14, flexShrink: 0 }}>✦</span>
                    <input type="text" name={n} defaultValue={(draft as Record<string,string>)[n] || ''} placeholder={p} className="cc-input" style={{ fontSize: 13, flex: 1, border: 'none', background: 'transparent', padding: '4px 0' }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderRadius: 14, background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)', padding: '14px 16px' }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#4ade80', marginBottom: 10 }}>ONE WIN FROM TODAY</label>
              <input type="text" name="win" defaultValue={draft.win || ''} placeholder="Something I did well or pushed through…" className="cc-input" style={{ fontSize: 13, border: 'none', background: 'transparent', padding: '0' }} />
            </div>

            <div style={{ borderRadius: 14, background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)', padding: '14px 16px' }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#a78bfa', marginBottom: 10 }}>ONE THING I&apos;M LOOKING FORWARD TO</label>
              <input type="text" name="lookForward" defaultValue={draft.lookForward || ''} placeholder="Something coming up that excites me…" className="cc-input" style={{ fontSize: 13, border: 'none', background: 'transparent', padding: '0' }} />
            </div>

            {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { clearDraft(); setShowForm(false) }} className="btn-ghost" style={{ width: 'auto', padding: '12px 18px' }}>Cancel</button>
              <button type="submit" disabled={isPending} className="btn-gold">{isPending ? 'SAVING...' : 'SAVE ENTRY'}</button>
            </div>
          </form>
        </div>
      )}

      {entries.length > 0 && (() => {
        function renderGratEntry(e: JournalEntry) {
          const c = e.content
          return (
            <div key={e.id} style={{ borderRadius: 18, overflow: 'hidden', background: '#0d0d0d', border: '1px solid rgba(244,114,182,0.15)' }}>
              <div style={{ height: 2, background: 'linear-gradient(90deg,#f472b6,#f472b644)' }} />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 10, background: 'rgba(244,114,182,0.08)', color: '#f472b6', border: '1px solid rgba(244,114,182,0.2)', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>🌸 GRATITUDE</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{formatDate(e.created_at)}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(['g1','g2','g3'] as const).filter(k => c[k]).map(k => (
                    <li key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ color: '#f472b6', fontSize: 12, flexShrink: 0 }}>✦</span>
                      <p style={{ fontSize: 13, color: '#AAA', fontWeight: 300, lineHeight: 1.5 }}>{c[k]}</p>
                    </li>
                  ))}
                </ul>
                {c.win && <p style={{ fontSize: 11, color: '#4ade80', fontWeight: 600, marginBottom: 3 }}>🏆 <span style={{ fontWeight: 300, color: 'rgba(255,255,255,0.58)' }}>{c.win}</span></p>}
                {c.lookForward && <p style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>→ <span style={{ fontWeight: 300, color: 'rgba(255,255,255,0.58)' }}>{c.lookForward}</span></p>}
              </div>
            </div>
          )
        }
        const recent   = entries.filter(e => e.created_at.slice(0, 10) >= yesterdayKey)
        const archived = entries.filter(e => e.created_at.slice(0, 10) < yesterdayKey)
        return (
          <div>
            {recent.length > 0 && (
              <>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>PAST ENTRIES</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: archived.length > 0 ? 12 : 0 }}>{recent.map(renderGratEntry)}</div>
              </>
            )}
            {archived.length > 0 && (
              <div>
                <button onClick={() => setArchiveOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: archiveOpen ? 12 : 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.42)', textAlign: 'left', letterSpacing: '0.04em' }}>Archive · {archived.length} {archived.length === 1 ? 'entry' : 'entries'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" style={{ transform: archiveOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {archiveOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{archived.map(renderGratEntry)}</div>}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// CBT TAB
// ══════════════════════════════════════════════════════
const CBT_DRAFT_KEY = 'cc_draft_cbt'

function CBTTab({ entries }: { entries: JournalEntry[] }) {
  const [showForm, setShowForm] = useState(false)
  const [openSection, setOpenSection] = useState(0)
  const [selectedDistortions, setSelectedDistortions] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [draftKey, setDraftKey] = useState(0)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const router = useRouter()
  const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  useEffect(() => {
    const s = localStorage.getItem(CBT_DRAFT_KEY)
    if (s) {
      try {
        const { fields, distortions } = JSON.parse(s)
        if (fields && Object.values(fields).some(v => (v as string).trim())) {
          setDraft(fields); setDraftKey(k => k + 1); setShowForm(true)
          if (distortions?.length) setSelectedDistortions(distortions)
        }
      } catch { /**/ }
    }
  }, [])

  function saveDraft(e: React.ChangeEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget); const fields: Record<string, string> = {}
    fd.forEach((v, k) => { if (typeof v === 'string') fields[k] = v })
    localStorage.setItem(CBT_DRAFT_KEY, JSON.stringify({ fields, distortions: selectedDistortions }))
  }

  function clearDraft() { localStorage.removeItem(CBT_DRAFT_KEY); setDraft({}); setSelectedDistortions([]) }

  function toggleDistortion(name: string) {
    setSelectedDistortions(prev => {
      const next = prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]
      const s = localStorage.getItem(CBT_DRAFT_KEY)
      const ex = s ? JSON.parse(s) : {}
      localStorage.setItem(CBT_DRAFT_KEY, JSON.stringify({ ...ex, distortions: next }))
      return next
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('type', 'cbt'); fd.set('distortions', selectedDistortions.join(','))
    startTransition(async () => {
      const result = await createJournalEntry(fd)
      if (result.error) { setError(result.error); return }
      clearDraft(); setShowForm(false); setOpenSection(0); router.refresh()
    })
  }

  const CBT_SECTIONS = [
    { icon: '🔍', label: 'Situation',           sub: 'What happened?',                   field: 'situation', rows: 3, placeholder: 'Describe what happened. Just the facts — no interpretation yet.' },
    { icon: '💭', label: 'Automatic Thought',   sub: 'What went through your mind?',      field: 'thought',   rows: 3, placeholder: '"I always fail", "They must hate me"…' },
    { icon: '❤️', label: 'Emotion',             sub: 'How did that make you feel?',       field: 'emotion',   rows: 1, placeholder: 'Name the emotion (e.g. shame, anxiety, anger)' },
    { icon: '⚖️', label: 'Evidence',            sub: 'For and against the thought',       field: null,        rows: 0, placeholder: '' },
    { icon: '✨', label: 'Balanced Perspective', sub: 'A more realistic view',             field: 'balanced',  rows: 3, placeholder: 'Write a balanced thought that accounts for both sides.' },
  ]

  return (
    <div>
      {!showForm && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setShowForm(true)} className="btn-gold" style={{ marginBottom: 8 }}>+ NEW CBT ENTRY</button>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 300, lineHeight: 1.65 }}>Reframe a difficult thought using cognitive behavioral techniques.</p>
        </div>
      )}

      {showForm && (
        <div style={{ borderRadius: 20, background: '#0d0d0d', border: '1px solid rgba(167,139,250,0.18)', padding: 22, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#a78bfa', marginBottom: 2 }}>CBT JOURNAL</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#EFEFEF' }}>Reframe a Thought</p>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>

          <form key={draftKey} autoComplete="off" onSubmit={handleSubmit} onChange={saveDraft} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CBT_SECTIONS.map((s, i) => {
              const open = openSection === i
              return (
                <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: open ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.07)', background: open ? 'rgba(167,139,250,0.04)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                  <button type="button" onClick={() => setOpenSection(open ? -1 : i)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', textAlign: 'left' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', marginBottom: 1 }}>{s.label}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', fontWeight: 300 }}>{s.sub}</p>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: open ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={open ? '#a78bfa' : 'rgba(255,255,255,0.42)'} strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </button>
                  {open && (
                    <div style={{ padding: '0 16px 16px' }}>
                      {s.field === 'thought' && (
                        <>
                          <textarea name={s.field} defaultValue={draft[s.field] || ''} placeholder={s.placeholder} rows={s.rows} className="cc-input" style={{ fontSize: 13, marginBottom: 14 }} />
                          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#a78bfa', marginBottom: 8 }}>COGNITIVE DISTORTIONS</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                            {DISTORTIONS.map(d => {
                              const sel = selectedDistortions.includes(d.name)
                              return (
                                <button key={d.name} type="button" onClick={() => toggleDistortion(d.name)}
                                  style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', background: sel ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)', color: sel ? '#a78bfa' : 'rgba(255,255,255,0.48)', border: sel ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.07)' }}>
                                  {d.name}
                                </button>
                              )
                            })}
                          </div>
                          {selectedDistortions.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {selectedDistortions.map(name => {
                                const d = DISTORTIONS.find(x => x.name === name)
                                return d ? (
                                  <div key={name} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(139,92,246,0.06)', borderLeft: '2px solid rgba(139,92,246,0.3)' }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 2 }}>{name}</p>
                                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)', fontWeight: 300, lineHeight: 1.5 }}>{d.desc}</p>
                                  </div>
                                ) : null
                              })}
                            </div>
                          )}
                        </>
                      )}
                      {s.field === 'emotion' && (
                        <>
                          <input type="text" name={s.field} defaultValue={draft[s.field] || ''} placeholder={s.placeholder} className="cc-input" style={{ fontSize: 13, marginBottom: 12 }} />
                          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.42)', marginBottom: 8 }}>INTENSITY (1–10)</p>
                          <input type="range" name="intensity" min="1" max="10" defaultValue="5" style={{ width: '100%', accentColor: '#a78bfa', cursor: 'pointer' }} />
                        </>
                      )}
                      {s.field === null && (
                        <>
                          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: '#f87171', marginBottom: 6 }}>SUPPORTS THE THOUGHT</p>
                          <textarea name="evidenceFor" defaultValue={draft.evidenceFor || ''} placeholder="Facts that back up this thought…" rows={2} className="cc-input" style={{ fontSize: 13, marginBottom: 12 }} />
                          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: '#4ade80', marginBottom: 6 }}>CHALLENGES THE THOUGHT</p>
                          <textarea name="evidenceAgainst" defaultValue={draft.evidenceAgainst || ''} placeholder="Facts or experiences that contradict this thought…" rows={2} className="cc-input" style={{ fontSize: 13 }} />
                        </>
                      )}
                      {s.field === 'balanced' && (
                        <>
                          <textarea name={s.field} defaultValue={draft[s.field] || ''} placeholder={s.placeholder} rows={s.rows} className="cc-input" style={{ fontSize: 13, marginBottom: 12 }} />
                          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>HOW DO YOU FEEL NOW? (1–10)</p>
                          <input type="range" name="outcome" min="1" max="10" defaultValue="5" style={{ width: '100%', accentColor: '#4ade80', cursor: 'pointer' }} />
                        </>
                      )}
                      {s.field && s.field !== 'thought' && s.field !== 'emotion' && s.field !== 'balanced' && (
                        s.rows === 1
                          ? <input name={s.field} defaultValue={draft[s.field] || ''} placeholder={s.placeholder} className="cc-input" style={{ fontSize: 13 }} />
                          : <textarea name={s.field} defaultValue={draft[s.field] || ''} placeholder={s.placeholder} rows={s.rows} className="cc-input" style={{ fontSize: 13 }} />
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 4 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button type="button" onClick={() => { clearDraft(); setShowForm(false); setOpenSection(0) }} className="btn-ghost" style={{ width: 'auto', padding: '12px 18px' }}>Cancel</button>
              <button type="submit" disabled={isPending} className="btn-gold">{isPending ? 'SAVING...' : 'SAVE ENTRY'}</button>
            </div>
          </form>
        </div>
      )}

      {entries.length > 0 && (() => {
        function renderCbtEntry(e: JournalEntry) {
          const c = e.content
          const dists = c.distortions ? c.distortions.split(',').filter(Boolean) : []
          return (
            <div key={e.id} style={{ borderRadius: 18, overflow: 'hidden', background: '#0d0d0d', border: '1px solid rgba(167,139,250,0.15)' }}>
              <div style={{ height: 2, background: 'linear-gradient(90deg,#a78bfa,#a78bfa44)' }} />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 10, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.22)', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>🧠 CBT</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{formatDate(e.created_at)}</span>
                </div>
                {c.thought && <p style={{ fontSize: 13, fontWeight: 600, color: '#EFEFEF', marginBottom: 6, lineHeight: 1.4 }}>&ldquo;{c.thought}&rdquo;</p>}
                {c.situation && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', fontWeight: 300, lineHeight: 1.55, marginBottom: 8 }}>{c.situation}</p>}
                {dists.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>{dists.map(d => <span key={d} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 6, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.22)', fontWeight: 600 }}>{d}</span>)}</div>}
                {c.balanced && <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(139,92,246,0.06)', borderLeft: '2px solid rgba(139,92,246,0.3)' }}><p style={{ fontSize: 9, color: '#a78bfa', fontWeight: 800, letterSpacing: '0.06em', marginBottom: 4 }}>REFRAME</p><p style={{ fontSize: 12, color: '#AAA', fontWeight: 300, lineHeight: 1.55 }}>{c.balanced}</p></div>}
                {(c.intensity || c.outcome) && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>{c.intensity && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>Intensity: <span style={{ color: '#f87171', fontWeight: 700 }}>{c.intensity}/10</span></span>}{c.intensity && c.outcome && <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 14 }}>→</span>}{c.outcome && <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>{c.outcome}/10 after</span>}</div>}
              </div>
            </div>
          )
        }
        const recent   = entries.filter(e => e.created_at.slice(0, 10) >= yesterdayKey)
        const archived = entries.filter(e => e.created_at.slice(0, 10) < yesterdayKey)
        return (
          <div>
            {recent.length > 0 && (
              <>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>PAST ENTRIES</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: archived.length > 0 ? 12 : 0 }}>{recent.map(renderCbtEntry)}</div>
              </>
            )}
            {archived.length > 0 && (
              <div>
                <button onClick={() => setArchiveOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: archiveOpen ? 12 : 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.42)', textAlign: 'left', letterSpacing: '0.04em' }}>Archive · {archived.length} {archived.length === 1 ? 'entry' : 'entries'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" style={{ transform: archiveOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {archiveOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{archived.map(renderCbtEntry)}</div>}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// WRITE TAB
// ══════════════════════════════════════════════════════
const WRITE_DRAFT_KEY = 'cc_draft_write'

function WriteTab({ entries }: { entries: JournalEntry[] }) {
  const [mood, setMood] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [archiveOpen, setArchiveOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  useEffect(() => {
    const s = localStorage.getItem(WRITE_DRAFT_KEY)
    if (s) {
      try {
        const { text: t, mood: m } = JSON.parse(s)
        if (t) { setText(t); setFocused(true) }
        if (m) setMood(m)
      } catch { /**/ }
    }
  }, [])

  useEffect(() => {
    if (text || mood) localStorage.setItem(WRITE_DRAFT_KEY, JSON.stringify({ text, mood }))
  }, [text, mood])

  function handleSave() {
    if (!text.trim()) return; setError('')
    const fd = new FormData()
    fd.set('type', 'write'); fd.set('body', text); fd.set('mood', mood ? String(mood) : '')
    startTransition(async () => {
      const result = await createJournalEntry(fd)
      if (result.error) { setError(result.error); return }
      localStorage.removeItem(WRITE_DRAFT_KEY); setText(''); setMood(null); setFocused(false); router.refresh()
    })
  }

  function discard() {
    localStorage.removeItem(WRITE_DRAFT_KEY); setText(''); setMood(null); setFocused(false)
  }

  return (
    <div>
      {/* Mood */}
      <div style={{ padding: '16px 18px', borderRadius: 18, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 14 }}>
        <MoodPicker value={mood} onChange={setMood} />
      </div>

      {/* Write area */}
      <div style={{ borderRadius: 18, background: '#0d0d0d', border: `1px solid ${focused ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.07)'}`, overflow: 'hidden', marginBottom: 14, transition: 'border-color 0.2s' }}>
        <div style={{ height: 2, background: focused ? 'linear-gradient(90deg,#38bdf8,#38bdf844)' : 'rgba(255,255,255,0.06)', transition: 'background 0.3s' }} />
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: focused ? '#38bdf8' : 'rgba(255,255,255,0.42)' }}>FREE WRITE</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
          <textarea ref={textareaRef} autoComplete="off" value={text} onChange={e => setText(e.target.value)} onFocus={() => setFocused(true)}
            placeholder="What's on your mind? There are no rules here — just write…"
            rows={6} style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#EFEFEF', fontFamily: 'Satoshi,sans-serif', resize: 'none', lineHeight: 1.7, boxSizing: 'border-box' }}
          />
          {(focused || text) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 13 }}>{mood ? `${MOODS[mood - 1]} ${MOOD_LABELS[mood - 1]}` : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Pick a mood above</span>}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={discard} style={{ padding: '8px 14px', borderRadius: 9, background: 'transparent', color: 'rgba(255,255,255,0.42)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>Discard</button>
                <button onClick={handleSave} disabled={isPending || !text.trim()} style={{ padding: '8px 18px', borderRadius: 9, background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)', fontSize: 12, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'Satoshi,sans-serif', opacity: text.trim() ? 1 : 0.4 }}>
                  {isPending ? 'Saving…' : 'Save Entry'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {/* Prompts when empty */}
      {!focused && !text && entries.length === 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>WRITING PROMPTS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {WRITE_PROMPTS.map(p => (
              <button key={p} onClick={() => { setText(p + ' '); setFocused(true); textareaRef.current?.focus() }}
                style={{ textAlign: 'left', padding: '13px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.50)', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {entries.length > 0 && (() => {
        function renderWriteEntry(e: JournalEntry) {
          const moodNum = e.content.mood ? parseInt(e.content.mood) : null
          const validMood = moodNum && moodNum >= 1 && moodNum <= 5
          return (
            <div key={e.id} style={{ borderRadius: 18, overflow: 'hidden', background: '#0d0d0d', border: '1px solid rgba(56,189,248,0.12)' }}>
              <div style={{ height: 2, background: 'linear-gradient(90deg,#38bdf8,#38bdf844)' }} />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  {validMood ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 18 }}>{MOODS[moodNum! - 1]}</span><span style={{ fontSize: 10, color: MOOD_COLORS[moodNum! - 1], fontWeight: 700 }}>{MOOD_LABELS[moodNum! - 1]}</span></div> : <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>✍️ Write</span>}
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{formatDate(e.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: '#BBB', fontWeight: 300, lineHeight: 1.7 }}>{e.content.body}</p>
              </div>
            </div>
          )
        }
        const recent   = entries.filter(e => e.created_at.slice(0, 10) >= yesterdayKey)
        const archived = entries.filter(e => e.created_at.slice(0, 10) < yesterdayKey)
        return (
          <div>
            {recent.length > 0 && (
              <>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>PAST ENTRIES</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: archived.length > 0 ? 12 : 0 }}>{recent.map(renderWriteEntry)}</div>
              </>
            )}
            {archived.length > 0 && (
              <div>
                <button onClick={() => setArchiveOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: archiveOpen ? 12 : 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.42)', textAlign: 'left', letterSpacing: '0.04em' }}>Archive · {archived.length} {archived.length === 1 ? 'entry' : 'entries'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" style={{ transform: archiveOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {archiveOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{archived.map(renderWriteEntry)}</div>}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// LETTERS TAB
// ══════════════════════════════════════════════════════
function LettersTab({ letters }: { letters: Letter[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const openLetter = letters.find(l => l.id === openId)

  useEffect(() => {
    document.body.style.overflow = openId ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [openId])

  if (letters.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF', marginBottom: 8 }}>No letters yet</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.6 }}>Write a Letter to Self from the Goals tab — it will appear here when it unlocks.</p>
      </div>
    )
  }

  return (
    <div>
      {openLetter && (
        <div onClick={() => setOpenId(null)} className="modal-open" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: '#0d0d0d', borderRadius: 24, border: '1px solid rgba(217,70,239,0.2)', padding: '28px 24px', maxHeight: '85dvh', overflowY: 'auto', animation: 'scaleIn 0.2s ease both' }}>
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2, margin: '0 auto 24px' }} />
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#d946ef', marginBottom: 6 }}>LETTER TO SELF</p>
            {openLetter.deadline && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
                Written for {new Date(openLetter.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, marginBottom: 28 }}>
              <p style={{ fontSize: 15, color: '#CFCFCF', fontFamily: 'Georgia,serif', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                {openLetter.why_it_matters ?? ''}
              </p>
            </div>
            <button onClick={() => setOpenId(null)} style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'rgba(217,70,239,0.1)', border: '1px solid rgba(217,70,239,0.25)', color: '#f0abfc', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
              Close
            </button>
          </div>
        </div>
      )}

      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>YOUR LETTERS</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {letters.map(letter => {
          const revealDate = letter.deadline ? new Date(letter.deadline + 'T12:00:00') : null
          const daysLeft = revealDate ? Math.max(0, Math.ceil((revealDate.getTime() - Date.now()) / 86400000)) : null
          const unlocked = daysLeft !== null && daysLeft === 0

          return (
            <div key={letter.id} style={{ borderRadius: 18, overflow: 'hidden', background: '#0d0d0d', border: `1px solid ${unlocked ? 'rgba(34,197,94,0.25)' : 'rgba(217,70,239,0.15)'}` }}>
              <div style={{ height: 2, background: unlocked ? 'linear-gradient(90deg,#22c55e,#22c55e44)' : 'linear-gradient(90deg,#d946ef,#7c3aed)' }} />
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{unlocked ? '📬' : '🔒'}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#EFEFEF', marginBottom: 1 }}>Letter to Self</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{formatDate(letter.created_at)}</p>
                    </div>
                  </div>
                  {unlocked ? (
                    <button onClick={() => setOpenId(letter.id)} style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.3)', color: '#f0abfc', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}>
                      ✉️ Read
                    </button>
                  ) : revealDate ? (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 20, fontWeight: 900, color: '#EFEFEF', lineHeight: 1 }}>{daysLeft}</p>
                      <p style={{ fontSize: 8, fontWeight: 800, color: '#d946ef', letterSpacing: '0.06em', marginTop: 2 }}>DAYS LEFT</p>
                    </div>
                  ) : null}
                </div>
                {revealDate && !unlocked && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#d946ef,#7c3aed)', width: `${Math.max(2, 100 - (daysLeft! / Math.max(daysLeft!, 1)) * 100)}%` }} />
                    </div>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{revealDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                )}
                {unlocked && <p style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>✓ UNLOCKED — tap to read</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
