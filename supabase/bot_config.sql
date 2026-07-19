-- Bot control config — run in Supabase SQL Editor

create table if not exists public.bot_config (
  id         uuid primary key default gen_random_uuid(),
  running    boolean default false,
  dry_run    boolean default true,
  updated_at timestamptz default now()
);

-- Insert the single control row (idempotent)
insert into public.bot_config (running, dry_run)
values (false, true)
on conflict do nothing;

alter table public.bot_config enable row level security;

create policy "creator only" on public.bot_config
  for all using (auth.jwt() ->> 'email' = 'graysdarius@gmail.com');
