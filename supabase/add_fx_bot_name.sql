-- Multi-bot support: tag every row with which bot instance produced it, so
-- several strategy variants can run concurrently (each against its own
-- TradeLocker demo account) without their data mixing together.
-- Run this in: Supabase Dashboard → SQL Editor

alter table public.fx_signals  add column if not exists bot_name text not null default 'main';
alter table public.fx_trades   add column if not exists bot_name text not null default 'main';
alter table public.fx_bot_log  add column if not exists bot_name text not null default 'main';

create index if not exists fx_signals_bot_name on public.fx_signals (bot_name);
create index if not exists fx_trades_bot_name  on public.fx_trades  (bot_name);
create index if not exists fx_bot_log_bot_name on public.fx_bot_log (bot_name);

-- bot_config was a single shared on/off row controlling "the bot" — with
-- multiple bots that would pause all of them together. Make it one row per
-- bot instead, keyed by name.
alter table public.bot_config add column if not exists bot_name text not null default 'main';
alter table public.bot_config drop constraint if exists bot_config_bot_name_key;
alter table public.bot_config add constraint bot_config_bot_name_key unique (bot_name);
