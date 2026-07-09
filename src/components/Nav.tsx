'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type NavLink = {
  href: string; label: string; color: string; glow: string
  Icon: (p: React.SVGProps<SVGSVGElement>) => React.JSX.Element
}

const LINKS: NavLink[] = [
  { href: '/home',    label: 'Home',    color: '#4ade80', glow: 'rgba(74,222,128,0.45)',
    Icon: p => <svg {...p} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { href: '/goals',   label: 'Goals',   color: '#D4AF37', glow: 'rgba(212,175,55,0.45)',
    Icon: p => <svg {...p} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  { href: '/tools',   label: 'Tools',   color: '#38bdf8', glow: 'rgba(56,189,248,0.45)',
    Icon: p => <svg {...p} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg> },
  { href: '/profile', label: 'Me',      color: '#fb923c', glow: 'rgba(251,146,60,0.45)',
    Icon: p => <svg {...p} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
]

type Indicator = { left: number; width: number; color: string; glow: string }

export function Nav({ userName, userStreak, unreadCount }: { userName?: string | null; userStreak?: number; unreadCount?: number }) {
  const pathname = usePathname()
  void userName; void userStreak; void unreadCount

  // ── Scroll-hide ─────────────────────────────────────────
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      if (y > lastY.current + 8)       setVisible(false)
      else if (y < lastY.current - 4)  setVisible(true)
      lastY.current = y
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(true), 800)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  useEffect(() => { setVisible(true) }, [pathname])

  // ── Sliding pill indicator ───────────────────────────────
  const navRef   = useRef<HTMLElement | null>(null)
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const didMount = useRef(false)
  const [pill, setPill] = useState<Indicator>({ left: 0, width: 0, color: LINKS[0].color, glow: LINKS[0].glow })

  function measure() {
    const idx = LINKS.findIndex(l => pathname.startsWith(l.href))
    if (idx === -1) return
    const el  = linkRefs.current[idx]
    const nav = navRef.current
    if (!el || !nav) return
    const nr = nav.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    setPill({ left: er.left - nr.left, width: er.width, color: LINKS[idx].color, glow: LINKS[idx].glow })
  }

  // First paint: position without transition so pill appears immediately
  useLayoutEffect(() => { measure(); didMount.current = true }, [])
  // Route change: slide with spring transition
  useEffect(() => { if (didMount.current) measure() }, [pathname])

  return (
    <nav
      ref={navRef}
      className="mobile-nav"
      style={{
        display: 'flex', position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 9999, alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        paddingLeft: 6, paddingRight: 6,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate3d(0,0,0)' : 'translate3d(0,22px,0)',
        transition: 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.2,0.64,1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* ── Sliding background pill ── */}
      <div
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
          // No transition on first paint; spring on route change
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
            {/* Icon */}
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

            {/* Label */}
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
    </nav>
  )
}
