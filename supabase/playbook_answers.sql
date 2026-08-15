CREATE TABLE IF NOT EXISTS playbook_answers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  lesson_id      text NOT NULL,
  lesson_title   text NOT NULL DEFAULT '',
  module_title   text NOT NULL DEFAULT '',
  module_color   text NOT NULL DEFAULT '',
  module_emoji   text NOT NULL DEFAULT '',
  answer         text NOT NULL DEFAULT '',
  coach_response text,
  updated_at     timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE playbook_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own playbook answers" ON playbook_answers;
CREATE POLICY "Users manage own playbook answers" ON playbook_answers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
