-- Goal watching: users watch specific goals to get notified on updates
create table if not exists goal_watchers (
  goal_id    uuid references goals(id) on delete cascade not null,
  user_id    uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key(goal_id, user_id)
);

alter table goal_watchers enable row level security;

create policy "anyone authenticated can view watchers"
  on goal_watchers for select
  using (auth.role() = 'authenticated');

create policy "users manage own watches"
  on goal_watchers for insert
  with check (user_id = auth.uid());

create policy "users delete own watches"
  on goal_watchers for delete
  using (user_id = auth.uid());
