-- Connections: time-bound accountability covenants between two people
create table if not exists connections (
  id            uuid default gen_random_uuid() primary key,
  proposer_id   uuid references profiles(id) on delete cascade not null,
  receiver_id   uuid references profiles(id) on delete cascade not null,
  title         text not null check (char_length(title) between 1 and 80),
  commitment    text not null check (char_length(commitment) between 1 and 400),
  duration_days int  not null check (duration_days in (7, 14, 30, 60, 90)),
  start_date    date,
  end_date      date,
  status        text not null default 'pending'
                  check (status in ('pending', 'active', 'completed', 'declined')),
  outcome_proposer text check (outcome_proposer in ('kept', 'broken')),
  outcome_receiver text check (outcome_receiver in ('kept', 'broken')),
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null,
  -- only one active/pending connection per pair at a time
  unique(proposer_id, receiver_id)
);

alter table connections enable row level security;

-- Both parties can see their own connections
create policy "users view own connections"
  on connections for select
  using (auth.uid() = proposer_id or auth.uid() = receiver_id);

create policy "users propose connections"
  on connections for insert
  with check (proposer_id = auth.uid());

-- Both parties can update (receiver accepts/declines, both record outcome)
create policy "users update own connections"
  on connections for update
  using (auth.uid() = proposer_id or auth.uid() = receiver_id);
