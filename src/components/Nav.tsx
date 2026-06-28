'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  {
    href: '/home', label: 'Home',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    href: '/goals', label: 'Goals',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  },
  {
    href: '/assess', label: 'Assess',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/></svg>,
  },
  {
    href: '/circle', label: 'Circle',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: '/journal', label: 'Journal',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  },
]

export function Nav({ userName, userStreak, unreadCount }: { userName?: string | null; userStreak?: number; unreadCount?: number }) {
  const pathname = usePathname()
  void userName
  void userStreak

  return (
    <nav className="mobile-nav" style={{ display: 'flex', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, justifyContent: 'space-around', alignItems: 'center', padding: '8px 4px 12px' }}>
      {links.map(link => {
        const active = pathname.startsWith(link.href)
        return (
          <Link key={link.href} href={link.href} className={`mob-nav-btn${active ? ' nav-active' : ''}`}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              {link.icon}
              {link.href === '/assess' && (
                <span className="pulse-gold" style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: '#D4AF37' }} />
              )}
            </div>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.05em' }}>{link.label.toUpperCase()}</span>
            <span className="nav-pip" />
          </Link>
        )
      })}
    </nav>
  )
}
