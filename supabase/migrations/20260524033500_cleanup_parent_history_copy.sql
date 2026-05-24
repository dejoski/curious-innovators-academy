UPDATE public.student_records
SET body = replace(
    replace(
      replace(
        replace(
          replace(body, 'Ana Lee', 'Anna Lee'),
          'Ana secures',
          'Anna secures'
        ),
        'activity choices',
        'enrichment choices'
      ),
      'student portal',
      'parent dashboard'
    ),
    'select her Enrichment classes',
    'select her enrichment classes'
  )
WHERE body ILIKE '%Ana Lee%'
   OR body ILIKE '%Ana secures%'
   OR body ILIKE '%activity choices%'
   OR body ILIKE '%student portal%'
   OR body ILIKE '%select her Enrichment classes%';
