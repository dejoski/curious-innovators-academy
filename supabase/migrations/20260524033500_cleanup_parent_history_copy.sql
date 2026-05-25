UPDATE public.student_records
SET body = replace(
    replace(
      replace(
        body,
        'student portal',
        'parent dashboard'
      ),
      'activity choices',
      'enrichment choices'
    ),
    'select her Enrichment classes',
    'select her enrichment classes'
  )
WHERE body ILIKE '%activity choices%'
   OR body ILIKE '%student portal%'
   OR body ILIKE '%select her Enrichment classes%';
