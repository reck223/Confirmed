import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const CREATOR_EMAIL = 'graysdarius@gmail.com'
const ALLOWED_INTERVALS = new Set(['5m', '15m', '1h', '4h', '1d'])
const ALLOWED_RANGES = new Set(['1d', '5d', '1mo', '3mo'])

type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number }

function yahooSymbol(pair: string): string {
  return pair.toUpperCase().replace('/', '') + '=X'
}

async function fetchYahooBars(pair: string, interval: string, range: string): Promise<Bar[]> {
  const sym = yahooSymbol(pair)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=${interval}&range=${range}`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error(`Yahoo ${sym} ${interval}: ${r.status}`)
  const json = await r.json()
  const result = json?.chart?.result?.[0]
  if (!result) return []
  const ts = result.timestamp ?? []
  const q = result.indicators?.quote?.[0] ?? {}
  const { open: o = [], high: h = [], low: l = [], close: c = [], volume: v = [] } = q
  return ts
    .map((t: number, i: number) => ({
      time: t, // seconds — lightweight-charts wants UTCTimestamp in seconds
      open: parseFloat(o[i]), high: parseFloat(h[i]), low: parseFloat(l[i]), close: parseFloat(c[i]),
      volume: parseFloat(v[i] ?? 0),
    }))
    .filter((b: Bar) => !isNaN(b.open) && !isNaN(b.close))
    .sort((a: Bar, b: Bar) => a.time - b.time)
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== CREATOR_EMAIL) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const pair = searchParams.get('pair')
  const interval = searchParams.get('interval') ?? '1h'
  const range = searchParams.get('range') ?? '5d'
  if (!pair) return NextResponse.json({ error: 'pair required' }, { status: 400 })
  if (!ALLOWED_INTERVALS.has(interval) || !ALLOWED_RANGES.has(range)) {
    return NextResponse.json({ error: 'invalid interval/range' }, { status: 400 })
  }

  try {
    const bars = await fetchYahooBars(pair, interval, range)
    return NextResponse.json({ bars })
  } catch {
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 })
  }
}
