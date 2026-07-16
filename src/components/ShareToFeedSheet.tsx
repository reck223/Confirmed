'use client'
import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { createHomePost } from '@/app/(app)/home/actions'

interface Props {
  defaultCaption: string
  onClose: () => void
}

export default function ShareToFeedSheet({ defaultCaption, onClose }: Props) {
  const [caption, setCaption] = useState(defaultCaption)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleShare() {
    if (!caption.trim() || pending) return
    startTransition(async () => {
      await createHomePost({ content: caption.trim(), type: 'win', visibility: 'circle' })
      setDone(true)
      setTimeout(onClose, 1200)
    })
  }

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, zIndex: 9001,
        background: '#111', borderTop: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px 24px 0 0', padding: '28px 20px 40px',
        animation: 'sfSlideUp 0.28s cubic-bezier(0.34,1.2,0.64,1) forwards',
      }}>
        <style>{`@keyframes sfSlideUp { from { transform: translateX(-50%) translateY(100%) } to { transform: translateX(-50%) translateY(0) } }`}</style>

        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 24px' }} />

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#EFEFEF' }}>Shared with your circle!</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>SHARE WITH YOUR CIRCLE</p>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={4}
              maxLength={500}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '14px 16px',
                borderRadius: 14, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#EFEFEF',
                fontSize: 14, lineHeight: 1.55, fontFamily: 'Satoshi,sans-serif',
                outline: 'none', resize: 'none', marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: '13px 0', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Satoshi,sans-serif' }}
              >Skip</button>
              <button
                onClick={handleShare}
                disabled={!caption.trim() || pending}
                style={{ flex: 2, padding: '13px 0', borderRadius: 14, background: caption.trim() ? 'linear-gradient(135deg,#D4AF37,#f0c94c)' : 'rgba(255,255,255,0.05)', border: 'none', color: caption.trim() ? '#111' : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 800, cursor: caption.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Satoshi,sans-serif', transition: 'all 0.15s' }}
              >{pending ? 'Posting…' : 'Post Win 🏆'}</button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  )
}
