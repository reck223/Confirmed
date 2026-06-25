'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitAssessment } from './actions'

export function AssessForm({ weekStart }: { weekStart: string }) {
  const [rating, setRating] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    if (rating === 0) { setError('Please select a rating'); return }
    setError('')
    formData.set('rating', String(rating))
    startTransition(async () => {
      const result = await submitAssessment(weekStart, formData)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      {/* Rating */}
      <div>
        <p className="text-[9px] font-black tracking-[0.14em] text-[#555] mb-3">HOW WAS YOUR WEEK? (1–10)</p>
        <div className="flex gap-2 flex-wrap">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${
                rating === n
                  ? 'bg-[#D4AF37] text-black scale-110'
                  : 'bg-white/[0.04] border border-white/[0.08] text-[#555] hover:text-[#EFEFEF]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-xs text-[#555] mt-2">
            {rating <= 3 ? 'Rough week — let\'s learn from it.' : rating <= 6 ? 'Decent week. Keep pushing.' : rating <= 8 ? 'Strong week. Build on it.' : 'Incredible week. Lock it in.'}
          </p>
        )}
      </div>

      <Field name="wins" label="WINS THIS WEEK" placeholder="What went well? What are you proud of?" rows={3} />
      <Field name="challenges" label="CHALLENGES" placeholder="What got in the way? What was hard?" rows={3} />
      <Field name="lessons" label="LESSONS LEARNED" placeholder="What will you do differently? What did you discover?" rows={3} />
      <Field name="intentions" label="INTENTIONS FOR NEXT WEEK" placeholder="What are your top 3 priorities?" rows={3} />
      <Field name="gratitude" label="GRATITUDE" placeholder="Three things you're grateful for..." rows={2} />

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7010] text-black font-black tracking-wider text-sm disabled:opacity-50"
      >
        {isPending ? 'SUBMITTING...' : 'SUBMIT REFLECTION'}
      </button>
    </form>
  )
}

function Field({ name, label, placeholder, rows }: { name: string; label: string; placeholder: string; rows: number }) {
  return (
    <div>
      <label className="text-[9px] font-black tracking-[0.14em] text-[#555] block mb-1.5">{label}</label>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#EFEFEF] placeholder-[#444] focus:outline-none focus:border-[#D4AF37]/50 resize-none"
      />
    </div>
  )
}
