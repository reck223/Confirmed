'use client'
import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { completeLesson } from './actions'
import type { Module, Lesson, LessonLink } from './content'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomLesson extends Lesson {
  isCustom: true
  moduleId: string
}

type AnyLesson = Lesson | CustomLesson
type LessonCtx = { module: Module; lesson: AnyLesson }

// ── YouTube embed helper ──────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0]
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/shorts/')[1].split('?')[0]
      return u.searchParams.get('v')
    }
  } catch { /* */ }
  return null
}

// ── Path geometry ─────────────────────────────────────────────────────────────

// Each lesson node sits at one of 3 horizontal "lanes"
type Lane = 'L' | 'C' | 'R'
const PATTERN: Lane[] = ['R', 'C', 'L', 'C']

// pixel offsets within a 320px track (centered in viewport)
const LANE_X: Record<Lane, number> = { L: 56, C: 160, R: 264 }

// ── Stars helper ──────────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ fontSize: 10, opacity: i < count ? 1 : 0.18 }}>★</span>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function PlaybookClient({ modules, completedLessonIds, totalLessons, completedCount }: {
  modules: Module[]
  completedLessonIds: string[]
  totalLessons: number
  completedCount: number
}) {
  const [active, setActive] = useState<LessonCtx | null>(null)
  const [done, setDone] = useState(new Set(completedLessonIds))
  const [customDone, setCustomDone] = useState(new Set<string>())
  const [custom, setCustom] = useState<CustomLesson[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    try {
      const cl = localStorage.getItem('manifest:custom-lessons')
      const cd = localStorage.getItem('manifest:custom-done')
      if (cl) setCustom(JSON.parse(cl))
      if (cd) setCustomDone(new Set(JSON.parse(cd)))
    } catch { /* */ }
  }, [])

  // Scroll to current lesson node on mount
  useEffect(() => {
    const el = document.querySelector('[data-current-node]') as HTMLElement | null
    if (!el) return
    const id = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 350)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    const id = searchParams.get('lesson')
    if (!id) return
    for (const m of modules) {
      const l = m.lessons.find(x => x.id === id)
      if (l) { setActive({ module: m, lesson: l }); break }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isDone = (id: string) => done.has(id) || customDone.has(id)

  function open(ctx: LessonCtx) {
    setActive(ctx)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function markDone(id: string, isCustomLesson: boolean) {
    if (isCustomLesson) {
      const next = new Set([...customDone, id])
      setCustomDone(next)
      try { localStorage.setItem('manifest:custom-done', JSON.stringify([...next])) } catch { /* */ }
    } else {
      setDone(prev => new Set([...prev, id]))
      startTransition(async () => {
        await completeLesson(id)
        router.refresh()
      })
    }
  }

  function saveCustom(data: Omit<CustomLesson, 'isCustom'>) {
    const lesson: CustomLesson = { ...data, isCustom: true }
    const next = [...custom, lesson]
    setCustom(next)
    try { localStorage.setItem('manifest:custom-lessons', JSON.stringify(next)) } catch { /* */ }
    setShowCreate(false)
  }

  if (active) {
    const isCustomLesson = 'isCustom' in active.lesson
    const flat: LessonCtx[] = modules.flatMap(m => [
      ...m.lessons.map(l => ({ module: m, lesson: l as AnyLesson })),
      ...custom.filter(c => c.moduleId === m.id).map(c => ({ module: m, lesson: c as AnyLesson })),
    ])
    const idx = flat.findIndex(x => x.lesson.id === active.lesson.id)
    return (
      <LessonView
        module={active.module}
        lesson={active.lesson}
        isDone={isDone(active.lesson.id)}
        onComplete={() => markDone(active.lesson.id, isCustomLesson)}
        onBack={() => setActive(null)}
        next={flat[idx + 1] ?? null}
        onNext={setActive}
      />
    )
  }

  const xp = completedCount * 20
  const level = Math.floor(completedCount / 4) + 1
  const levelXp = (completedCount % 4) * 20
  const pct = Math.round((completedCount / totalLessons) * 100)

  // Build all lesson nodes across all modules as a flat ordered list with metadata
  type NodeEntry = { module: Module; lesson: AnyLesson; globalIdx: number; moduleStart: boolean; modIdx: number }
  const nodes: NodeEntry[] = []
  let gIdx = 0
  modules.forEach((mod, mIdx) => {
    const modLessons: AnyLesson[] = [...mod.lessons, ...custom.filter(c => c.moduleId === mod.id)]
    modLessons.forEach((lesson, lIdx) => {
      nodes.push({ module: mod, lesson, globalIdx: gIdx, moduleStart: lIdx === 0, modIdx: mIdx })
      gIdx++
    })
  })

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 120, overflowX: 'hidden' }} className="view-panel">

      {/* ── Top HUD ── */}
      <div style={{ padding: '28px 20px 0' }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#D4AF37', marginBottom: 10 }}>PLAYBOOK</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          {/* XP gem */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 12, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.22)' }}>
            <span style={{ fontSize: 16 }}>💎</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#D4AF37', lineHeight: 1 }}>{xp}</p>
              <p style={{ fontSize: 8, fontWeight: 700, color: 'rgba(212,175,55,0.6)', letterSpacing: '0.06em' }}>TOTAL XP</p>
            </div>
          </div>
          {/* Level */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#EFEFEF', lineHeight: 1 }}>LV {level}</p>
              <p style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>LEVEL</p>
            </div>
          </div>
          {/* Overall */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.42)' }}>Overall</p>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#D4AF37' }}>{pct}%</p>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#B8921A,#D4AF37,#E8C84A)', borderRadius: 3, transition: 'width 0.7s ease' }} />
            </div>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 3 }}>{completedCount} / {totalLessons} lessons · LV{level} · {levelXp}/80 XP</p>
          </div>
        </div>
      </div>

      {/* ── The Path ── */}
      <div style={{ position: 'relative', padding: '0 20px' }}>
        {nodes.map((entry, ni) => {
          const { module, lesson } = entry
          const lessonDone = isDone(lesson.id)
          const modIdx = entry.modIdx
          const isUnlocked = modIdx === 0 || modules[modIdx - 1].lessons.every(l => done.has(l.id))

          // Find index of this lesson within its module (including custom)
          const modLessons: AnyLesson[] = [
            ...module.lessons,
            ...custom.filter(c => c.moduleId === module.id),
          ]
          const lIdx = modLessons.findIndex(l => l.id === lesson.id)
          const prevDone = lIdx === 0 ? isUnlocked : isDone(modLessons[lIdx - 1].id)
          const isAvailable = isUnlocked && prevDone
          const isLocked = !isAvailable && !lessonDone

          // Is this the "current" lesson (first available incomplete)?
          const isCurrent = isAvailable && !lessonDone

          const lane = PATTERN[ni % PATTERN.length]
          const prevLane = ni > 0 ? PATTERN[(ni - 1) % PATTERN.length] : lane
          const isCustom = 'isCustom' in lesson

          return (
            <div key={`${module.id}-${lesson.id}`} data-current-node={isCurrent ? '' : undefined}>
              {/* Section header banner — shown before first lesson of each module */}
              {entry.moduleStart && (
                <UnitBanner module={module} isUnlocked={isUnlocked} />
              )}

              {/* SVG connector from prev node */}
              {ni > 0 && !entry.moduleStart && (
                <PathConnector
                  fromX={LANE_X[prevLane]}
                  toX={LANE_X[lane]}
                  done={lessonDone || prevDone}
                  color={module.color}
                />
              )}

              {/* Gap after unit banner */}
              {entry.moduleStart && <div style={{ height: 16 }} />}

              {/* Node row */}
              <div style={{ position: 'relative', height: isCurrent ? 140 : 100, display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: LANE_X[lane] - (isCurrent ? 44 : 36), top: '50%', transform: 'translateY(-50%)' }}>
                  <PathNode
                    lesson={lesson}
                    module={module}
                    isDone={lessonDone}
                    isCurrent={isCurrent}
                    isLocked={isLocked}
                    isCustom={isCustom}
                    onOpen={() => !isLocked && open({ module, lesson })}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* Path end / completion */}
        {pct === 100 && (
          <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 32px', borderRadius: 20, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)' }}>
              <span style={{ fontSize: 36 }}>🎓</span>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.04em' }}>SCHOLAR</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>All lessons complete</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Custom lesson CTA ── */}
      <div style={{ padding: '12px 20px 0' }}>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            width: '100%', padding: '13px', borderRadius: 14,
            background: 'transparent',
            border: '1.5px dashed rgba(212,175,55,0.2)',
            cursor: 'pointer', color: 'rgba(212,175,55,0.45)',
            fontSize: 11, fontWeight: 900,
            fontFamily: 'Satoshi,sans-serif',
            letterSpacing: '0.1em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>＋</span>
          CREATE CUSTOM LESSON
        </button>
      </div>

      {showCreate && (
        <CreateModal modules={modules} onSave={saveCustom} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}

// ── Unit banner ───────────────────────────────────────────────────────────────

function UnitBanner({ module, isUnlocked }: { module: Module; isUnlocked: boolean }) {
  return (
    <div style={{ margin: '32px 0 0', position: 'relative' }}>
      <div style={{
        borderRadius: 18,
        background: isUnlocked
          ? `linear-gradient(135deg, ${module.color}22 0%, ${module.color}0a 100%)`
          : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${isUnlocked ? module.color + '35' : 'rgba(255,255,255,0.08)'}`,
        padding: '18px 20px',
        opacity: isUnlocked ? 1 : 0.45,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Large emoji bg */}
        <span style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 56, opacity: 0.08, userSelect: 'none', pointerEvents: 'none', lineHeight: 1,
        }}>{module.emoji}</span>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: isUnlocked ? `${module.color}20` : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${isUnlocked ? module.color + '40' : 'rgba(255,255,255,0.08)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>
            {isUnlocked ? module.emoji : '🔒'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: isUnlocked ? module.color : 'rgba(255,255,255,0.3)', marginBottom: 3 }}>
              {isUnlocked ? 'UNIT' : 'LOCKED'}
            </p>
            <p style={{ fontSize: 17, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: isUnlocked ? 6 : 0 }}>
              {module.title}
            </p>
            {isUnlocked && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontWeight: 400, lineHeight: 1.5, paddingRight: 48 }}>
                {module.tagline}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SVG path connector ────────────────────────────────────────────────────────

function PathConnector({ fromX, toX, done, color }: {
  fromX: number; toX: number; done: boolean; color: string
}) {
  const h = 20
  const cx1 = fromX; const cy1 = 0
  const cx2 = toX;   const cy2 = h
  const mx = (fromX + toX) / 2

  const d = fromX === toX
    ? `M ${fromX} 0 L ${toX} ${h}`
    : `M ${fromX} 0 C ${fromX} ${h * 0.5} ${toX} ${h * 0.5} ${toX} ${h}`

  void cx1; void cy1; void cx2; void cy2; void mx

  // Scale: track is 320px inside a 440px container (padding 20 each side)
  // SVG width must match the node layout width
  return (
    <svg
      width="320" height={h}
      viewBox={`0 0 320 ${h}`}
      style={{ display: 'block', overflow: 'visible', marginLeft: 40 }}
      aria-hidden
    >
      <path
        d={d} fill="none"
        stroke={done ? color : 'rgba(255,255,255,0.1)'}
        strokeWidth="4"
        strokeDasharray="6 6"
        strokeLinecap="round"
        opacity={done ? 0.7 : 0.5}
      />
    </svg>
  )
}

// ── Individual node ───────────────────────────────────────────────────────────

function PathNode({ lesson, module, isDone, isCurrent, isLocked, isCustom, onOpen }: {
  lesson: AnyLesson; module: Module
  isDone: boolean; isCurrent: boolean; isLocked: boolean; isCustom: boolean
  onOpen: () => void
}) {
  const size = isCurrent ? 88 : 72

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isCurrent ? 10 : 6 }}>
      {/* Pulsing ring behind current node */}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {isCurrent && (
          <div aria-hidden className="playbook-ring" style={{
            position: 'absolute',
            width: size + 28, height: size + 28,
            borderRadius: '50%',
            border: `2px solid ${module.color}`,
            pointerEvents: 'none',
          }} />
        )}
        {/* Second ring for depth */}
        {isCurrent && (
          <div aria-hidden style={{
            position: 'absolute',
            width: size + 14, height: size + 14,
            borderRadius: '50%',
            background: `${module.color}10`,
            pointerEvents: 'none',
          }} />
        )}

        <button
          onClick={onOpen}
          disabled={isLocked}
          style={{
            width: size, height: size, borderRadius: '50%',
            cursor: isLocked ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', flexShrink: 0,
            border: 'none',
            background: isDone
              ? `linear-gradient(145deg, ${module.color} 0%, ${module.color}cc 100%)`
              : isCurrent
                ? `radial-gradient(circle at 35% 35%, ${module.color}28, ${module.color}08)`
                : isLocked
                  ? 'rgba(255,255,255,0.03)'
                  : `${module.color}10`,
            outline: isDone
              ? 'none'
              : isCurrent
                ? `3px solid ${module.color}`
                : `2px solid ${isLocked ? 'rgba(255,255,255,0.07)' : module.color + '40'}`,
            outlineOffset: isCurrent ? 2 : 0,
            boxShadow: isDone
              ? `0 0 32px ${module.color}55, 0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)`
              : isCurrent
                ? `0 0 40px ${module.color}35, 0 8px 32px rgba(0,0,0,0.6)`
                : '0 4px 12px rgba(0,0,0,0.4)',
            transition: 'all 0.3s var(--spring-gentle)',
            fontFamily: 'Satoshi,sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isDone ? (
            <svg width={size * 0.34} height={size * 0.34} viewBox="0 0 24 24" fill="none">
              <path d="M4 13L9.5 18.5L21 5" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : isLocked ? (
            <svg width={size * 0.28} height={size * 0.28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          ) : (
            <span style={{ fontSize: isCurrent ? size * 0.42 : size * 0.38, lineHeight: 1 }}>
              {isCustom ? '✏️' : module.emoji}
            </span>
          )}

          {/* XP coin badge */}
          {isDone && (
            <div style={{
              position: 'absolute', bottom: -2, right: -6,
              background: '#0A0A0A',
              border: `2px solid ${module.color}`,
              borderRadius: 999,
              padding: '2px 6px',
              fontSize: 9, fontWeight: 900,
              color: module.color,
              letterSpacing: '0.04em', lineHeight: 1.3,
            }}>+20</div>
          )}
        </button>
      </div>

      {/* Stars (done = 3 stars, in-progress = 0) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <Stars count={isDone ? 3 : 0} />
        <p style={{
          fontSize: isCurrent ? 11 : 10,
          fontWeight: isCurrent ? 700 : 500,
          color: isLocked
            ? 'rgba(255,255,255,0.12)'
            : isDone
              ? module.color
              : isCurrent
                ? '#EFEFEF'
                : 'rgba(255,255,255,0.45)',
          textAlign: 'center',
          maxWidth: 96,
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
        }}>
          {isLocked ? '· · ·' : lesson.title}
        </p>
      </div>

      {/* START pill for current lesson */}
      {isCurrent && (
        <button
          onClick={onOpen}
          style={{
            padding: '9px 28px', borderRadius: 999,
            background: `linear-gradient(135deg, ${module.color}, ${module.color}cc)`,
            border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 900,
            color: '#000', fontFamily: 'Satoshi,sans-serif',
            letterSpacing: '0.12em',
            boxShadow: `0 6px 24px ${module.color}55, 0 2px 8px rgba(0,0,0,0.4)`,
            WebkitTapHighlightColor: 'transparent',
            marginTop: 2,
          }}
        >
          START
        </button>
      )}
    </div>
  )
}

// ── Create custom lesson modal ─────────────────────────────────────────────────

function CreateModal({ modules, onSave, onClose }: {
  modules: Module[]
  onSave: (data: Omit<CustomLesson, 'isCustom'>) => void
  onClose: () => void
}) {
  const [modId, setModId] = useState(modules[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [reflection, setReflection] = useState('')
  const [pullQuote, setPullQuote] = useState('')
  const [duration, setDuration] = useState('3 min')
  const [links, setLinks] = useState<LessonLink[]>([])
  const [err, setErr] = useState('')
  const [aiMode, setAiMode] = useState(true)
  const [aiTopic, setAiTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiErr, setAiErr] = useState('')

  function addLink() { setLinks(l => [...l, { label: '', url: '' }]) }
  function removeLink(i: number) { setLinks(l => l.filter((_, idx) => idx !== i)) }
  function updateLink(i: number, field: 'label' | 'url', val: string) {
    setLinks(l => l.map((x, idx) => idx === i ? { ...x, [field]: val } : x))
  }

  const selectedModule = modules.find(m => m.id === modId) ?? modules[0]

  async function handleGenerate() {
    if (!aiTopic.trim()) { setAiErr('Describe what you want to learn.'); return }
    setGenerating(true)
    setAiErr('')
    try {
      const res = await fetch('/api/playbook/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, moduleName: selectedModule?.title ?? '' }),
      })
      const { lesson } = await res.json()
      if (!lesson) { setAiErr('Something went wrong. Try again.'); return }
      setTitle(lesson.title ?? '')
      setBody((lesson.content ?? []).join('\n\n'))
      setReflection(lesson.reflection ?? '')
      setPullQuote(lesson.pullQuote ?? '')
      setDuration(lesson.duration ?? '4 min')
      setAiMode(false)
    } catch {
      setAiErr('Something went wrong. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  function handleSave() {
    if (!title.trim()) { setErr('Add a lesson title.'); return }
    if (!body.trim()) { setErr('Add some content for your lesson.'); return }
    const content = body.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
    const validLinks = links.filter(l => l.url.trim())
    onSave({
      id: `custom-${Date.now()}`,
      moduleId: modId,
      title: title.trim(),
      content,
      pullQuote: pullQuote.trim() || undefined,
      reflection: reflection.trim() || 'What will you take from this?',
      duration,
      links: validLinks.length > 0 ? validLinks : undefined,
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 560,
        background: '#111', borderRadius: 24,
        border: '1px solid rgba(212,175,55,0.2)',
        maxHeight: '82vh', overflowY: 'auto',
        animation: 'slideUpSheet 0.32s var(--spring-gentle) both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <div style={{ padding: '8px 24px 44px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 4 }}>CUSTOMIZE</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#EFEFEF' }}>Create your lesson</p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 999, width: 32, height: 32, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>✕</button>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 22, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
            {([['ai', '✦ Generate with AI'], ['manual', 'Write manually']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => { setAiMode(mode === 'ai'); setErr(''); setAiErr('') }}
                style={{
                  flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: (mode === 'ai') === aiMode ? 'rgba(212,175,55,0.12)' : 'transparent',
                  color: (mode === 'ai') === aiMode ? '#D4AF37' : 'rgba(255,255,255,0.35)',
                  fontSize: 12, fontWeight: 700, fontFamily: 'Satoshi,sans-serif',
                  transition: 'all 0.15s',
                }}
              >{label}</button>
            ))}
          </div>

          {/* Section selector (always visible) */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>ADD TO SECTION</p>
            <select className="cc-input" value={modId} onChange={e => setModId(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)' }}>
              {modules.map(m => <option key={m.id} value={m.id} style={{ background: '#111' }}>{m.emoji}  {m.title}</option>)}
            </select>
          </div>

          {aiMode ? (
            /* ── AI generator ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.38)', marginBottom: 4 }}>WHAT DO YOU WANT TO LEARN?</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.24)', marginBottom: 8 }}>Describe a concept, habit, skill, or idea. Be specific.</p>
                <textarea
                  className="cc-input"
                  placeholder="e.g. How to stop checking my phone first thing in the morning and build a better start to my day"
                  value={aiTopic}
                  onChange={e => { setAiTopic(e.target.value); setAiErr('') }}
                  rows={3}
                />
              </div>
              {aiErr && <p style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>{aiErr}</p>}
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14,
                  background: generating
                    ? 'rgba(212,175,55,0.08)'
                    : 'linear-gradient(135deg,rgba(212,175,55,0.18),rgba(212,175,55,0.08))',
                  border: '1px solid rgba(212,175,55,0.28)',
                  cursor: generating ? 'default' : 'pointer',
                  color: generating ? 'rgba(212,175,55,0.4)' : '#D4AF37',
                  fontSize: 13, fontWeight: 800, fontFamily: 'Satoshi,sans-serif',
                  letterSpacing: '0.06em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                {generating ? (
                  <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Generating…</>
                ) : '✦ GENERATE LESSON'}
              </button>
            </div>
          ) : (
            /* ── Manual form ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>LESSON TITLE</p>
                <input className="cc-input" placeholder="What's this lesson about?" value={title} onChange={e => { setTitle(e.target.value); setErr('') }} />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>READ TIME</p>
                <select className="cc-input" value={duration} onChange={e => setDuration(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {['2 min','3 min','4 min','5 min','7 min','10 min'].map(d => <option key={d} value={d} style={{ background: '#111' }}>{d}</option>)}
                </select>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.38)', marginBottom: 4 }}>CONTENT</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.24)', marginBottom: 6 }}>Separate paragraphs with a blank line.</p>
                <textarea className="cc-input" placeholder="Share what you know. A framework, a process, an insight worth keeping." value={body} onChange={e => { setBody(e.target.value); setErr('') }} rows={5} />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>PULL QUOTE <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.25)' }}>(optional)</span></p>
                <input className="cc-input" placeholder="One sentence that captures the core idea" value={pullQuote} onChange={e => setPullQuote(e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>REFLECTION QUESTION <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.25)' }}>(optional)</span></p>
                <input className="cc-input" placeholder="What question will make you think?" value={reflection} onChange={e => setReflection(e.target.value)} />
              </div>

              {/* Links */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.38)' }}>LINKS <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(255,255,255,0.25)' }}>(YouTube embeds automatically)</span></p>
                  <button onClick={addLink} style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: '#D4AF37', fontSize: 11, fontWeight: 700, fontFamily: 'Satoshi,sans-serif' }}>+ Add</button>
                </div>
                {links.length === 0 && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Paste a YouTube URL to embed a video, or any link as a resource.</p>
                )}
                {links.map((link, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <input
                      className="cc-input"
                      placeholder="URL (YouTube, article, etc.)"
                      value={link.url}
                      onChange={e => updateLink(i, 'url', e.target.value)}
                      style={{ marginBottom: 0 }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        className="cc-input"
                        placeholder="Label (optional)"
                        value={link.label}
                        onChange={e => updateLink(i, 'label', e.target.value)}
                        style={{ flex: 1, marginBottom: 0 }}
                      />
                      <button onClick={() => removeLink(i)} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '0 12px', cursor: 'pointer', color: '#f87171', fontSize: 13, flexShrink: 0 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>

              {err && <p style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>{err}</p>}
              <button className="btn-gold" onClick={handleSave} style={{ marginTop: 4 }}>ADD TO PLAYBOOK</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Lesson view ───────────────────────────────────────────────────────────────

function LessonView({ module, lesson, isDone, onComplete, onBack, next, onNext }: {
  module: Module; lesson: AnyLesson; isDone: boolean
  onComplete: () => void; onBack: () => void
  next: LessonCtx | null; onNext: (ctx: LessonCtx) => void
}) {
  const [completing, setCompleting] = useState(false)
  const [reflectionText, setReflectionText] = useState('')
  const [saved, setSaved] = useState(false)
  const [coaching, setCoaching] = useState(false)
  const [coachResponse, setCoachResponse] = useState<string | null>(null)
  const isCustom = 'isCustom' in lesson
  const pullQuote = 'pullQuote' in lesson ? (lesson as Lesson).pullQuote : undefined
  const storageKey = `manifest:reflection-${lesson.id}`

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setReflectionText(stored)
      const storedCoach = localStorage.getItem(`${storageKey}-coach`)
      if (storedCoach) setCoachResponse(storedCoach)
    } catch { /* */ }
  }, [storageKey])

  function handleReflectionChange(val: string) {
    setReflectionText(val)
    setSaved(false)
    setCoachResponse(null)
    try {
      localStorage.setItem(storageKey, val)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* */ }
  }

  async function getCoaching() {
    if (!reflectionText.trim() || coaching) return
    setCoaching(true)
    setCoachResponse(null)
    try {
      const res = await fetch('/api/playbook/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: lesson.title,
          moduleName: module.title,
          reflectionPrompt: lesson.reflection,
          userReflection: reflectionText,
        }),
      })
      const { text } = await res.json()
      if (text) {
        setCoachResponse(text)
        try { localStorage.setItem(`${storageKey}-coach`, text) } catch { /* */ }
      }
    } finally {
      setCoaching(false)
    }
  }

  async function handleComplete() {
    setCompleting(true)
    onComplete()
    setTimeout(() => setCompleting(false), 800)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 60px' }} className="view-panel">
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 600, fontFamily: 'Satoshi,sans-serif', marginBottom: 24, WebkitTapHighlightColor: 'transparent' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        Playbook
      </button>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: `${module.color}12`, border: `1px solid ${module.color}28`, marginBottom: 16 }}>
        <span style={{ fontSize: 12 }}>{isCustom ? '✏️' : module.emoji}</span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: module.color }}>
          {isCustom ? 'CUSTOM · ' : ''}{module.title.toUpperCase()}
        </span>
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8 }}>{lesson.title}</h1>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginBottom: 28 }}>📖 {lesson.duration} · +20 XP</p>

      {/* Pull quote */}
      {pullQuote && (
        <div style={{
          borderRadius: 16, padding: '20px 22px 20px 32px',
          background: `${module.color}0a`,
          borderLeft: `3px solid ${module.color}`,
          marginBottom: 32, position: 'relative',
        }}>
          <span style={{
            fontSize: 36, color: module.color, opacity: 0.25,
            position: 'absolute', top: 8, left: 12,
            lineHeight: 1, fontFamily: 'Georgia,serif', userSelect: 'none',
          }}>"</span>
          <p style={{ fontSize: 16, fontWeight: 500, color: '#DEDEDE', lineHeight: 1.75, fontStyle: 'italic' }}>
            {pullQuote}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 40 }}>
        {lesson.content.map((para, i) => (
          <p key={i} style={{ fontSize: 15.5, color: '#9A9A9A', lineHeight: 1.85, fontWeight: 300 }}>{para}</p>
        ))}
      </div>

      {/* Embedded links */}
      {lesson.links && lesson.links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
          {lesson.links.map((link, i) => {
            const ytId = getYouTubeId(link.url)
            if (ytId) {
              return (
                <div key={i}>
                  {link.label && (
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em', marginBottom: 8 }}>{link.label.toUpperCase()}</p>
                  )}
                  <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )
            }
            return (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px', borderRadius: 13,
                background: `${module.color}08`,
                border: `1px solid ${module.color}18`,
                textDecoration: 'none',
              }}>
                <span style={{ fontSize: 16 }}>🔗</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: module.color, flex: 1 }}>
                  {link.label || link.url}
                </p>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={module.color} strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )
          })}
        </div>
      )}

      {/* Writeable reflection */}
      <div style={{ borderRadius: 18, padding: '18px 20px', background: `${module.color}08`, border: `1px solid ${module.color}18`, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 15 }}>💭</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: module.color, flex: 1 }}>Reflection</p>
          {saved && (
            <p style={{ fontSize: 10, fontWeight: 700, color: module.color, opacity: 0.6, letterSpacing: '0.04em' }}>Saved ✓</p>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 12 }}>{lesson.reflection}</p>
        <textarea
          value={reflectionText}
          onChange={e => handleReflectionChange(e.target.value)}
          placeholder="Write your thoughts…"
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.25)',
            border: `1px solid ${module.color}22`,
            borderRadius: 12,
            padding: '12px 14px',
            color: '#EFEFEF',
            fontSize: 14, lineHeight: 1.65,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'Satoshi,sans-serif',
          }}
        />

        {/* AI coaching trigger */}
        {reflectionText.trim().length > 20 && !coachResponse && (
          <button
            onClick={getCoaching}
            disabled={coaching}
            style={{
              marginTop: 10, width: '100%',
              padding: '11px', borderRadius: 11,
              background: coaching ? 'rgba(255,255,255,0.03)' : `${module.color}14`,
              border: `1px solid ${module.color}28`,
              cursor: coaching ? 'default' : 'pointer',
              color: coaching ? 'rgba(255,255,255,0.3)' : module.color,
              fontSize: 12, fontWeight: 700,
              fontFamily: 'Satoshi,sans-serif',
              letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all 0.2s',
            }}
          >
            {coaching ? (
              <>
                <span style={{ fontSize: 14, animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span>
                Getting coaching…
              </>
            ) : (
              <>✦ Get AI coaching on this</>
            )}
          </button>
        )}

        {/* Coach response */}
        {coachResponse && (
          <div style={{
            marginTop: 12, padding: '14px 16px',
            borderRadius: 12,
            background: 'rgba(0,0,0,0.3)',
            border: `1px solid ${module.color}20`,
            animation: 'fadeUp 0.3s ease both',
          }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: module.color, opacity: 0.7, marginBottom: 6 }}>AI COACH</p>
            <p style={{ fontSize: 13.5, color: '#CCC', lineHeight: 1.7 }}>{coachResponse}</p>
          </div>
        )}
      </div>

      {!isDone ? (
        <button onClick={handleComplete} disabled={completing} style={{
          width: '100%', padding: '15px', borderRadius: 14,
          background: `linear-gradient(135deg, ${module.color} 0%, ${module.color}bb 100%)`,
          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 900,
          color: '#000', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.08em',
          boxShadow: `0 4px 24px ${module.color}45`, transition: 'all 0.2s', opacity: completing ? 0.7 : 1,
        }}>
          {completing ? 'SAVING…' : '✓ MARK COMPLETE · +20 XP'}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '14px', borderRadius: 14, background: `${module.color}10`, border: `1px solid ${module.color}25`, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: module.color }}>Complete · +20 XP earned</p>
          </div>
          {next ? (
            <button onClick={() => onNext(next)} style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#EFEFEF', fontFamily: 'Satoshi,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Next: {next.lesson.title}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ) : (
            <button onClick={onBack} style={{ width: '100%', padding: '15px', borderRadius: 14, background: 'linear-gradient(135deg,#D4AF37,#f97316)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 900, color: '#000', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.08em' }}>
              🎓 PLAYBOOK COMPLETE
            </button>
          )}
        </div>
      )}
    </div>
  )
}
