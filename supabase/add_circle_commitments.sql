-- Weekly commitments for circles
create table if not exists circle_commitments (
  id            uuid default gen_random_uuid() primary key,
  circle_id     uuid references circles(id) on delete cascade not null,
  user_id       uuid references profiles(id) on delete cascade not null,
  week_start    date not null,
  text          text not null check (char_length(text) between 1 and 280),
  status        text not null default 'active' check (status in ('active', 'done', 'failed')),
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null,
  unique(circle_id, user_id, week_start)
);

-- Who witnessed each commitment (one row per witness per commitment)
create table if not exists commitment_witnesses (
  commitment_id uuid references circle_commitments(id) on delete cascade not null,
  user_id       uuid references profiles(id) on delete cascade not null,
  created_at    timestamptz default now() not null,
  primary key(commitment_id, user_id)
);

-- RLS
alter table circle_commitments enable row level security;
alter table commitment_witnesses enable row level security;

-- Circle members can read commitments for their circles
create policy "circle members can view commitments"
  on circle_commitments for select
  using (
    exists (
      select 1 from circle_members
      where circle_members.circle_id = circle_commitments.circle_id
        and circle_members.user_id = auth.uid()
    )
  );

create policy "users insert own commitments"
  on circle_commitments for insert
  with check (user_id = auth.uid());

create policy "users update own commitments"
  on circle_commitments for update
  using (user_id = auth.uid());

-- Witnesses: any authenticated user can read/insert (you must be in the circle to see commitments anyway)
create policy "authenticated can view witnesses"
  on commitment_witnesses for select
  using (auth.role() = 'authenticated');

create policy "users insert own witness"
  on commitment_witnesses for insert
  with check (user_id = auth.uid());
