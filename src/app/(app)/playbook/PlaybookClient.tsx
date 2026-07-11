'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeLesson } from './actions'
import type { Module, Lesson } from './content'

export function PlaybookClient({ modules, completedLessonIds, totalLessons, completedCount }: {
  modules: Module[]
  completedLessonIds: string[]
  totalLessons: number
  completedCount: number
}) {
  const [activeLesson, setActiveLesson] = useState<{ module: Module; lesson: Lesson } | null>(null)
  const [completed, setCompleted] = useState(new Set(completedLessonIds))
  const [, startTransition] = useTransition()
  const router = useRouter()

  const overallPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  function openLesson(module: Module, lesson: Lesson) {
    setActiveLesson({ module, lesson })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleComplete(lessonId: string) {
    setCompleted(prev => new Set([...prev, lessonId]))
    startTransition(async () => {
      await completeLesson(lessonId)
      router.refresh()
    })
  }

  if (activeLesson) {
    return <LessonView
      module={activeLesson.module}
      lesson={activeLesson.lesson}
      isDone={completed.has(activeLesson.lesson.id)}
      onComplete={() => handleComplete(activeLesson.lesson.id)}
      onBack={() => setActiveLesson(null)}
      allLessons={modules.flatMap(m => m.lessons.map(l => ({ module: m, lesson: l })))}
      onNext={(next) => setActiveLesson(next)}
    />
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 20px' }} className="view-panel">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 6 }}>PLAYBOOK</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 8 }}>
          Learn the process.
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.6 }}>
          The difference between people who achieve their goals and those who don&apos;t isn&apos;t talent — it&apos;s system. Here&apos;s the system.
        </p>
      </div>

      {/* Overall progress bar */}
      <div style={{ marginBottom: 28, padding: '16px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#EFEFEF' }}>Your progress</p>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#D4AF37' }}>{completedCount}/{totalLessons} lessons</p>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${overallPct}%`, background: 'linear-gradient(90deg,#D4AF37,#f97316)', borderRadius: 3, transition: 'width 0.5s ease', boxShadow: '0 0 8px rgba(212,175,55,0.4)' }} />
        </div>
        {overallPct === 100 && (
          <p style={{ fontSize: 11, color: '#D4AF37', fontWeight: 700, marginTop: 8, textAlign: 'center', letterSpacing: '0.06em' }}>🎓 SCHOLAR BADGE EARNED</p>
        )}
      </div>

      {/* Module list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {modules.map((module, mIdx) => {
          const doneLessons = module.lessons.filter(l => completed.has(l.id)).length
          const modulePct = Math.round((doneLessons / module.lessons.length) * 100)
          const isUnlocked = mIdx === 0 || modules[mIdx - 1].lessons.every(l => completed.has(l.id))

          return (
            <div key={module.id} style={{
              borderRadius: 20, overflow: 'hidden',
              border: `1px solid ${isUnlocked ? module.color + '25' : 'rgba(255,255,255,0.05)'}`,
              background: 'rgba(255,255,255,0.015)',
              opacity: isUnlocked ? 1 : 0.5,
            }}>
              {/* Module header */}
              <div style={{
                padding: '18px 18px 14px',
                background: isUnlocked ? `linear-gradient(135deg,${module.color}0d,transparent)` : 'transparent',
                borderBottom: `1px solid ${isUnlocked ? module.color + '18' : 'rgba(255,255,255,0.04)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{module.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: isUnlocked ? module.color : '#444', marginBottom: 3 }}>
                      MODULE {mIdx + 1}
                    </p>
                    <p style={{ fontSize: 17, fontWeight: 900, color: '#EFEFEF', marginBottom: 4, letterSpacing: '-0.01em' }}>{module.title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', fontWeight: 300, lineHeight: 1.5 }}>{module.tagline}</p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: isUnlocked ? module.color : '#333' }}>{doneLessons}/{module.lessons.length}</p>
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.06em' }}>DONE</p>
                  </div>
                </div>
                {isUnlocked && (
                  <div style={{ marginTop: 12, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${modulePct}%`, background: `linear-gradient(90deg,${module.color},${module.color}99)`, borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                )}
              </div>

              {/* Lesson list */}
              {isUnlocked && (
                <div>
                  {module.lessons.map((lesson, lIdx) => {
                    const isDone = completed.has(lesson.id)
                    const isAvailable = lIdx === 0 || completed.has(module.lessons[lIdx - 1].id)
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => isAvailable && openLesson(module, lesson)}
                        disabled={!isAvailable}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                          padding: '14px 18px', border: 'none', textAlign: 'left',
                          background: 'transparent', cursor: isAvailable ? 'pointer' : 'default',
                          borderBottom: lIdx < module.lessons.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          fontFamily: 'Satoshi,sans-serif', opacity: isAvailable ? 1 : 0.4,
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* Status dot */}
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isDone ? module.color : `${module.color}14`,
                          border: isDone ? 'none' : `2px solid ${module.color}40`,
                          boxShadow: isDone ? `0 0 12px ${module.color}60` : 'none',
                          transition: 'all 0.3s',
                        }}>
                          {isDone ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M4 13L9.5 18.5L21 5" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 900, color: module.color }}>{lIdx + 1}</span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: isDone ? '#666' : '#EFEFEF', textDecoration: isDone ? 'line-through' : 'none', marginBottom: 2 }}>
                            {lesson.title}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>📖 {lesson.duration} read</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>·</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>+{20} XP</span>
                          </div>
                        </div>
                        {isAvailable && !isDone && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={module.color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {!isUnlocked && (
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🔒</span>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Complete the previous module to unlock</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LessonView({ module, lesson, isDone, onComplete, onBack, allLessons, onNext }: {
  module: Module; lesson: Lesson; isDone: boolean
  onComplete: () => void; onBack: () => void
  allLessons: { module: Module; lesson: Lesson }[]
  onNext: (next: { module: Module; lesson: Lesson }) => void
}) {
  const [completing, setCompleting] = useState(false)
  const [showReflection, setShowReflection] = useState(false)

  const currentIdx = allLessons.findIndex(x => x.lesson.id === lesson.id)
  const nextLesson = allLessons[currentIdx + 1] ?? null

  async function handleComplete() {
    setCompleting(true)
    onComplete()
    setCompleting(false)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 40px' }} className="view-panel">
      {/* Back */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 600, fontFamily: 'Satoshi,sans-serif', marginBottom: 24 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        Playbook
      </button>

      {/* Module badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: `${module.color}14`, border: `1px solid ${module.color}30`, marginBottom: 16 }}>
        <span style={{ fontSize: 12 }}>{module.emoji}</span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: module.color }}>{module.title.toUpperCase()}</span>
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 900, color: '#EFEFEF', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8 }}>
        {lesson.title}
      </h1>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>📖 {lesson.duration} · +20 XP</p>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 32 }}>
        {lesson.content.map((para, i) => (
          <p key={i} style={{ fontSize: 15, color: '#999', lineHeight: 1.75, fontWeight: 300 }}>{para}</p>
        ))}
      </div>

      {/* Reflection */}
      <div style={{ borderRadius: 16, padding: '18px 20px', background: `${module.color}0a`, border: `1px solid ${module.color}20`, marginBottom: 28, cursor: 'pointer' }} onClick={() => setShowReflection(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: showReflection ? 12 : 0 }}>
          <span style={{ fontSize: 16 }}>💭</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: module.color, flex: 1 }}>Reflection question</p>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={module.color} strokeWidth="2.5" strokeLinecap="round" style={{ transform: showReflection ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.6 }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
        {showReflection && (
          <p style={{ fontSize: 14, color: '#AAA', lineHeight: 1.65, fontStyle: 'italic' }}>{lesson.reflection}</p>
        )}
      </div>

      {/* Complete / Next */}
      {!isDone ? (
        <button onClick={handleComplete} disabled={completing} style={{
          width: '100%', padding: '15px', borderRadius: 14,
          background: `linear-gradient(135deg,${module.color},${module.color}aa)`,
          border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800,
          color: '#000', fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.04em',
          boxShadow: `0 4px 24px ${module.color}40`, transition: 'all 0.2s',
          opacity: completing ? 0.7 : 1,
        }}>
          {completing ? 'MARKING DONE…' : '✓ MARK AS COMPLETE · +20 XP'}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '14px', borderRadius: 14, background: `${module.color}12`, border: `1px solid ${module.color}30`, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: module.color }}>Lesson complete</p>
          </div>
          {nextLesson && (
            <button onClick={() => onNext(nextLesson)} style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#EFEFEF',
              fontFamily: 'Satoshi,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Next: {nextLesson.lesson.title}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}
          {!nextLesson && (
            <button onClick={onBack} style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: 'linear-gradient(135deg,#D4AF37,#f97316)', border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#000',
              fontFamily: 'Satoshi,sans-serif', letterSpacing: '0.04em',
            }}>
              🎓 ALL LESSONS COMPLETE
            </button>
          )}
        </div>
      )}
    </div>
  )
}
