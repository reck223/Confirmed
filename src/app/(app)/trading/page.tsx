import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { TradingClient } from './TradingClient'

const CREATOR_EMAIL = 'graysdarius@gmail.com'

type FxSignal = {
  id: string; pair: string; setup: string; direction: string
  entry: number; sl: number; tp1: number; tp2: number
  rr1: number; rr2: number; status: string; dry_run: boolean
  notes: string; created_at: string
  confluence: { rsi?: number; ema_trend?: string; price_vs_ema?: string }
}

type FxTrade = {
  id: string; pair: string; setup: string; direction: string
  entry: number; sl: number; tp1: number; tp2: number
  qty: number; pnl: number | null; status: string
  close_reason: string; opened_at: string; closed_at: string | null
}

type BotLog = {
  id: string; level: string; message: string; created_at: string
}

export default async function TradingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (user.email !== CREATOR_EMAIL) redirect('/home')

  const [
    { data: signalsRaw },
    { data: tradesRaw  },
    { data: logsRaw    },
  ] = await Promise.all([
    supabase.from('fx_signals')
      .select('id,pair,setup,direction,entry,sl,tp1,tp2,rr1,rr2,status,dry_run,notes,created_at,confluence')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('fx_trades')
      .select('id,pair,setup,direction,entry,sl,tp1,tp2,qty,pnl,status,close_reason,opened_at,closed_at')
      .order('opened_at', { ascending: false })
      .limit(30),
    supabase.from('fx_bot_log')
      .select('id,level,message,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const signals  = (signalsRaw ?? []) as FxSignal[]
  const trades   = (tradesRaw  ?? []) as FxTrade[]
  const logs     = (logsRaw    ?? []) as BotLog[]

  // Summary stats
  const closedTrades  = trades.filter(t => t.status === 'closed')
  const openTrades    = trades.filter(t => t.status === 'open')
  const totalPnl      = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const winCount      = closedTrades.filter(t => (t.pnl ?? 0) > 0).length
  const winRate       = closedTrades.length ? Math.round((winCount / closedTrades.length) * 100) : null

  return (
    <TradingClient
      signals={signals}
      trades={trades}
      logs={logs}
      openCount={openTrades.length}
      totalPnl={totalPnl}
      winRate={winRate}
      totalTrades={closedTrades.length}
    />
  )
}
