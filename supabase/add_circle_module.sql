-- Circle creator gating: module completion + creator approval
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS circle_module_complete   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS circle_creator_approved  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS circle_creator_requested boolean NOT NULL DEFAULT false;
