-- Allow circle members to view circles they belong to.
-- Without this, only the creator could SELECT the circle row, so
-- joined (non-creator) members saw "No Circle" instead of the War Room.

create policy "Members can view their circles"
  on public.circles for select
  using (
    exists (
      select 1 from public.circle_members
      where circle_members.circle_id = circles.id
        and circle_members.user_id = auth.uid()
    )
  );
