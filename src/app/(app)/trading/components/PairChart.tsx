'use client'
import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, ColorType, IChartApi, ISeriesApi, IPriceLine, UTCTimestamp } from 'lightweight-charts'
import type { Trade } from '../types'

const REFRESH_MS = 60_000

const DIR_COLOR = (d: string) => d === 'long' ? '#4ade80' : '#f87171'

function Corner({ top, left, right, bottom, color }: { top?: boolean; left?: boolean; right?: boolean; bottom?: boolean; color: string }) {
  return (
    <div style={{
      position: 'absolute', width: 16, height: 16, pointerEvents: 'none', zIndex: 2,
      top: top ? -1 : undefined, bottom: bottom ? -1 : undefined,
      left: left ? -1 : undefined, right: right ? -1 : undefined,
      borderTop: top ? `2px solid ${color}` : undefined,
      borderBottom: bottom ? `2px solid ${color}` : undefined,
      borderLeft: left ? `2px solid ${color}` : undefined,
      borderRight: right ? `2px solid ${color}` : undefined,
    }} />
  )
}

export function PairChart({ trade }: { trade: Trade }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef      = useRef<IChartApi | null>(null)
  const seriesRef      = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const slLineRef       = useRef<IPriceLine | null>(null)
  const [livePrice, setLivePrice] = useState<number | null>(null)

  const color = DIR_COLOR(trade.direction)

  // Create the chart + static reference lines once per trade
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: 'rgba(255,255,255,0.45)', fontFamily: 'Satoshi,sans-serif' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      crosshair: {
        vertLine: { color: 'rgba(212,175,55,0.5)', width: 1, style: 3, labelBackgroundColor: '#D4AF37' },
        horzLine: { color: 'rgba(212,175,55,0.5)', width: 1, style: 3, labelBackgroundColor: '#D4AF37' },
      },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,0.06)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      width: containerRef.current.clientWidth,
      height: 240,
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#4ade80', downColor: '#f87171', borderVisible: false,
      wickUpColor: '#4ade80', wickDownColor: '#f87171',
    })
    chartRef.current = chart
    seriesRef.current = series

    series.createPriceLine({ price: trade.entry, color: 'rgba(239,239,239,0.7)', lineWidth: 1, lineStyle: 3, title: 'ENTRY' })
    slLineRef.current = series.createPriceLine({ price: trade.sl, color: '#f87171', lineWidth: 1, lineStyle: 0, title: 'SL' })
    series.createPriceLine({ price: trade.tp1, color: '#4ade80', lineWidth: 1, lineStyle: 2, title: 'TP1' })
    if (trade.tp2 && trade.tp2 !== trade.tp1) {
      series.createPriceLine({ price: trade.tp2, color: '#22c55e', lineWidth: 1, lineStyle: 2, title: 'TP2' })
    }

    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      chart.applyOptions({ width })
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade.pair])

  // Move the SL line in place (no chart re-init) whenever the trailing stop updates
  useEffect(() => {
    slLineRef.current?.applyOptions({ price: trade.sl })
  }, [trade.sl])

  // Fetch bars on mount + poll
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/fx-bars?pair=${trade.pair}&interval=1h&range=5d`)
        const { bars } = await res.json()
        if (cancelled || !seriesRef.current || !Array.isArray(bars) || !bars.length) return
        seriesRef.current.setData(bars.map((b: { time: number; open: number; high: number; low: number; close: number }) => ({
          time: b.time as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close,
        })))
        setLivePrice(bars[bars.length - 1].close)
      } catch { /* transient fetch failure — next interval retries */ }
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [trade.pair])

  const pnl = trade.pnl ?? 0
  const decimals = trade.pair.toUpperCase().includes('JPY') ? 3 : 5

  return (
    <div style={{
      position: 'relative', borderRadius: 14, background: 'linear-gradient(160deg,#0f0f0f 0%,#080808 100%)',
      border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden',
      boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 12px 32px rgba(0,0,0,0.5), 0 0 24px ${color}14`,
    }}>
      <Corner top left  color={color} />
      <Corner top right color={color} />
      <Corner bottom left  color="rgba(255,255,255,0.12)" />
      <Corner bottom right color="rgba(255,255,255,0.12)" />

      <div style={{ height: 2, background: `linear-gradient(90deg,${color},${color}00)` }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px 9px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="pulse-green" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.03em', color: '#EFEFEF' }}>{trade.pair}</span>
          <span style={{
            fontSize: 9, fontWeight: 900, color, background: `${color}18`, border: `1px solid ${color}33`,
            borderRadius: 5, padding: '2px 6px', letterSpacing: '0.04em',
          }}>
            {trade.direction === 'long' ? '▲ LONG' : '▼ SHORT'}
          </span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: pnl >= 0 ? '#4ade80' : '#f87171' }}>
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <div ref={containerRef} style={{ width: '100%', height: 240 }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 9, fontWeight: 800, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.03em' }}>
          SL {trade.sl.toFixed(decimals)} · TP {trade.tp1.toFixed(decimals)}
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, fontFamily: 'monospace', color: livePrice ? '#EFEFEF' : 'rgba(255,255,255,0.2)' }}>
          {livePrice ? livePrice.toFixed(decimals) : '—'}
        </span>
      </div>
    </div>
  )
}
