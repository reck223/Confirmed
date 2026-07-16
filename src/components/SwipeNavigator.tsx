'use client'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getNavDirection, clearNavDirection } from '@/lib/navDirection'

// How far content shifts at maximum drag (px)
const MAX_SHIFT = 56

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const wrapRef   = useRef<HTMLDivElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  // Once a slide animation settles, remove the transform so that position:fixed children
  // (post sheets, modals) go back to being positioned relative to the viewport.
  function scheduleReset(delay: number) {
    clearTimer()
    timerRef.current = setTimeout(() => {
      const el = wrapRef.current; if (!el) return
      el.style.transition = ''
      el.style.transform  = ''
      el.style.opacity    = ''
    }, delay)
  }

  useEffect(() => {
    // ── Live drag: rubber-band content with finger ──────
    function onSwipe(e: Event) {
      const el = wrapRef.current; if (!el) return
      clearTimer()
      const dx    = (e as CustomEvent<{ dx: number }>).detail.dx
      const shift = Math.sign(dx) * Math.min(Math.abs(dx) * 0.3, MAX_SHIFT)
      // Subtle dim reinforces direction without being distracting
      const dim   = 1 - (Math.abs(shift) / MAX_SHIFT) * 0.15
      el.style.transition = 'none'
      el.style.transform  = `translateX(${shift}px)`
      el.style.opacity    = String(dim)
    }

    // ── Cancel: spring back to rest ─────────────────────
    function onCancel() {
      const el = wrapRef.current; if (!el) return
      el.style.transition = 'transform 0.44s cubic-bezier(0.34,1.45,0.64,1), opacity 0.28s ease'
      el.style.transform  = 'translateX(0)'
      el.style.opacity    = '1'
      scheduleReset(520)
    }

    // ── Commit: slide off in swipe direction + fade ─────
    function onCommit(e: Event) {
      const el  = wrapRef.current; if (!el) return
      clearTimer()
      const dir = (e as CustomEvent<{ dir: string }>).detail.dir
      const x   = dir === 'left' ? -90 : 90
      el.style.transition = 'transform 0.19s cubic-bezier(0.4,0,1,1), opacity 0.16s ease'
      el.style.transform  = `translateX(${x}px)`
      el.style.opacity    = '0'
    }

    window.addEventListener('nav-swipe',        onSwipe)
    window.addEventListener('nav-swipe-cancel', onCancel)
    window.addEventListener('nav-swipe-commit', onCommit)
    return () => {
      window.removeEventListener('nav-swipe',        onSwipe)
      window.removeEventListener('nav-swipe-cancel', onCancel)
      window.removeEventListener('nav-swipe-commit', onCommit)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── New page enter: slide in from the opposite side ──
  useLayoutEffect(() => {
    const el  = wrapRef.current; if (!el) return
    clearTimer()
    const dir = getNavDirection()
    clearNavDirection()

    if (dir) {
      // Swipe left  → new page was to the right → enter from right (+x)
      // Swipe right → new page was to the left  → enter from left  (-x)
      const startX = dir === 'left' ? 80 : -80
      el.style.transition = 'none'
      el.style.transform  = `translateX(${startX}px)`
      el.style.opacity    = '0'

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.34s cubic-bezier(0.25,1,0.5,1), opacity 0.24s ease'
          el.style.transform  = 'translateX(0)'
          el.style.opacity    = '1'
          // Clear transform once settled — restores viewport context for fixed children
          scheduleReset(420)
        })
      })
    } else {
      el.style.transition = ''
      el.style.transform  = ''
      el.style.opacity    = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div ref={wrapRef} style={{ minHeight: '100%' }}>
      {children}
    </div>
  )
}
