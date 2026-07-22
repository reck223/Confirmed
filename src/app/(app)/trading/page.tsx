import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { TradingClient } from './TradingClient'
import { toggleBot }     from './actions'
import type { Signal as FxSignal, Trade as FxTrade, Log as BotLog, PairStat } from './types'

const CREATOR_EMAIL = 'graysdarius@gmail.com'

export default async function TradingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  if (user.email !== CREATOR_EMAIL) redirect('/home')

  const [
    { data: signalsRaw },
    { data: tradesRaw  },
    { data: logsRaw    },
    { data: botConfigRaw },
  ] = await Promise.all([
    supabase.from('fx_signals')
      .select('id,pair,setup,direction,entry,sl,tp1,tp2,rr1,rr2,status,dry_run,notes,created_at,fib_anchor,fib_break,confluence')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('fx_trades')
      .select('id,pair,setup,direction,entry,sl,tp1,tp2,qty,pnl,status,close_reason,opened_at,closed_at')
      .order('opened_at', { ascending: false })
      .limit(60),
    supabase.from('fx_bot_log')
      .select('id,level,message,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('bot_config') as any).select('running,dry_run').limit(1).single(),
  ])

  const signals   = (signalsRaw ?? []) as FxSignal[]
  const trades    = (tradesRaw  ?? []) as FxTrade[]
  const logs      = (logsRaw    ?? []) as BotLog[]
  const botRunning = (botConfigRaw as { running?: boolean } | null)?.running ?? false

  // Summary stats
  const closedTrades  = trades.filter(t => t.status === 'closed')
  const openTrades    = trades.filter(t => t.status === 'open')
  const totalPnl      = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const winCount      = closedTrades.filter(t => (t.pnl ?? 0) > 0).length
  const winRate       = closedTrades.length ? Math.round((winCount / closedTrades.length) * 100) : null

  // Equity curve — cumulative P&L over closed trades, oldest to newest
  const equityCurve = [...closedTrades]
    .filter(t => t.closed_at)
    .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime())
    .reduce<number[]>((acc, t) => {
      acc.push((acc.length ? acc[acc.length - 1] : 0) + (t.pnl ?? 0))
      return acc
    }, [0])

  // Per-pair breakdown
  const pairStats: PairStat[] = Object.values(
    closedTrades.reduce<Record<string, PairStat>>((acc, t) => {
      const entry = acc[t.pair] ?? { pair: t.pair, count: 0, wins: 0, pnl: 0 }
      entry.count += 1
      if ((t.pnl ?? 0) > 0) entry.wins += 1
      entry.pnl += t.pnl ?? 0
      acc[t.pair] = entry
      return acc
    }, {})
  ).sort((a, b) => b.pnl - a.pnl)

  const bestTrade = closedTrades.reduce<FxTrade | null>(
    (best, t) => ((t.pnl ?? -Infinity) > (best?.pnl ?? -Infinity) ? t : best), null
  )

  return (
    <TradingClient
      signals={signals}
      trades={trades}
      logs={logs}
      openCount={openTrades.length}
      openTrades={openTrades}
      totalPnl={totalPnl}
      winRate={winRate}
      totalTrades={closedTrades.length}
      botRunning={botRunning}
      toggleBot={toggleBot}
      equityCurve={equityCurve}
      pairStats={pairStats}
      bestTrade={bestTrade}
    />
  )
}
