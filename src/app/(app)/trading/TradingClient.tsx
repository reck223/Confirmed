'use client'
import { useState, useTransition, useEffect } from 'react'
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
  entry: number; sl: number; tp1: number; tp2: number; qty: number
  pnl: number | null; status: string; close_reason: string
  opened_at: string; closed_at: string | null
}

type Log = { id: string; level: string; message: string; created_at: string }

type PairStat = { pair: string; count: number; wins: number; pnl: number }

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

// Mirrors tools/forex_bot.mjs isTradingWindow() for London/NY;
// Sydney/Tokyo added here for the visual strip only (not used for gating).
const SESSIONS = [
  { id: 'sydney', label: 'Sydney',   active: (h: number) => h >= 21 || h < 6 },
  { id: 'tokyo',  label: 'Tokyo',    active: (h: number) => h >= 0  && h < 9 },
  { id: 'london', label: 'London',   active: (h: number) => h >= 8  && h < 17 },
  { id: 'ny',     label: 'New York', active: (h: number) => h >= 13 && h < 22 },
]

function SessionStrip() {
  const [hour, setHour] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setHour(new Date().getUTCHours())
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])
  if (hour === null) return <div style={{ height: 46, marginBottom: 20 }} />
  const activeIds = SESSIONS.filter(s => s.active(hour)).map(s => s.id)
  const overlap = activeIds.includes('london') && activeIds.includes('ny')
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
      {SESSIONS.map(s => {
        const isActive = activeIds.includes(s.id)
        const prime = isActive && overlap && (s.id === 'london' || s.id === 'ny')
        return (
          <div key={s.id} style={{
            flex: 1, borderRadius: 10, padding: '8px 4px', textAlign: 'center',
            background: isActive ? (prime ? 'rgba(212,175,55,0.1)' : 'rgba(74,222,128,0.06)') : 'rgba(255,255,255,0.02)',
            border: `1px solid ${isActive ? (prime ? 'rgba(212,175,55,0.3)' : 'rgba(74,222,128,0.18)') : 'rgba(255,255,255,0.05)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span className={isActive ? (prime ? 'pulse-gold' : 'pulse-green') : undefined} style={{
                width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                background: isActive ? (prime ? '#D4AF37' : '#4ade80') : 'rgba(255,255,255,0.15)',
              }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: isActive ? '#EFEFEF' : 'rgba(255,255,255,0.3)' }}>{s.label}</span>
            </div>
            {prime && <p style={{ fontSize: 6, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.08em', marginTop: 2 }}>OVERLAP</p>}
          </div>
        )
      })}
    </div>
  )
}

function EquityCurve({ data }: { data: number[] }) {
  const W = 600, H = 110, PAD = 6
  if (data.length < 3) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 12 }}>
        Equity curve fills in as trades close
      </div>
    )
  }
  const last = data[data.length - 1]
  const color = last >= 0 ? '#4ade80' : '#f87171'
  const minV = Math.min(0, ...data)
  const maxV = Math.max(0, ...data)
  const range = maxV - minV || 1
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2))
  const ys = data.map(v => H - PAD - ((v - minV) / range) * (H - PAD * 2))
  const zeroY = H - PAD - ((0 - minV) / range) * (H - PAD * 2)
  const linePts = xs.map((x, i) => `${x},${ys[i]}`).join(' ')
  const areaPts = `${PAD},${zeroY} ${linePts} ${W - PAD},${zeroY}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, overflow: 'visible' }}>
      <defs>
        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      ))}
      <line x1={PAD} x2={W - PAD} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="3,3" />
      <polygon points={areaPts} fill="url(#eqGrad)" />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={4} fill={color} />
    </svg>
  )
}

function WinRateRing({ pct }: { pct: number | null }) {
  const r = 28, sw = 5
  const size = (r + sw) * 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - ((pct ?? 0) / 100) * circumference
  const color = pct === null ? 'rgba(255,255,255,0.3)' : pct >= 60 ? '#4ade80' : pct >= 40 ? '#D4AF37' : '#f87171'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={r + sw} cy={r + sw} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        {pct !== null && (
          <circle cx={r + sw} cy={r + sw} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 900, color }}>{pct !== null ? `${pct}%` : '—'}</span>
      </div>
    </div>
  )
}

