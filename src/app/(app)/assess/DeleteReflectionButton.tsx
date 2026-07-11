'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAssessment } from './actions'

export function DeleteReflectionButton({ assessmentId }: { assessmentId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      await deleteAssessment(assessmentId)
      router.push('/assess')
    })
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', padding: '12px 0' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>Delete this reflection?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
        >
          {isPending ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', paddingTop: 8 }}>
      <button
        onClick={() => setConfirming(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.28)', fontFamily: 'Satoshi,sans-serif', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, transition: 'color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
        onMouseLeave={e => (e.currentTarget.style.color = '#333')}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        Delete reflection
      </button>
    </div>
  )
}
