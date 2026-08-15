-- circle_settings: covenant storage, written via a direct postgres
-- connection (see circle/actions.ts updateCircleCovenant) rather than
-- PostgREST — PostgREST's schema cache doesn't reliably pick up new
-- tables/columns without a manual reload, so covenant writes bypass it
-- entirely. This table was already assumed live by circle/actions.ts and
-- circle/page.tsx with no migration ever committed for it; this is that
-- migration.
create table if not exists circle_settings (
  circle_id  uuid primary key references circles(id) on delete cascade,
  covenant   text,
  updated_at timestamptz default now() not null
);

alter table circle_settings enable row level security;

-- Circle members can read their circle's settings (page.tsx fetches this
-- for every circle the signed-in user belongs to).
create policy "circle members can view settings"
  on circle_settings for select
  using (
    exists (
      select 1 from circle_members
      where circle_members.circle_id = circle_settings.circle_id
        and circle_members.user_id = auth.uid()
    )
  );

-- Writes normally go through the raw postgres connection in
-- updateCircleCovenant (already gated there on created_by = auth.uid()
-- before it runs), which bypasses RLS — these exist for defense-in-depth
-- in case that ever changes to a PostgREST-based write.
create policy "circle creator can insert settings"
  on circle_settings for insert
  with check (
    exists (
      select 1 from circles
      where circles.id = circle_settings.circle_id
        and circles.created_by = auth.uid()
    )
  );

create policy "circle creator can update settings"
  on circle_settings for update
  using (
    exists (
      select 1 from circles
      where circles.id = circle_settings.circle_id
        and circles.created_by = auth.uid()
    )
  );
