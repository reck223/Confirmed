export type Signal = {
  id: string; pair: string; setup: string; direction: string
  entry: number; sl: number; tp1: number; tp2: number
  rr1: number; rr2: number; status: string; dry_run: boolean
  notes: string; created_at: string
  fib_anchor: number | null; fib_break: number | null
  confluence: { rsi?: number; ema_trend?: string; price_vs_ema?: string }
}

export type Trade = {
  id: string; pair: string; setup: string; direction: string
  entry: number; sl: number; tp1: number; tp2: number; qty: number
  pnl: number | null; status: string; close_reason: string
  opened_at: string; closed_at: string | null
}

export type Log = { id: string; level: string; message: string; created_at: string }

export type PairStat = { pair: string; count: number; wins: number; pnl: number }
