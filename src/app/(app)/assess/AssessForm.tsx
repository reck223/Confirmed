'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitAssessment } from './actions'

const RATING_LABEL: Record<number, string> = {
  1: 'Rough week — let\'s learn from it.',
  2: 'Rough week — let\'s learn from it.',
  3: 'Rough week — let\'s learn from it.',
  4: 'Decent week. Keep pushing.',
  5: 'Decent week. Keep pushing.',
  6: 'Decent week. Keep pushing.',
  7: 'Strong week. Build on it.',
  8: 'Strong week. Build on it.',
  9: 'Incredible week. Lock it in.',
  10: 'Incredible week. Lock it in.',
}

const RATING_COLOR: Record<number, string> = {
  1: '#f87171', 2: '#f87171', 3: '#fb923c', 4: '#fbbf24', 5: '#fbbf24',
  6: '#D4AF37', 7: '#D4AF37', 8: '#4ade80', 9: '#4ade80', 10: '#22c55e',
}

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
    <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Rating */}
      <div>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', marginBottom: 14 }}>HOW WAS YOUR WEEK? (1–10)</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button key={n} type="button" onClick={() => setRating(n)} style={{ width: 40, height: 40, borderRadius: 12, fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s', background: rating === n ? RATING_COLOR[n] : 'rgba(255,255,255,0.04)', color: rating === n ? '#000' : '#555', border: rating === n ? 'none' : '1px solid rgba(255,255,255,0.08)', transform: rating === n ? 'scale(1.1)' : 'scale(1)', boxShadow: rating === n ? `0 4px 16px ${RATING_COLOR[n]}44` : 'none' }}>
              {n}
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p style={{ fontSize: 12, color: RATING_COLOR[rating], fontWeight: 600, marginTop: 10 }}>
            {RATING_LABEL[rating]}
          </p>
        )}
      </div>

      <Field name="wins" label="WINS THIS WEEK" placeholder="What went well? What are you proud of?" />
      <Field name="challenges" label="CHALLENGES" placeholder="What got in the way? What was hard?" />
      <Field name="lessons" label="LESSONS LEARNED" placeholder="What will you do differently? What did you discover?" />
      <Field name="intentions" label="INTENTIONS FOR NEXT WEEK" placeholder="What are your top 3 priorities?" />
      <Field name="gratitude" label="GRATITUDE" placeholder="Three things you're grateful for…" rows={2} />

      {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}

      <button type="submit" disabled={isPending} className="btn-gold" style={{ fontSize: 13, letterSpacing: '0.06em', padding: 16 }}>
        {isPending ? 'SUBMITTING…' : 'SUBMIT REFLECTION →'}
      </button>
    </form>
  )
}

function Field({ name, label, placeholder, rows = 3 }: { name: string; label: string; placeholder: string; rows?: number }) {
  return (
    <div>
      <label style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: '#555', display: 'block', marginBottom: 10 }}>{label}</label>
      <textarea name={name} rows={rows} placeholder={placeholder} className="cc-input" />
    </div>
  )
}
