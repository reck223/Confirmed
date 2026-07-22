-- Forex bot: position reconciliation + live dashboard updates
-- Run this in: Supabase Dashboard → SQL Editor

-- Tracks the TradeLocker position id so the bot can detect when a trade closes
alter table public.fx_trades add column if not exists position_id text;
create index if not exists fx_trades_position_id on public.fx_trades (position_id);

-- Enable Realtime so the dashboard updates itself without a manual refresh
alter publication supabase_realtime add table public.fx_trades;
alter publication supabase_realtime add table public.fx_signals;
alter publication supabase_realtime add table public.fx_bot_log;
