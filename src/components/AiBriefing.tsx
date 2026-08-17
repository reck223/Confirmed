'use client'
import { useState, useEffect, useRef } from 'react'

type Turn = { role: 'user' | 'assistant'; text: string }

export function AiBriefing() {
  const [text, setText]       = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<Turn[]>([])
  const [reply, setReply]     = useState('')
  const [replying, setReplying] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // No client-side cache needed anymore — the server persists today's
    // briefing (and conversation) in the database, so this is instant on a
    // second load and consistent across devices/sessions, not just one tab.
    fetch('/api/ai-briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(r => r.json())
      .then(d => {
        if (d.text) {
          setText(d.text)
          if (Array.isArray(d.history)) setHistory(d.history)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [history, replying])

  async function sendReply() {
    const msg = reply.trim()
    if (!msg || replying || !text) return
    setReply('')
    setHistory(h => [...h, { role: 'user', text: msg }])
    setReplying(true)
    try {
      const r = await fetch('/api/ai-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const d = await r.json()
      if (Array.isArray(d.history)) {
        setHistory(d.history)
      } else {
        setHistory(h => [...h, { role: 'assistant', text: d.text || "Sorry, I didn't catch that — try again?" }])
      }
    } catch {
      setHistory(h => [...h, { role: 'assistant', text: "Something went wrong on my end — try again?" }])
    } finally {
      setReplying(false)
    }
  }

  if (!loading && !text) return null

  return (
    <div style={{ margin: '0 20px 24px', padding: '18px 20px', borderRadius: 20, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.16)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 14, color: '#D4AF37', flexShrink: 0, marginTop: 2 }}>✦</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <>
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(212,175,55,0.1)', marginBottom: 8, width: '80%' }} />
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(212,175,55,0.07)', width: '60%' }} />
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#EFEFEF', fontWeight: 400, margin: 0 }}>{text}</p>

              {history.length > 0 && (
                <div ref={scrollRef} style={{ marginTop: 12, maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: h.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        padding: '8px 12px',
                        borderRadius: 12,
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        background: h.role === 'user' ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.04)',
                        color: h.role === 'user' ? '#F5E6B8' : '#D8D8D8',
                      }}
                    >
                      {h.text}
                    </div>
                  ))}
                  {replying && (
                    <div style={{ alignSelf: 'flex-start', maxWidth: '85%', padding: '8px 12px', borderRadius: 12, fontSize: 12.5, background: 'rgba(255,255,255,0.04)', color: '#888' }}>
                      …
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                  placeholder="Reply…"
                  disabled={replying}
                  style={{
                    flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.18)',
                    borderRadius: 10, padding: '8px 12px', fontSize: 12.5, color: '#EFEFEF', outline: 'none',
                  }}
                />
                <button
                  onClick={sendReply}
                  disabled={replying || !reply.trim()}
                  style={{
                    padding: '8px 14px', borderRadius: 10, border: 'none', fontSize: 12.5, fontWeight: 600,
                    background: replying || !reply.trim() ? 'rgba(212,175,55,0.15)' : '#D4AF37',
                    color: replying || !reply.trim() ? '#8a7c46' : '#1a1a1a',
                    cursor: replying || !reply.trim() ? 'default' : 'pointer',
                  }}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
