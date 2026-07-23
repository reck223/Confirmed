'use client'
import { useEffect, useRef, useState } from 'react'
import type { Trade } from '../types'
import { useTradeChart, type Timeframe } from './useTradeChart'
import { TimeframeSwitcher } from './TimeframeSwitcher'

const DIR_COLOR = (d: string) => d === 'long' ? '#4ade80' : '#f87171'

interface Props {
  trade: Trade
  initialTimeframe: Timeframe
  onClose: () => void
}

export function ChartModal({ trade, initialTimeframe, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe)
  const { livePrice, loaded } = useTradeChart(containerRef, trade, timeframe, 560)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const color = DIR_COLOR(trade.direction)
  const pnl = trade.pnl ?? 0
  const decimals = trade.pair.toUpperCase().includes('JPY') ? 3 : 5

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 9001,
          width: '90vw', maxWidth: 1100, height: '80vh',
          borderRadius: 18, background: 'linear-gradient(160deg,#121316 0%,#08090a 100%)',
          border: '1px solid rgba(255,255,255,0.1)', boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 48px ${color}22`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ height: 2, background: `linear-gradient(90deg,${color},${color}00 70%)`, flexShrink: 0 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="pulse-green" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.03em', color: '#EFEFEF' }}>{trade.pair}</span>
            <span style={{
              fontSize: 10, fontWeight: 900, color, background: `${color}18`, border: `1px solid ${color}33`,
              borderRadius: 6, padding: '3px 8px', letterSpacing: '0.05em',
            }}>
              {trade.direction === 'long' ? '▲ LONG' : '▼ SHORT'}
            </span>
            <span style={{ fontSize: 16, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: pnl >= 0 ? '#4ade80' : '#f87171' }}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <TimeframeSwitcher value={timeframe} onChange={setTimeframe} />
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>
        </div>

        <div style={{ position: 'relative', flex: 1, background: 'rgba(0,0,0,0.2)' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
          {!loaded && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(212,175,55,0.15)', borderTopColor: '#D4AF37', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)' }}>LOADING CHART</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}>
            <span style={{ color: 'rgba(239,239,239,0.7)' }}>ENTRY</span> {trade.entry.toFixed(decimals)}
            {' · '}<span style={{ color: '#f87171' }}>SL</span> {trade.sl.toFixed(decimals)}
            {' · '}<span style={{ color: '#4ade80' }}>TP1</span> {trade.tp1.toFixed(decimals)}
            {trade.tp2 && trade.tp2 !== trade.tp1 && <>{' · '}<span style={{ color: '#22c55e' }}>TP2</span> {trade.tp2.toFixed(decimals)}</>}
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: livePrice ? '#EFEFEF' : 'rgba(255,255,255,0.2)' }}>
            {livePrice ? livePrice.toFixed(decimals) : '—'}
          </span>
        </div>
      </div>
    </>
  )
}
