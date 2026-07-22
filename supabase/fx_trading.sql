-- Forex Trading Bot schema
-- Run this in: Supabase Dashboard → SQL Editor

-- ── Detected signals ──────────────────────────────────────────────────────────
create table if not exists public.fx_signals (
  id          uuid primary key default gen_random_uuid(),
  pair        text not null,
  setup       text not null,         -- 'A', 'B', or 'C'
  direction   text not null,         -- 'long' or 'short'
  entry       numeric(12,5),
  sl          numeric(12,5),
  tp1         numeric(12,5),
  tp2         numeric(12,5),
  rr1         numeric(6,2),
  rr2         numeric(6,2),
  fib_anchor  numeric(12,5),
  fib_break   numeric(12,5),
  confluence  jsonb default '{}',
  status      text default 'pending',  -- pending | filled | expired | cancelled
  dry_run     boolean default true,
  notes       text default '',
  created_at  timestamptz default now()
);

-- ── Placed trades ─────────────────────────────────────────────────────────────
create table if not exists public.fx_trades (
  id              uuid primary key default gen_random_uuid(),
  pair            text not null,
  setup           text not null,
  direction       text not null,
  entry           numeric(12,5),
  sl              numeric(12,5),
  tp1             numeric(12,5),
  tp2             numeric(12,5),
  rr1             numeric(6,2),
  qty             numeric(10,2),
  equity_at_entry numeric(12,2),
  order_id        text default '',
  close_price     numeric(12,5),
  pnl             numeric(12,2),
  pips            numeric(8,1),
  status          text default 'open',   -- open | closed | cancelled
  close_reason    text default '',       -- tp1 | tp2 | sl | manual
  opened_at       timestamptz default now(),
  closed_at       timestamptz
);

-- ── Bot activity log ──────────────────────────────────────────────────────────
create table if not exists public.fx_bot_log (
  id         uuid primary key default gen_random_uuid(),
  level      text not null,     -- INFO | SIGNAL | TRADE | ERROR
  message    text not null,
  data       jsonb default '{}',
  created_at timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists fx_signals_created_at on public.fx_signals (created_at desc);
create index if not exists fx_trades_status       on public.fx_trades (status);
create index if not exists fx_trades_opened_at    on public.fx_trades (opened_at desc);
create index if not exists fx_bot_log_created_at  on public.fx_bot_log (created_at desc);

-- ── RLS: creator-only read (no public access) ─────────────────────────────────
alter table public.fx_signals  enable row level security;
alter table public.fx_trades   enable row level security;
alter table public.fx_bot_log  enable row level security;

-- Only authenticated users whose email matches the creator can read
create policy "creator only" on public.fx_signals
  for all using (auth.jwt() ->> 'email' = 'graysdarius@gmail.com');

create policy "creator only" on public.fx_trades
  for all using (auth.jwt() ->> 'email' = 'graysdarius@gmail.com');

create policy "creator only" on public.fx_bot_log
  for all using (auth.jwt() ->> 'email' = 'graysdarius@gmail.com');
