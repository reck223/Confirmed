// Lets whatever page is currently mounted tell the globally-mounted
// <VoiceCoach/> what's actually on screen right now, so it can be asked
// "what's on this page" (or open by itself and just say it) instead of only
// knowing the user's goals/streak in general. Same decoupled pub/sub shape
// as voiceCoachBus.ts, for the same reason — VoiceCoach lives in the shared
// layout, not under any one page.
'use client'
import { useEffect } from 'react'

export type PageVoiceContext = { title: string; summary: string }
type Listener = (ctx: PageVoiceContext | null) => void

const listeners = new Set<Listener>()
let current: PageVoiceContext | null = null

function setPageVoiceContext(ctx: PageVoiceContext | null) {
  current = ctx
  listeners.forEach(l => l(ctx))
}

export function onPageVoiceContextChange(listener: Listener) {
  listeners.add(listener)
  listener(current)
  return () => { listeners.delete(listener) }
}

// Call from a page component with a short, speakable summary of what's
// currently rendered (not raw data — a sentence or two, like you'd say it
// out loud). Re-registers whenever `summary` changes, clears on unmount so
// a stale page's context can't leak into the next page.
export function usePageVoiceContext(title: string, summary: string | null) {
  useEffect(() => {
    if (!summary) return
    setPageVoiceContext({ title, summary })
    return () => setPageVoiceContext(null)
  }, [title, summary])
}
