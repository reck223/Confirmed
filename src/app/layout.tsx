import type { Metadata, Viewport } from 'next'
import { NativeInit } from '@/components/NativeInit'
import './globals.css'

export const metadata: Metadata = {
  title: 'Confirmed',
  description: 'A private accountability community where ambitious people follow through.',
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#080808',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Hard-coded so Safari/iOS always reads these — metadata API isn't reliable for PWA */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Confirmed" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#080808" />
      </head>
      <body>
        <NativeInit />
        <div className="bg-glow" />
        <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
          <defs>
            <linearGradient id="gRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#F5D878" />
              <stop offset="45%"  stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#8A6800" />
            </linearGradient>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  )
}
