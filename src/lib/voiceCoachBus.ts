// Tiny pub/sub that lets any component (e.g. the home page) kick off a
// hands-free voice session on the globally-mounted <VoiceCoach/>, without
// threading props through the shared layout.
import type { PromptSchemaId } from '@/app/api/voice/prompts'

export type HandsFreeItem = { schemaId: PromptSchemaId; lessonId?: string; label: string }
type Listener = (items: HandsFreeItem[]) => void

const listeners = new Set<Listener>()

export function startHandsFree(items: HandsFreeItem[]) {
  listeners.forEach(l => l(items))
}

export function onHandsFreeRequest(listener: Listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
