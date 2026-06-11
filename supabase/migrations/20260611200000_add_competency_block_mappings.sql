CREATE TABLE IF NOT EXISTS public.competency_block_mappings (
  competency text NOT NULL,
  level text NOT NULL,
  block_number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competency_block_mappings_pkey PRIMARY KEY (competency, level),
  CONSTRAINT competency_block_mappings_competency_check CHECK (competency IN ('reading', 'math')),
  CONSTRAINT competency_block_mappings_level_check CHECK (length(btrim(level)) > 0),
  CONSTRAINT competency_block_mappings_block_check CHECK (block_number BETWEEN 1 AND 4)
);

CREATE INDEX IF NOT EXISTS competency_block_mappings_block_idx
  ON public.competency_block_mappings (block_number);

ALTER TABLE public.competency_block_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS competency_block_mappings_select_admin ON public.competency_block_mappings;
CREATE POLICY competency_block_mappings_select_admin
  ON public.competency_block_mappings FOR SELECT TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS competency_block_mappings_write_admin ON public.competency_block_mappings;
CREATE POLICY competency_block_mappings_write_admin
  ON public.competency_block_mappings FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
