'use client'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { setNavDirection } from '@/lib/navDirection'
import { hapticLight } from '@/lib/native'

const TABS       = ['/home', '/goals', '/tools', '/profile']
const COMMIT_PX  = 52    // px needed to commit a swipe
const DRAG_SCALE = 0.28  // content moves 28% of finger travel

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const wrapRef  = useRef<HTMLDivElement>(null)

  // Per-gesture state lives in refs — no re-render needed
  const startX     = useRef(0)
  const startY     = useRef(0)
  const startT     = useRef(0)
  const tracking   = useRef(false)  // touch is active
  const locked     = useRef(false)  // axis determined as horizontal
  const navigating = useRef(false)  // navigation in flight

  useEffect(() => {
    // Non-null: effect only runs after mount, so the div is always present
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const el = wrapRef.current!

    function spring() {
      el.style.transition = 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease'
      el.style.transform  = 'translateX(0)'
      el.style.opacity    = '1'
    }
    function reset() {
      tracking.current   = false
      locked.current     = false
      navigating.current = false
      spring()
    }

    function onTouchStart(e: TouchEvent) {
      if (navigating.current) return
      startX.current   = e.touches[0].clientX
      startY.current   = e.touches[0].clientY
      startT.current   = Date.now()
      tracking.current = true
      locked.current   = false
      el.style.transition = 'none'
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking.current) return
      const dx = e.touches[0].clientX - startX.current
      const dy = e.touches[0].clientY - startY.current

      if (!locked.current) {
        // Wait for clear intent before locking direction
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        // Vertical wins → let native scroll through
        if (Math.abs(dy) > Math.abs(dx) * 0.85) {
          tracking.current = false
          return
        }
        locked.current = true
      }

      // Block native scroll — we own this gesture
      e.preventDefault()

      const currentIdx = TABS.findIndex(p => pathname.startsWith(p))
      const canLeft    = currentIdx < TABS.length - 1 && dx < 0
      const canRight   = currentIdx > 0               && dx > 0

      // Heavy rubber-band at tab edges, free movement in valid direction
      const drag = (canLeft || canRight) ? dx * DRAG_SCALE : dx * 0.05
      el.style.transform = `translateX(${drag}px)`
      el.style.opacity   = String(Math.max(0.55, 1 - Math.abs(drag) / 220))
    }

    function onTouchEnd(e: TouchEvent) {
      if (!tracking.current || !locked.current) { reset(); return }

      const dx       = e.changedTouches[0].clientX - startX.current
      const dt       = Date.now() - startT.current
      const velocity = Math.abs(dx) / Math.max(dt, 1)  // px per ms
      const isFlick  = velocity > 0.35                  // fast swipe

      const currentIdx = TABS.findIndex(p => pathname.startsWith(p))
      let nextIdx = -1
      if (dx < -COMMIT_PX || (dx < -14 && isFlick)) nextIdx = currentIdx + 1
      if (dx >  COMMIT_PX || (dx >  14 && isFlick)) nextIdx = currentIdx - 1

      if (nextIdx >= 0 && nextIdx < TABS.length) {
        navigating.current = true
        tracking.current   = false
        locked.current     = false

        const dir   = dx > 0 ? 'right' : 'left'
        const exitX = dx > 0 ? 72 : -72
        setNavDirection(dir)
        hapticLight()  // native haptic pulse on swipe commit

        // Sweep current content off-screen, then navigate
        el.style.transition = 'transform 0.2s cubic-bezier(0.4,0,1,1), opacity 0.2s ease'
        el.style.transform  = `translateX(${exitX}px)`
        el.style.opacity    = '0'
        setTimeout(() => router.push(TABS[nextIdx]), 95)
      } else {
        reset()
      }
    }

    el.addEventListener('touchstart',  onTouchStart, { passive: true })
    el.addEventListener('touchmove',   onTouchMove,  { passive: false })
    el.addEventListener('touchend',    onTouchEnd,   { passive: true })
    el.addEventListener('touchcancel', reset,        { passive: true })

    return () => {
      el.removeEventListener('touchstart',  onTouchStart)
      el.removeEventListener('touchmove',   onTouchMove)
      el.removeEventListener('touchend',    onTouchEnd)
      el.removeEventListener('touchcancel', reset)
    }
  }, [pathname, router])

  // Reset wrapper to origin before the new page paints — no flash
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    el!.style.transition = 'none'
    el!.style.transform  = 'translateX(0)'
    el!.style.opacity    = '1'
    navigating.current   = false
  }, [pathname])

  return (
    <div ref={wrapRef} style={{ minHeight: '100%', willChange: 'transform, opacity' }}>
      {children}
    </div>
  )
}
