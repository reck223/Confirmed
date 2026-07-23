'use client'
import { useRef, useState } from 'react'
import type { Trade } from '../types'
import { useTradeChart, type Timeframe } from './useTradeChart'
import { TimeframeSwitcher } from './TimeframeSwitcher'

const DIR_COLOR = (d: string) => d === 'long' ? '#4ade80' : '#f87171'

function Corner({ top, left, right, bottom, color }: { top?: boolean; left?: boolean; right?: boolean; bottom?: boolean; color: string }) {
  return (
    <div style={{
      position: 'absolute', width: 20, height: 20, pointerEvents: 'none', zIndex: 3,
      top: top ? 0 : undefined, bottom: bottom ? 0 : undefined,
      left: left ? 0 : undefined, right: right ? 0 : undefined,
      borderTop: top ? `2px solid ${color}` : undefined,
      borderBottom: bottom ? `2px solid ${color}` : undefined,
      borderLeft: left ? `2px solid ${color}` : undefined,
      borderRight: right ? `2px solid ${color}` : undefined,
      borderTopLeftRadius: top && left ? 14 : undefined,
      borderTopRightRadius: top && right ? 14 : undefined,
      borderBottomLeftRadius: bottom && left ? 14 : undefined,
      borderBottomRightRadius: bottom && right ? 14 : undefined,
      filter: `drop-shadow(0 0 4px ${color}88)`,
    }} />
  )
}

interface Props {
  trade: Trade
  onExpand: (tradeId: string, timeframe: Timeframe) => void
}

export function PairChart({ trade, onExpand }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [timeframe, setTimeframe] = useState<Timeframe>('1H')
  const { livePrice, loaded } = useTradeChart(containerRef, trade, timeframe, 240)

  const color = DIR_COLOR(trade.direction)
  const pnl = trade.pnl ?? 0
  const decimals = trade.pair.toUpperCase().includes('JPY') ? 3 : 5
  const priceChange = livePrice != null ? livePrice - trade.entry : null
  const priceChangePips = priceChange != null ? priceChange / (decimals === 3 ? 0.01 : 0.0001) : null

  return (
    <div style={{
      position: 'relative', borderRadius: 14, background: 'linear-gradient(160deg,#111214 0%,#08090a 100%)',
      border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
      boxShadow: `0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 40px rgba(0,0,0,0.55), 0 0 32px ${color}1a`,
    }}>
      <Corner top left  color={color} />
      <Corner top right color={color} />
      <Corner bottom left  color="rgba(255,255,255,0.14)" />
      <Corner bottom right color="rgba(255,255,255,0.14)" />

      <div style={{ height: 2, background: `linear-gradient(90deg,${color},${color}00 70%)` }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px 9px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="pulse-green" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.04em', color: '#EFEFEF' }}>{trade.pair}</span>
          <span style={{
            fontSize: 9, fontWeight: 900, color, background: `${color}18`, border: `1px solid ${color}33`,
            borderRadius: 5, padding: '2px 6px', letterSpacing: '0.05em',
          }}>
            {trade.direction === 'long' ? '▲ LONG' : '▼ SHORT'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 14, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: pnl >= 0 ? '#4ade80' : '#f87171', lineHeight: 1 }}>
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
          </p>
          {priceChangePips != null && (
            <p style={{ fontSize: 8, fontWeight: 800, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              {priceChangePips >= 0 ? '+' : ''}{priceChangePips.toFixed(1)}p
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 14px 8px' }}>
        <TimeframeSwitcher value={timeframe} onChange={setTimeframe} />
      </div>

      <div
        onClick={() => onExpand(trade.id, timeframe)}
        style={{ position: 'relative', background: 'rgba(0,0,0,0.2)', cursor: 'pointer' }}
        title="Click to expand"
      >
        <div ref={containerRef} style={{ width: '100%', height: 240 }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 3px)',
        }} />
        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(212,175,55,0.15)', borderTopColor: '#D4AF37', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)' }}>LOADING CHART</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px 11px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 9, fontWeight: 800, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.02em' }}>
          <span style={{ color: '#f87171' }}>SL</span> {trade.sl.toFixed(decimals)} <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span> <span style={{ color: '#4ade80' }}>TP</span> {trade.tp1.toFixed(decimals)}
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, fontFamily: 'monospace', color: livePrice ? '#EFEFEF' : 'rgba(255,255,255,0.2)' }}>
          {livePrice ? livePrice.toFixed(decimals) : '—'}
        </span>
      </div>
    </div>
  )
}
