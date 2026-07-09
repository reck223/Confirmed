'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Watches for .card and .post-card elements below the fold and reveals them
// as they scroll into view. Elements already visible on page load are left alone.
export function AnimationObserver() {
  const pathname = usePathname()

  useEffect(() => {
    const SELECTOR = '.card, .post-card, [data-reveal]'
    const vh = window.innerHeight

    const toObserve: Element[] = []
    document.querySelectorAll(SELECTOR).forEach(el => {
      const top = el.getBoundingClientRect().top
      if (top > vh + 10) {
        el.classList.add('reveal-init')
        toObserve.push(el)
      }
    })

    if (!toObserve.length) return

    const io = new IntersectionObserver(
      entries => {
        entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          // Stagger sibling cards that enter together
          const delay = i * 40
          el.style.transitionDelay = `${delay}ms`
          el.classList.remove('reveal-init')
          el.classList.add('reveal-in')
          setTimeout(() => { el.style.transitionDelay = '' }, 600 + delay)
          io.unobserve(el)
        })
      },
      { threshold: 0.06, rootMargin: '0px 0px -12px 0px' }
    )

    toObserve.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [pathname])

  return null
}
