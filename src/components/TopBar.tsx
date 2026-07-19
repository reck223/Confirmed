'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export function TopBar({ unreadCount, isCreator }: { unreadCount: number; isCreator?: boolean }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
      height: 210,
      background: 'linear-gradient(to bottom, rgba(8,8,8,0.97) 0%, rgba(8,8,8,0.82) 52%, rgba(8,8,8,0.18) 82%, rgba(8,8,8,0) 100%)',
      pointerEvents: 'none',
    }}>
      <div style={{
        maxWidth: 560, margin: '0 auto', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }}>
      {/* Brand logo */}
      <Link href="/home" style={{ pointerEvents: scrolled ? 'none' : 'auto', display: 'flex', alignItems: 'center' }}>
        <Image
          src="/brandlogo.png"
          alt="Confirmed Creations"
          width={1536}
          height={1024}
          priority
          className="logo-shimmer"
          style={{
            width: 'min(88%, 520px)',
            maxHeight: 180,
            height: 'auto',
            marginLeft: -8,
            opacity: scrolled ? 0 : 1,
            transform: scrolled ? 'translateY(-6px) scale(0.97)' : 'translateY(0) scale(1)',
            transition: 'opacity 0.22s ease, transform 0.22s ease',
          }}
        />
      </Link>

      {/* Action buttons */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        opacity: scrolled ? 0 : 1,
        transform: scrolled ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'opacity 0.22s ease, transform 0.22s ease',
        pointerEvents: scrolled ? 'none' : 'auto',
      }}>
        {isCreator && (
          <>
            <Link href="/cartoon" style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(167,139,250,0.07)',
              border: '1px solid rgba(167,139,250,0.18)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
              boxShadow: 'inset 0 1px 0 rgba(167,139,250,0.08)',
            }}>
              {/* film strip / cartoon icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/>
                <line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/>
              </svg>
            </Link>
            <Link href="/trading" style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(74,222,128,0.07)',
              border: '1px solid rgba(74,222,128,0.18)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
              boxShadow: 'inset 0 1px 0 rgba(74,222,128,0.08)',
            }}>
              {/* candlestick chart icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10"/><path d="M18 6V4"/><path d="M6 20v-4"/><path d="M6 12V4"/>
                <rect x="14" y="6" width="8" height="12" rx="1"/>
                <rect x="2" y="4" width="8" height="12" rx="1"/>
              </svg>
            </Link>
            <Link href="/creator" style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.2)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
              boxShadow: 'inset 0 1px 0 rgba(212,175,55,0.1)',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </Link>
          </>
        )}

        <Link href="/settings" style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </Link>

        <Link href="/inbox" style={{
          position: 'relative', width: 36, height: 36, borderRadius: 10,
          background: unreadCount > 0 ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.07)',
          border: unreadCount > 0 ? '1px solid rgba(212,175,55,0.28)' : '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textDecoration: 'none',
          boxShadow: unreadCount > 0
            ? 'inset 0 1px 0 rgba(212,175,55,0.14), 0 0 14px rgba(212,175,55,0.12)'
            : 'inset 0 1px 0 rgba(255,255,255,0.07)',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={unreadCount > 0 ? '#D4AF37' : 'rgba(255,255,255,0.55)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 16, height: 16, borderRadius: 999,
              background: 'linear-gradient(135deg,#D4AF37,#A07010)',
              color: '#000', fontSize: 8, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', border: '1.5px solid #080808',
              boxShadow: '0 0 8px rgba(212,175,55,0.6)',
              letterSpacing: 0,
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
      </div>
    </header>
  )
}
