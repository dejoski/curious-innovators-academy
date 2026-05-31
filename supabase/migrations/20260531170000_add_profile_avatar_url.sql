-- Persist editable account profile photos for admins, parents, and teachers.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
