ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS planner_subject text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS planner_summary text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS teacher_guide_objectives text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS teacher_guide_information text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS teacher_guide_summary text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS student_guide_objectives text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS student_guide_information text;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS student_guide_summary text;
