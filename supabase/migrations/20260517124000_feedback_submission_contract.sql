-- Parent feedback form fields for structured submissions.
-- Safe to run after 20260429120000_track2_rls_schema.sql.

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS mood text,
  ADD COLUMN IF NOT EXISTS nps_score smallint CHECK (nps_score IS NULL OR (nps_score >= 1 AND nps_score <= 10)),
  ADD COLUMN IF NOT EXISTS rating_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS highlight text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS feedback_author_created_idx
  ON public.feedback (author_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_created_idx
  ON public.feedback (created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_feedback_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedback_touch_updated_at ON public.feedback;
CREATE TRIGGER feedback_touch_updated_at
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.touch_feedback_updated_at();