function RangeBar({ sl, entry, tp1, tp2, direction }: { sl: number; entry: number; tp1: number; tp2: number; direction: string }) {
  const vals = [sl, entry, tp1, tp2].filter(v => typeof v === 'number' && !Number.isNaN(v))
  if (vals.length < 3) return null
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const pos = (v: number) => ((v - min) / range) * 100
  const markers = [
    { v: sl,    color: '#f87171', label: 'SL'  },
    { v: entry, color: '#EFEFEF', label: direction === 'long' ? '▲' : '▼' },
    { v: tp1,   color: '#4ade80', label: 'TP1' },
    ...(tp2 && tp2 !== tp1 ? [{ v: tp2, color: '#22c55e', label: 'TP2' }] : []),
  ]
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ position: 'relative', height: 4, borderRadius: 999, background: 'linear-gradient(90deg,#f87171,rgba(255,255,255,0.14),#4ade80)' }}>
        {markers.map(m => (
          <div key={m.label} style={{ position: 'absolute', left: `${pos(m.v)}%`, top: -3, transform: 'translateX(-50%)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color, border: '2px solid #0d0d0d' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 9, fontWeight: 800 }}>
        <span style={{ color: '#f87171' }}>SL {sl.toFixed(5)}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Entry {entry.toFixed(5)}</span>
        <span style={{ color: '#4ade80' }}>TP {tp1.toFixed(5)}</span>
      </div>
    </div>
  )
}

function PairPerformance({ stats }: { stats: PairStat[] }) {
  if (!stats.length) return null
  const maxAbs = Math.max(...stats.map(s => Math.abs(s.pnl)), 1)
  return (
    <div style={{ borderRadius: 18, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '18px', marginBottom: 24 }}>
      <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', marginBottom: 14 }}>PAIR PERFORMANCE</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stats.map(s => {
          const positive = s.pnl >= 0
          const widthPct = (Math.abs(s.pnl) / maxAbs) * 100
          const wr = s.count ? Math.round((s.wins / s.count) * 100) : 0
          return (
            <div key={s.pair}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#EFEFEF' }}>
                  {s.pair} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>· {wr}% ({s.count})</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: positive ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                  {positive ? '+' : ''}${s.pnl.toFixed(0)}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${widthPct}%`, borderRadius: 999, background: positive ? 'linear-gradient(90deg,#22c55e,#4ade80)' : 'linear-gradient(90deg,#dc2626,#f87171)' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
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

      {/* ── HERO: EQUITY CURVE ─────────────────────────────── */}
      <div className="lift" style={{ borderRadius: 20, background: 'linear-gradient(160deg,#111 0%,#0a0a0a 100%)', border: '1px solid rgba(255,255,255,0.08)', padding: '20px 20px 16px', marginBottom: 16 }}>
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
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'SIGNALS', value: pendingSignals.length, color: '#D4AF37' },
          { label: 'OPEN',    value: openCount,             color: '#38bdf8' },
          { label: 'TRADES',  value: totalTrades,           color: '#a78bfa' },
          { label: 'BEST',    value: bestTrade ? `+$${bestTrade.pnl?.toFixed(0)}` : '—', color: '#4ade80' },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', padding: '14px 12px' }}>
            <p style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── PAIR PERFORMANCE ───────────────────────────────── */}
      <PairPerformance stats={pairStats} />

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

                {typeof s.rr1 === 'number' && (
                  <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.06)', marginTop: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (s.rr1 / 15) * 100)}%`, borderRadius: 999, background: 'linear-gradient(90deg,#9A7010,#D4AF37,#F5E070)' }} />
                  </div>
                )}

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
          <div style={{ borderRadius: 16, background: '#000', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px', maxHeight: 440, overflowY: 'auto' }}>
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
