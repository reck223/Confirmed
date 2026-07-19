'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Signal = {
  id: string; pair: string; setup: string; direction: string
  entry: number; sl: number; tp1: number; tp2: number
  rr1: number; rr2: number; status: string; dry_run: boolean
  notes: string; created_at: string
  confluence: { rsi?: number; ema_trend?: string; price_vs_ema?: string }
}

type Trade = {
  id: string; pair: string; setup: string; direction: string
  entry: number; sl: number; tp1: number; qty: number
  pnl: number | null; status: string; close_reason: string
  opened_at: string; closed_at: string | null
}

type Log = { id: string; level: string; message: string; created_at: string }

interface Props {
  signals:     Signal[]
  trades:      Trade[]
  logs:        Log[]
  openCount:   number
  totalPnl:    number
  winRate:     number | null
  totalTrades: number
  botRunning:  boolean
  toggleBot:   (running: boolean) => Promise<void>
}

function ago(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const DIR_COLOR  = (d: string) => d === 'long' ? '#4ade80' : '#f87171'
const DIR_ICON   = (d: string) => d === 'long' ? '▲' : '▼'
const LEVEL_COLOR: Record<string, string> = {
  INFO: 'rgba(255,255,255,0.3)', SIGNAL: '#D4AF37', TRADE: '#4ade80', ERROR: '#f87171'
}

export function TradingClient({ signals, trades, logs, openCount, totalPnl, winRate, totalTrades, botRunning, toggleBot }: Props) {
  const [tab, setTab] = useState<'signals' | 'trades' | 'log'>('signals')
  const [optimisticRunning, setOptimisticRunning] = useState(botRunning)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const pendingSignals = signals.filter(s => s.status === 'pending')
  const lastLog = logs[0]

  function handleToggle() {
    const next = !optimisticRunning
    setOptimisticRunning(next)
    startTransition(async () => {
      await toggleBot(next)
    })
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }} className="view-panel">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ padding: '32px 0 24px' }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#D4AF37', marginBottom: 6 }}>
          ✦ CREATOR ONLY · PRIVATE
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8, color: '#EFEFEF' }}>
          Forex<br />
          <span style={{ background: 'linear-gradient(90deg,#F5D070,#D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Trading Bot
          </span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: optimisticRunning ? '#4ade80' : 'rgba(255,255,255,0.2)', boxShadow: optimisticRunning ? '0 0 8px #4ade80' : 'none', transition: 'all 0.3s ease' }} />
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              {optimisticRunning ? (lastLog ? `Last scan: ${ago(lastLog.created_at)}` : 'Running — waiting for session') : 'Bot paused'}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={isPending}
            style={{
              padding: '8px 20px', borderRadius: 12, border: 'none', cursor: isPending ? 'wait' : 'pointer',
              fontFamily: 'Satoshi,sans-serif', fontSize: 12, fontWeight: 900, letterSpacing: '0.06em',
              background: optimisticRunning
                ? 'rgba(248,113,113,0.12)' : 'rgba(74,222,128,0.12)',
              color: optimisticRunning ? '#f87171' : '#4ade80',
              outline: optimisticRunning
                ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(74,222,128,0.3)',
              opacity: isPending ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {isPending ? '...' : optimisticRunning ? '⏹ Stop Bot' : '▶ Start Bot'}
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'SIGNALS', value: pendingSignals.length, color: '#D4AF37' },
          { label: 'OPEN',    value: openCount,             color: '#38bdf8' },
          { label: 'WIN %',   value: winRate !== null ? `${winRate}%` : '—', color: '#4ade80' },
          { label: 'P&L',     value: totalPnl ? `$${totalPnl.toFixed(0)}` : '—',
            color: totalPnl >= 0 ? '#4ade80' : '#f87171' },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '14px 12px' }}>
            <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── BOT SETUP INSTRUCTIONS ─────────────────────────── */}
      {logs.length === 0 && (
        <div style={{ borderRadius: 18, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.18)', padding: '20px 20px', marginBottom: 24 }}>
          <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: '#D4AF37', marginBottom: 12 }}>GET STARTED</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              '1. Fill in .env with your TradeLocker credentials',
              '2. Run the SQL in web/supabase/fx_trading.sql in Supabase',
              '3. cd CCDemo && pip install -r tools/requirements.txt',
              '4. python tools/forex_bot.py (add BOT_DRY_RUN=false when ready)',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, color: '#D4AF37', fontWeight: 900, flexShrink: 0, marginTop: 2 }}>✦</span>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, fontFamily: i >= 2 ? 'monospace' : 'Satoshi,sans-serif' }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB BAR ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 4, marginBottom: 20 }}>
        {[
          { id: 'signals' as const, label: 'Signals', count: pendingSignals.length },
          { id: 'trades'  as const, label: 'Trades',  count: trades.length },
          { id: 'log'     as const, label: 'Bot Log', count: null },
        ].map(t => {
          const sel = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, borderRadius: 10, padding: '10px 4px', border: 'none', cursor: 'pointer',
              fontFamily: 'Satoshi,sans-serif', fontSize: 12, fontWeight: 800, letterSpacing: '0.03em',
              background: sel ? 'rgba(212,175,55,0.12)' : 'transparent',
              color: sel ? '#D4AF37' : 'rgba(255,255,255,0.38)',
              outline: sel ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span style={{ fontSize: 9, fontWeight: 900, background: sel ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.08)', borderRadius: 999, padding: '1px 6px', color: sel ? '#D4AF37' : 'rgba(255,255,255,0.4)' }}>{t.count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── SIGNALS TAB ────────────────────────────────────── */}
      {tab === 'signals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {signals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
              No signals yet — start the bot to begin scanning
            </div>
          ) : signals.map(s => (
            <div key={s.id} style={{ borderRadius: 18, background: '#0d0d0d', border: `1px solid ${s.status === 'pending' ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.07)'}`, overflow: 'hidden' }}>
              <div style={{ height: 2, background: s.status === 'pending' ? 'linear-gradient(90deg,#D4AF37,#D4AF3744)' : 'rgba(255,255,255,0.05)' }} />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#EFEFEF' }}>{s.pair}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: DIR_COLOR(s.direction) }}>{DIR_ICON(s.direction)} {s.direction.toUpperCase()}</span>
                    <span style={{ fontSize: 9, fontWeight: 900, color: '#D4AF37', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 6, padding: '2px 7px' }}>SETUP {s.setup}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {s.dry_run && <span style={{ fontSize: 8, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 4, padding: '2px 6px', fontWeight: 800 }}>DRY</span>}
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{ago(s.created_at)}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                  {[
                    { label: 'ENTRY',   val: s.entry, color: 'rgba(255,255,255,0.7)' },
                    { label: 'SL',      val: s.sl,    color: '#f87171' },
                    { label: 'TP1',     val: s.tp1,   color: '#4ade80' },
                    { label: 'TP2',     val: s.tp2,   color: '#22c55e' },
                  ].map(f => (
                    <div key={f.label}>
                      <p style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: 2 }}>{f.label}</p>
                      <p style={{ fontSize: 12, fontWeight: 800, color: f.color, fontVariantNumeric: 'tabular-nums' }}>{f.val?.toFixed(5)}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#D4AF37' }}>R:R {s.rr1?.toFixed(1)}:1</span>
                    {s.confluence?.rsi && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>RSI {s.confluence.rsi}</span>}
                    {s.confluence?.ema_trend && <span style={{ fontSize: 10, color: s.confluence.ema_trend === 'bull' ? '#4ade80' : '#f87171' }}>{s.confluence.ema_trend === 'bull' ? '↗ EMA bull' : '↘ EMA bear'}</span>}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: s.status === 'pending' ? '#D4AF37' : 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>{s.status}</span>
                </div>

                {s.notes && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 8, lineHeight: 1.4, fontStyle: 'italic' }}>{s.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TRADES TAB ─────────────────────────────────────── */}
      {tab === 'trades' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
              No trades yet
            </div>
          ) : trades.map(t => {
            const isOpen   = t.status === 'open'
            const pnlColor = (t.pnl ?? 0) >= 0 ? '#4ade80' : '#f87171'
            return (
              <div key={t.id} style={{ borderRadius: 16, background: '#0d0d0d', border: `1px solid ${isOpen ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.07)'}`, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#EFEFEF' }}>{t.pair}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: DIR_COLOR(t.direction) }}>{DIR_ICON(t.direction)} {t.direction.toUpperCase()}</span>
                    <span style={{ fontSize: 9, color: isOpen ? '#38bdf8' : 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase' }}>{t.status}</span>
                  </div>
                  {t.pnl !== null && (
                    <span style={{ fontSize: 14, fontWeight: 900, color: pnlColor, fontVariantNumeric: 'tabular-nums' }}>
                      {(t.pnl ?? 0) >= 0 ? '+' : ''}${t.pnl?.toFixed(2)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
                  <span>Setup {t.setup}</span>
                  <span>Entry {t.entry?.toFixed(5)}</span>
                  <span>{t.qty} lots</span>
                  {t.close_reason && <span style={{ color: '#fbbf24' }}>{t.close_reason}</span>}
                </div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>{ago(t.opened_at)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── LOG TAB ────────────────────────────────────────── */}
      {tab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => router.refresh()} style={{ alignSelf: 'flex-end', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 8 }}>
            Refresh ↻
          </button>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Bot hasn&apos;t run yet</div>
          ) : logs.map(l => (
            <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: LEVEL_COLOR[l.level] ?? '#888', flexShrink: 0, marginTop: 2, minWidth: 44 }}>{l.level}</span>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, flex: 1 }}>{l.message}</p>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{ago(l.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
