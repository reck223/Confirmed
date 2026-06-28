'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export function TopBar({ unreadCount }: { unreadCount: number }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: scrolled ? 60 : 170,
      background: scrolled ? 'rgba(8,8,8,0.96)' : 'linear-gradient(to bottom, rgba(8,8,8,0.97) 0%, rgba(8,8,8,0) 100%)',
      backdropFilter: scrolled ? 'blur(24px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      transition: 'height 0.35s cubic-bezier(0.4,0,0.2,1), background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease',
      willChange: 'height',
    }}>
      {/* Brand logo */}
      <Image
        src="/brandlogo.png"
        alt="Confirmed Creations"
        width={1536}
        height={1024}
        priority
        style={{
          width: scrolled ? 'min(38%, 160px)' : 'min(55%, 260px)',
          height: 'auto',
          filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.35))',
          transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      />

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/settings" style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none', transition: 'background 0.15s, border-color 0.15s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>

        <Link href="/inbox" style={{
          position: 'relative', width: 38, height: 38, borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none', transition: 'background 0.15s, border-color 0.15s',
          boxShadow: unreadCount > 0 ? '0 0 0 1px rgba(212,175,55,0.2)' : 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={unreadCount > 0 ? '#D4AF37' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5,
              minWidth: 18, height: 18, borderRadius: 999,
              background: 'linear-gradient(135deg,#D4AF37,#A07010)',
              color: '#000', fontSize: 9, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px', border: '2px solid #080808',
              boxShadow: '0 0 8px rgba(212,175,55,0.5)',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
