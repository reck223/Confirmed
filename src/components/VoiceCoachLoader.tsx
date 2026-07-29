'use client'
import dynamic from 'next/dynamic'

// Code-split VoiceCoach into its own chunk. It transitively imports server
// actions across nearly every feature domain (journal, meals, workouts,
// goals, playbook), and it's mounted globally in the root app layout — so
// without this, every single page's first compile has to wait on that
// entire graph before it can render anything.
const VoiceCoach = dynamic(() => import('./VoiceCoach').then(m => m.VoiceCoach), { ssr: false })

export function VoiceCoachLoader() {
  return <VoiceCoach />
}
