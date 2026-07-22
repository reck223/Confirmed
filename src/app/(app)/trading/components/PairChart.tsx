'use client'
import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, IChartApi, ISeriesApi, IPriceLine, UTCTimestamp } from 'lightweight-charts'
import type { Trade } from '../types'

const REFRESH_MS = 60_000

const DIR_COLOR = (d: string) => d === 'long' ? '#4ade80' : '#f87171'

export function PairChart({ trade }: { trade: Trade }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef      = useRef<IChartApi | null>(null)
  const seriesRef      = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const slLineRef       = useRef<IPriceLine | null>(null)

  // Create the chart + static reference lines once per trade
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#0d0d0d' }, textColor: 'rgba(255,255,255,0.5)' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
      timeScale: { timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: 260,
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#4ade80', downColor: '#f87171', borderVisible: false,
      wickUpColor: '#4ade80', wickDownColor: '#f87171',
    })
    chartRef.current = chart
    seriesRef.current = series

    series.createPriceLine({ price: trade.entry, color: '#EFEFEF', lineWidth: 1, lineStyle: 2, title: 'Entry' })
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
        if (cancelled || !seriesRef.current || !Array.isArray(bars)) return
        seriesRef.current.setData(bars.map((b: { time: number; open: number; high: number; low: number; close: number }) => ({
          time: b.time as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close,
        })))
      } catch { /* transient fetch failure — next interval retries */ }
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [trade.pair])

  const pnl = trade.pnl ?? 0
  return (
    <div style={{ borderRadius: 16, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: '#EFEFEF' }}>{trade.pair}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: DIR_COLOR(trade.direction) }}>
            {trade.direction === 'long' ? '▲' : '▼'} {trade.direction.toUpperCase()}
          </span>
          <span className="pulse-green" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 900, color: pnl >= 0 ? '#4ade80' : '#f87171' }}>
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
        </span>
      </div>
      <div ref={containerRef} style={{ width: '100%', height: 260 }} />
    </div>
  )
}
