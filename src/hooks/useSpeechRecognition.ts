'use client'
import { useCallback, useEffect, useState } from 'react'

// The browser Web Speech API — was implemented independently three times
// (VoiceCoach.tsx's support-check, VoiceCoach.tsx's actual listen cycle,
// and WorkoutClient.tsx's "how are you feeling" mic button), each with its
// own slightly different init/error/lifecycle handling. This is the one
// version; callers own their own status/UI state via the callbacks rather
// than this hook imposing one, since VoiceCoach's richer status machine
// (idle/listening/thinking/speaking/...) and WorkoutClient's simple boolean
// are genuinely different enough not to force into a shared shape.
type Options = {
  onResult: (transcript: string) => void
  onStart?: () => void
  onError?: () => void
  onEnd?: () => void
  lang?: string
}

export function isSpeechRecognitionSupported (): boolean {
  if (typeof window === 'undefined') return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

export function useSpeechRecognition ({ onResult, onStart, onError, onEnd, lang = 'en-US' }: Options) {
  const [supported, setSupported] = useState(true)
  useEffect(() => { setSupported(isSpeechRecognitionSupported()) }, [])

  const start = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = lang
    rec.onresult = (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => {
      onResult(e.results[0][0].transcript)
    }
    rec.onerror = () => onError?.()
    rec.onend = () => onEnd?.()
    onStart?.()
    rec.start()
  }, [onResult, onStart, onError, onEnd, lang])

  return { start, supported }
}
