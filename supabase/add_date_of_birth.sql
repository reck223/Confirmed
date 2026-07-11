-- Add date_of_birth to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
