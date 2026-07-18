'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hapticLight } from '@/lib/native'
import { setNavDirection } from '@/lib/navDirection'

type NavLink = {
  href: string; label: string; color: string; glow: string
  Icon: (p: React.SVGProps<SVGSVGElement>) => React.JSX.Element
}

const LINKS: NavLink[] = [
  { href: '/home',    label: 'Home',    color: '#4ade80', glow: 'rgba(74,222,128,0.45)',
    Icon: p => <svg {...p} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { href: '/circle',  label: 'Circle',  color: '#38bdf8', glow: 'rgba(56,189,248,0.45)',
    Icon: p => <svg {...p} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: '/goals',   label: 'Goals',   color: '#D4AF37', glow: 'rgba(212,175,55,0.45)',
    Icon: p => <svg {...p} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  { href: '/tools',   label: 'Tools',   color: '#a78bfa', glow: 'rgba(167,139,250,0.45)',
    Icon: p => <svg {...p} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg> },
  { href: '/profile', label: 'Me',      color: '#fb923c', glow: 'rgba(251,146,60,0.45)',
    Icon: p => <svg {...p} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
]

type Indicator = { left: number; width: number; color: string; glow: string }

const NAV_TABS    = ['/home', '/circle', '/goals', '/tools', '/profile']
const COMMIT_PX   = 52   // wider drag window feels more intentional on a phone

export function Nav({ userName, userStreak, unreadCount }: { userName?: string | null; userStreak?: number; unreadCount?: number }) {
  const pathname = usePathname()
  const router   = useRouter()
  void userName; void userStreak; void unreadCount

  // ── Scroll-hide ─────────────────────────────────────────
  const [visible, setVisible] = useState(true)
  const lastY    = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      if (y > lastY.current + 8)      setVisible(false)
      else if (y < lastY.current - 4) setVisible(true)
      lastY.current = y
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(true), 800)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  useEffect(() => { setVisible(true) }, [pathname])

  // Prefetch all nav routes on mount so swipe transitions are instant from cache
  useEffect(() => {
    NAV_TABS.forEach(tab => router.prefetch(tab))
  }, [router])

  // ── Sliding pill indicator ───────────────────────────────
  const navRef   = useRef<HTMLElement | null>(null)
  const pillRef  = useRef<HTMLDivElement | null>(null)
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const didMount = useRef(false)
  const [pill, setPill] = useState<Indicator>({ left: 0, width: 0, color: LINKS[0].color, glow: LINKS[0].glow })

  function measure() {
    const idx = LINKS.findIndex(l => pathname.startsWith(l.href))
    if (idx === -1) return
    const el  = linkRefs.current[idx]
    const nav = navRef.current
    if (!el || !nav) return
    // Only clear the inline transition override from drag — never clear left/width
    // because clearing them resets to 0 and the spring-back animates from the wrong origin
    const pillEl = pillRef.current
    if (pillEl) pillEl.style.transition = ''
    const nr = nav.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    setPill({ left: er.left - nr.left, width: er.width, color: LINKS[idx].color, glow: LINKS[idx].glow })
  }

  useLayoutEffect(() => { measure(); didMount.current = true }, [])
  useEffect(() => { if (didMount.current) measure() }, [pathname])

  // ── Nav-bar swipe (passive:false so preventDefault works) ──
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    let startX = 0, startY = 0
    let tracking = false, axisLock = false

    function onTouchStart(e: TouchEvent) {
      startX    = e.touches[0].clientX
      startY    = e.touches[0].clientY
      tracking  = true
      axisLock  = false
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      if (!axisLock) {
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return
        if (Math.abs(dy) > Math.abs(dx)) { tracking = false; return }
        axisLock = true
      }

      e.preventDefault()  // block browser back/forward — only works with passive:false

      // Dispatch so content can parallax
      window.dispatchEvent(new CustomEvent('nav-swipe', { detail: { dx } }))

      // Drag pill toward destination proportionally
      const cur = NAV_TABS.findIndex(p => pathname.startsWith(p))
      const targetIdx = dx < 0 ? cur + 1 : cur - 1
      const pillEl = pillRef.current
      const navEl  = navRef.current
      if (pillEl && navEl && targetIdx >= 0 && targetIdx < NAV_TABS.length) {
        const curEl = linkRefs.current[cur]
        const tgtEl = linkRefs.current[targetIdx]
        if (curEl && tgtEl) {
          // Cap at 0.82 — pill never fully lands during drag, final snap happens on route commit
          const progress = Math.min(0.82, Math.abs(dx) / COMMIT_PX)
          const nr  = navEl.getBoundingClientRect()
          const ce  = curEl.getBoundingClientRect()
          const te  = tgtEl.getBoundingClientRect()
          const left  = (ce.left - nr.left) + (te.left - ce.left) * progress
          const width = ce.width + (te.width - ce.width) * progress
          pillEl.style.transition = 'none'
          pillEl.style.left  = `${left}px`
          pillEl.style.width = `${width}px`
          // Blend glow color toward destination so the pill feels alive
          if (progress > 0.1) {
            const srcColor = LINKS[cur]?.glow       ?? 'rgba(255,255,255,0.3)'
            const dstColor = LINKS[targetIdx]?.glow ?? 'rgba(255,255,255,0.3)'
            pillEl.style.boxShadow = progress > 0.5 ? `0 0 28px ${dstColor}` : `0 0 28px ${srcColor}`
          }
        }
      }
    }

    function cancel() {
      tracking = false
      axisLock = false
      // Remove inline transition:none so React's spring transition takes over
      const pillEl = pillRef.current
      if (pillEl) pillEl.style.transition = ''
      window.dispatchEvent(new CustomEvent('nav-swipe-cancel'))
      measure()
    }

    function onTouchEnd(e: TouchEvent) {
      if (!tracking || !axisLock) { cancel(); return }
      tracking = false
      axisLock = false

      const dx  = e.changedTouches[0].clientX - startX
      const dt  = Date.now()
      void dt

      if (Math.abs(dx) < COMMIT_PX) { cancel(); return }

      const cur  = NAV_TABS.findIndex(p => pathname.startsWith(p))
      const next = dx < 0 ? cur + 1 : cur - 1

      if (next >= 0 && next < NAV_TABS.length) {
        const dir = dx < 0 ? 'left' : 'right'
        setNavDirection(dir)
        hapticLight()
        // Clear the drag transition lock so measure() can spring on route change
        const pillEl = pillRef.current
        if (pillEl) pillEl.style.transition = ''
        window.dispatchEvent(new CustomEvent('nav-swipe-commit', { detail: { dir } }))
        // Push immediately — no delay needed since SwipeNavigator handles fade via useLayoutEffect
        router.push(NAV_TABS[next])
      } else {
        cancel()
      }
    }

    nav.addEventListener('touchstart',  onTouchStart, { passive: true })
    nav.addEventListener('touchmove',   onTouchMove,  { passive: false })
    nav.addEventListener('touchend',    onTouchEnd,   { passive: true })
    nav.addEventListener('touchcancel', cancel,       { passive: true })

    return () => {
      nav.removeEventListener('touchstart',  onTouchStart)
      nav.removeEventListener('touchmove',   onTouchMove)
      nav.removeEventListener('touchend',    onTouchEnd)
      nav.removeEventListener('touchcancel', cancel)
    }
  }, [pathname, router])

  return (
    <nav
      ref={navRef}
      className="mobile-nav"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 300,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate3d(0,0,0)' : 'translate3d(0,22px,0)',
        transition: 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.2,0.64,1)',
        pointerEvents: visible ? 'auto' : 'none',
        touchAction: 'pan-y',
      }}
    >
      {/* Sliding background pill */}
      <div
        ref={pillRef}
        aria-hidden
        style={{
          position: 'absolute',
          top: 8,
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          left: pill.left,
          width: pill.width,
          borderRadius: 16,
          background: `${pill.color}12`,
          boxShadow: `0 0 28px ${pill.glow}`,
          transition: didMount.current
            ? `left 0.42s cubic-bezier(0.34,1.45,0.64,1),
               width 0.42s cubic-bezier(0.34,1.45,0.64,1),
               background 0.28s ease,
               box-shadow 0.28s ease`
            : 'none',
          pointerEvents: 'none',
          zIndex: 0,
          willChange: 'left, width',
        }}
      />

      <div style={{
        display: 'flex', alignItems: 'center',
        paddingTop: 10, paddingLeft: 6, paddingRight: 6,
      }}>
        {LINKS.map(({ href, label, color, glow, Icon }, i) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              ref={el => { linkRefs.current[i] = el }}
              style={{
                position: 'relative', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4, padding: '6px 10px',
                textDecoration: 'none', flex: 1, minWidth: 0,
                zIndex: 1,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{
                transform: active ? 'scale(1.18) translateY(-1px)' : 'scale(1) translateY(0)',
                transition: 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1)',
                filter: active ? `drop-shadow(0 0 7px ${glow})` : 'none',
                willChange: 'transform',
              }}>
                <Icon
                  width={21} height={21}
                  stroke={active ? color : 'rgba(255,255,255,0.3)'}
                  strokeWidth={active ? '1.9' : '1.75'}
                  style={{ transition: 'stroke 0.22s ease, stroke-width 0.22s ease', display: 'block' }}
                />
              </div>
              <span style={{
                fontSize: 9, fontWeight: active ? 800 : 600, letterSpacing: '0.06em',
                color: active ? color : 'rgba(255,255,255,0.3)',
                transition: 'color 0.22s ease, font-weight 0s',
                fontFamily: 'Satoshi,sans-serif',
                lineHeight: 1,
              }}>
                {label.toUpperCase()}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
