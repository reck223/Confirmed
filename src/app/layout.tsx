import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Confirmed Creations',
  description: 'A private accountability community where ambitious people follow through.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
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
