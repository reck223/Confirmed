'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  {
    href: '/home', label: 'Home',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    mobileIcon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    href: '/goals', label: 'Goals',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    mobileIcon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  },
  {
    href: '/assess', label: 'Assess',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/></svg>,
    mobileIcon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/></svg>,
  },
  {
    href: '/circle', label: 'Circle',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    mobileIcon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: '/journal', label: 'Journal',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>,
    mobileIcon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>,
  },
]

export function Nav({ userName, userStreak }: { userName?: string | null; userStreak?: number }) {
  const pathname = usePathname()
  const initials = userName ? userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : '?'

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{ width: 220, background: '#080808', borderRight: '1px solid rgba(255,255,255,0.05)' }}
        className="hidden md:flex fixed left-0 top-0 bottom-0 flex-col z-40">
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
          <Link href="/home" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, textDecoration: 'none' }}>
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.3em', color: '#EFEFEF', lineHeight: 1.2 }}>CONFIRMED</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
              <span style={{ color: '#D4AF37', fontSize: 7, opacity: 0.7 }}>——</span>
              <p style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3em', color: '#D4AF37', lineHeight: 1.2 }}>CREATIONS</p>
              <span style={{ color: '#D4AF37', fontSize: 7, opacity: 0.7 }}>——</span>
            </div>
          </Link>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {links.map(link => {
            const active = pathname.startsWith(link.href)
            return (
              <Link key={link.href} href={link.href} className={`nav-item${active ? ' active' : ''}`}>
                {link.icon}
                {link.label}
                {link.href === '/assess' && (
                  <span className="gold-dot" style={{ marginLeft: 'auto' }} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/profile" style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(212,175,55,0.14)', color: '#D4AF37', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer', textDecoration: 'none', transition: 'background 0.15s' }}>
              {initials}
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#EFEFEF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName ?? 'You'}</p>
              <p style={{ fontSize: 10, color: '#666', fontWeight: 300 }}>🔥 {userStreak ?? 0}-week streak</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav md:hidden" style={{ display: 'flex', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, justifyContent: 'space-around', alignItems: 'center', padding: '8px 4px 12px' }}>
        {links.map(link => {
          const active = pathname.startsWith(link.href)
          return (
            <Link key={link.href} href={link.href} className={`mob-nav-btn${active ? ' nav-active' : ''}`}>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                {link.mobileIcon}
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
    </>
  )
}
