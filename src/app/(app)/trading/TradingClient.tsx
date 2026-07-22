'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RealtimeSync } from './RealtimeSync'
import { SessionStrip } from './components/SessionStrip'
import { EquityCurve } from './components/EquityCurve'
import { WinRateRing } from './components/WinRateRing'
import { RangeBar } from './components/RangeBar'
import { FibLadder } from './components/FibLadder'
import { PairPerformance } from './components/PairPerformance'
import type { Signal, Trade, Log, PairStat } from './types'

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
  equityCurve: number[]
  pairStats:   PairStat[]
  bestTrade:   Trade | null
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

export function TradingClient({ signals, trades, logs, openCount, totalPnl, winRate, totalTrades, botRunning, toggleBot, equityCurve, pairStats, bestTrade }: Props) {
  const [tab, setTab] = useState<'signals' | 'trades' | 'log'>('signals')
  const [optimisticRunning, setOptimisticRunning] = useState(botRunning)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const pendingSignals = signals.filter(s => s.status === 'pending')
  const lastLog = logs[0]
  const terminalLogs = [...logs].reverse()

  function handleToggle() {
    const next = !optimisticRunning
    setOptimisticRunning(next)
    startTransition(async () => {
      await toggleBot(next)
    })
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px 100px', fontFamily: 'Satoshi,sans-serif' }} className="view-panel">
      <RealtimeSync />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{ padding: '32px 0 24px' }}>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#D4AF37', marginBottom: 6 }}>
          ✦ CREATOR ONLY · PRIVATE
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8, color: '#EFEFEF' }}>
          Forex<br />
          <span className="shimmer-gold">Trading Bot</span>
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

      {/* ── SESSION STRIP ──────────────────────────────────── */}
      <SessionStrip />

      {/* ── HERO: EQUITY CURVE + STATS ─────────────────────── */}
      <div className="lift" style={{ borderRadius: 20, background: 'linear-gradient(160deg,#111 0%,#0a0a0a 100%)', border: '1px solid rgba(255,255,255,0.08)', padding: '20px 20px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', marginBottom: 6 }}>TOTAL P&amp;L</p>
            <p className={totalPnl > 0 ? 'num-glow-green' : undefined} style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: totalPnl >= 0 ? '#4ade80' : '#f87171' }}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{totalTrades} closed trade{totalTrades === 1 ? '' : 's'}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <WinRateRing pct={winRate} />
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)' }}>WIN RATE</span>
          </div>
        </div>
        <EquityCurve data={equityCurve} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: 'SIGNALS', value: pendingSignals.length, color: '#D4AF37' },
            { label: 'OPEN',    value: openCount,             color: '#38bdf8' },
            { label: 'TRADES',  value: totalTrades,           color: '#a78bfa' },
            { label: 'BEST',    value: bestTrade ? `+$${bestTrade.pnl?.toFixed(0)}` : '—', color: '#4ade80' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PAIR PERFORMANCE ───────────────────────────────── */}
      <PairPerformance stats={pairStats} />

      {/* ── BOT SETUP INSTRUCTIONS ─────────────────────────── */}
      {logs.length === 0 && (
        <div style={{ borderRadius: 18, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.18)', padding: '20px 20px', marginBottom: 20 }}>
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

                {typeof s.rr1 === 'number' && (
                  <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.06)', marginTop: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (s.rr1 / 15) * 100)}%`, borderRadius: 999, background: 'linear-gradient(90deg,#9A7010,#D4AF37,#F5E070)' }} />
                  </div>
                )}

                {s.setup === 'A' && <FibLadder signal={s} />}

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
                {isOpen && <RangeBar sl={t.sl} entry={t.entry} tp1={t.tp1} tp2={t.tp2} direction={t.direction} />}
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>{ago(t.opened_at)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── LOG TAB ────────────────────────────────────────── */}
      {tab === 'log' && (
        <div>
          <button onClick={() => router.refresh()} style={{ display: 'block', marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Satoshi,sans-serif', marginBottom: 10 }}>
            Refresh ↻
          </button>
          <div style={{
            borderRadius: 16, background: '#000', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px', maxHeight: 440, overflowY: 'auto',
            backgroundImage: 'repeating-linear-gradient(rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 3px)',
          }}>
            {terminalLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13, fontFamily: 'monospace' }}>Bot hasn&apos;t run yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {terminalLogs.map(l => (
                  <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontFamily: 'monospace', fontSize: 11.5, lineHeight: 1.5 }}>
                    <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{ago(l.created_at)}</span>
                    <span style={{ fontWeight: 900, color: LEVEL_COLOR[l.level] ?? '#888', flexShrink: 0, minWidth: 44 }}>{l.level}</span>
                    <span style={{ color: 'rgba(255,255,255,0.62)', flex: 1 }}>{l.message}</span>
                  </div>
                ))}
              </div>
            )}
            {botRunning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="pulse-green" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />
                <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, color: '#4ade80', letterSpacing: '0.06em' }}>LIVE — scanning</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
