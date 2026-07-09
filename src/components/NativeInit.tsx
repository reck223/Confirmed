'use client'
import { useEffect } from 'react'
import { initNativeShell } from '@/lib/native'

// Mounts once at the root layout — sets status bar style and hides splash screen
export function NativeInit() {
  useEffect(() => { initNativeShell() }, [])
  return null
}
