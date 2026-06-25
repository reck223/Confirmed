'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createGoal, updateGoalProgress, completeGoal } from './actions'
import { categoryStyle, CATEGORIES } from '@/lib/categories'
import type { Goal } from '@/lib/types/database'

export function GoalsClient({ goals }: { goals: Goal[] }) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  const active = goals.filter(g => g.status === 'active')
  const complete = goals.filter(g => g.status === 'complete')

  function handleSubmit(formData: FormData) {
    setError('')
    startTransition(async () => {
      const result = await createGoal(formData)
      if (result.error) { setError(result.error); return }
      setShowForm(false)
      router.refresh()
    })
  }

  function handleProgress(goalId: string, progress: number) {
    startTransition(async () => {
      await updateGoalProgress(goalId, progress)
      router.refresh()
    })
  }

  function handleComplete(goalId: string) {
    startTransition(async () => {
      await completeGoal(goalId)
      router.refresh()
    })
  }

  return (
    <div className="max-w-[600px] mx-auto px-5 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#EFEFEF] tracking-tight">Goals</h1>
          <p className="text-sm text-[#555] mt-0.5">{active.length} active · {complete.length} complete</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black text-xs font-black tracking-wider"
        >
          <span className="text-base leading-none">+</span> ADD GOAL
        </button>
      </div>

      {/* Active goals */}
      {active.length === 0 ? (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-8 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-[#EFEFEF] font-bold mb-1">No goals yet</p>
          <p className="text-sm text-[#555] mb-5">Add your first goal to start tracking your progress.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black text-xs font-black tracking-wider"
          >
            ADD YOUR FIRST GOAL
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          {active.map(goal => <GoalCard key={goal.id} goal={goal} onProgress={handleProgress} onComplete={handleComplete} />)}
        </div>
      )}

      {/* Completed goals */}
      {complete.length > 0 && (
        <div>
          <p className="text-[9px] font-black tracking-[0.14em] text-[#555] mb-3">COMPLETED</p>
          <div className="flex flex-col gap-2">
            {complete.map(goal => (
              <div key={goal.id} className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.04] opacity-50">
                <span className="text-green-400 text-lg">✓</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#EFEFEF] truncate">{goal.title}</p>
                  {goal.completed_date && <p className="text-xs text-[#555]">Completed {goal.completed_date}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
          <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl bg-[#111] border border-white/[0.08] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-[#EFEFEF]">New Goal</h2>
              <button onClick={() => setShowForm(false)} className="text-[#555] hover:text-[#EFEFEF] text-2xl leading-none">×</button>
            </div>

            <form action={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">WHAT&apos;S YOUR GOAL?</label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Run a half marathon"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#444] focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>

              <div>
                <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">CATEGORY</label>
                <select
                  name="category"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] focus:outline-none focus:border-[#D4AF37]/50"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">WHY DOES THIS MATTER?</label>
                <textarea
                  name="why"
                  rows={3}
                  placeholder="What will achieving this change for you?"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#444] focus:outline-none focus:border-[#D4AF37]/50 resize-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">FIRST NEXT ACTION</label>
                <input
                  name="next_action"
                  placeholder="e.g. Sign up for a local 5k"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#444] focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">DEADLINE</label>
                  <input
                    name="deadline"
                    type="date"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">VISIBILITY</label>
                  <select
                    name="visibility"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] focus:outline-none focus:border-[#D4AF37]/50"
                  >
                    <option value="circle">Circle</option>
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              {error && <p className="text-sm text-rose-400">{error}</p>}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black text-xs font-black tracking-wider disabled:opacity-50 mt-2"
              >
                {isPending ? 'SAVING...' : 'ADD GOAL'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function GoalCard({ goal, onProgress, onComplete }: {
  goal: Goal
  onProgress: (id: string, p: number) => void
  onComplete: (id: string) => void
}) {
  const [showDetail, setShowDetail] = useState(false)
  const style = categoryStyle(goal.category)

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 cursor-pointer hover:border-white/[0.1] transition-colors"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {goal.category && (
              <span className={`inline-block text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full mb-2 ${style.badge}`}>
                {goal.category.toUpperCase()}
              </span>
            )}
            <p className="text-base font-bold text-[#EFEFEF] leading-snug">{goal.title}</p>
            {goal.next_action && (
              <p className="text-xs text-[#555] mt-1 truncate">→ {goal.next_action}</p>
            )}
          </div>
          <span className="text-sm font-black text-[#D4AF37] flex-shrink-0">{goal.progress}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${style.bar}`}
            style={{ width: `${goal.progress}%` }}
          />
        </div>

        {goal.deadline && (
          <p className="text-[10px] text-[#444] mt-2">Due {goal.deadline}</p>
        )}
      </div>

      {/* Detail modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
          <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-3xl bg-[#111] border border-white/[0.08] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                {goal.category && (
                  <span className={`inline-block text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full mb-2 ${style.badge}`}>
                    {goal.category.toUpperCase()}
                  </span>
                )}
                <h2 className="text-xl font-black text-[#EFEFEF]">{goal.title}</h2>
              </div>
              <button onClick={() => setShowDetail(false)} className="text-[#555] hover:text-[#EFEFEF] text-2xl leading-none flex-shrink-0">×</button>
            </div>

            {goal.why_it_matters && (
              <div className="mb-5">
                <p className="text-[9px] font-black tracking-[0.14em] text-[#555] mb-1.5">WHY IT MATTERS</p>
                <p className="text-sm text-[#EFEFEF]/80 leading-relaxed">{goal.why_it_matters}</p>
              </div>
            )}

            {goal.next_action && (
              <div className="mb-5">
                <p className="text-[9px] font-black tracking-[0.14em] text-[#555] mb-1.5">NEXT ACTION</p>
                <p className="text-sm text-[#EFEFEF]">→ {goal.next_action}</p>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black tracking-[0.14em] text-[#555]">PROGRESS</p>
                <span className="text-sm font-black text-[#D4AF37]">{goal.progress}%</span>
              </div>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-3">
                <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${goal.progress}%` }} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[25, 50, 75, 100].map(p => (
                  <button
                    key={p}
                    onClick={() => { onProgress(goal.id, p); setShowDetail(false) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      goal.progress === p
                        ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10'
                        : 'border-white/[0.08] text-[#555] hover:border-white/20 hover:text-[#EFEFEF]'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>

            {goal.deadline && (
              <p className="text-xs text-[#555] mb-5">Deadline: {goal.deadline}</p>
            )}

            <button
              onClick={() => { onComplete(goal.id); setShowDetail(false) }}
              className="w-full py-3 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-black tracking-wider hover:bg-[#D4AF37]/10 transition-colors"
            >
              MARK AS COMPLETE
            </button>
          </div>
        </div>
      )}
    </>
  )
}
