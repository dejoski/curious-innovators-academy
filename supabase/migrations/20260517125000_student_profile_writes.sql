-- Student profile edit and structured timeline note support.
-- Safe to run after 20260429120000_track2_rls_schema.sql.

ALTER TABLE public.student_records
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General' CHECK (category IN ('Academic', 'Behavioral', 'General')),
  ADD COLUMN IF NOT EXISTS urgent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS student_records_category_created_idx
  ON public.student_records (category, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_student_records_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_records_touch_updated_at ON public.student_records;
CREATE TRIGGER student_records_touch_updated_at
BEFORE UPDATE ON public.student_records
FOR EACH ROW
EXECUTE FUNCTION public.touch_student_records_updated_at();
