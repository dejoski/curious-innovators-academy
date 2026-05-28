-- Durable enrichment decision history. class_requests remains the pending queue;
-- this table preserves final outcomes after the queue row is consumed.

CREATE TABLE IF NOT EXISTS public.class_request_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_request_id uuid,
  student_id uuid NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  requested_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  decided_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  status public.workflow_status NOT NULL,
  block text,
  level text,
  option_label text,
  reason text,
  requested_at timestamptz,
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_request_decisions_no_pending CHECK (status <> 'pending')
);

CREATE INDEX IF NOT EXISTS class_request_decisions_student_idx
  ON public.class_request_decisions (student_id, decided_at DESC);

CREATE INDEX IF NOT EXISTS class_request_decisions_class_idx
  ON public.class_request_decisions (class_id, decided_at DESC);

CREATE INDEX IF NOT EXISTS class_request_decisions_original_request_idx
  ON public.class_request_decisions (original_request_id);

ALTER TABLE public.class_request_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_request_decisions_select ON public.class_request_decisions;
CREATE POLICY class_request_decisions_select
  ON public.class_request_decisions FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR private.parent_can_see_student(class_request_decisions.student_id)
    OR private.student_is_self(class_request_decisions.student_id)
    OR private.teacher_owns_class(class_request_decisions.class_id)
  );

DROP POLICY IF EXISTS class_request_decisions_insert_admin_or_teacher ON public.class_request_decisions;
CREATE POLICY class_request_decisions_insert_admin_or_teacher
  ON public.class_request_decisions FOR INSERT TO authenticated
  WITH CHECK (
    private.is_admin()
    OR private.teacher_owns_class(class_request_decisions.class_id)
  );
