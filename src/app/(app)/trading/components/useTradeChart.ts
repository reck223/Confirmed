import { useEffect, useRef, useState, type RefObject } from 'react'
import { createChart, CandlestickSeries, ColorType, IChartApi, ISeriesApi, IPriceLine, UTCTimestamp } from 'lightweight-charts'
import type { Trade } from '../types'

const REFRESH_MS = 60_000

export type Timeframe = '15m' | '1H' | '4H' | '1D'

export const TIMEFRAMES: Record<Timeframe, { interval: string; range: string }> = {
  '15m': { interval: '15m', range: '1d' },
  '1H':  { interval: '1h',  range: '5d' },
  '4H':  { interval: '4h',  range: '1mo' },
  '1D':  { interval: '1d',  range: '3mo' },
}

// Shared chart-creation logic for the compact card and the fullscreen modal.
// Chart init only depends on trade.pair (never torn down for a timeframe
// change) — only the bars fetch re-runs when timeframe changes.
export function useTradeChart(containerRef: RefObject<HTMLDivElement | null>, trade: Trade, timeframe: Timeframe, height = 240) {
  const chartRef  = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const slLineRef = useRef<IPriceLine | null>(null)
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Create the chart + static reference lines once per trade
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: 'rgba(255,255,255,0.45)', fontFamily: 'Satoshi,sans-serif', attributionLogo: false },
      grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      crosshair: {
        vertLine: { color: 'rgba(212,175,55,0.5)', width: 1, style: 3, labelBackgroundColor: '#D4AF37' },
        horzLine: { color: 'rgba(212,175,55,0.5)', width: 1, style: 3, labelBackgroundColor: '#D4AF37' },
      },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,0.06)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
      width: containerRef.current.clientWidth,
      height,
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

  // Fetch bars on mount, on timeframe change, and poll
  useEffect(() => {
    let cancelled = false
    const { interval, range } = TIMEFRAMES[timeframe]
    async function load() {
      try {
        const res = await fetch(`/api/fx-bars?pair=${trade.pair}&interval=${interval}&range=${range}`)
        const { bars } = await res.json()
        if (cancelled || !seriesRef.current || !Array.isArray(bars) || !bars.length) return
        seriesRef.current.setData(bars.map((b: { time: number; open: number; high: number; low: number; close: number }) => ({
          time: b.time as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close,
        })))
        setLivePrice(bars[bars.length - 1].close)
        setLoaded(true)
      } catch { /* transient fetch failure — next interval retries */ }
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [trade.pair, timeframe])

  return { livePrice, loaded }
}
