'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function RealtimeSync() {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const refresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => router.refresh(), 200)
    }

    const channel = supabase
      .channel('fx-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fx_trades' },  refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fx_signals' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fx_bot_log' }, refresh)
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
