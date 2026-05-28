-- Persist student profile photos from the canonical student row.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS avatar_url text;
