-- Goal recommendations: "I think you'd crush this" — one user pushes a
-- goal (their own, or any public goal they admire) at a specific friend.
-- Snapshotted (title/category/goal_type/milestones) at send time rather
-- than referencing the source goal live, so it still makes sense if the
-- source goal is later edited, completed, or deleted.
create table if not exists goal_recommendations (
  id              uuid default gen_random_uuid() primary key,
  sender_id       uuid references profiles(id) on delete cascade not null,
  recipient_id    uuid references profiles(id) on delete cascade not null,
  source_goal_id  uuid references goals(id) on delete set null,
  title           text not null check (char_length(title) between 1 and 120),
  category        text,
  goal_type       text not null default 'standard',
  milestones      jsonb not null default '[]',
  note            text check (char_length(note) <= 300),
  status          text not null default 'pending'
                    check (status in ('pending', 'adopted', 'passed')),
  adopted_goal_id uuid references goals(id) on delete set null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index if not exists goal_recommendations_recipient_idx on goal_recommendations(recipient_id, status);

alter table goal_recommendations enable row level security;

create policy "users view own recommendations"
  on goal_recommendations for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "users send recommendations"
  on goal_recommendations for insert
  with check (sender_id = auth.uid());

-- Recipient adopts/passes; sender has no reason to update after sending,
-- but included for symmetry (e.g. a future "retract" action).
create policy "sender or recipient update recommendation"
  on goal_recommendations for update
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
