-- Contact submissions are reviewed exclusively by the SuperAdmin experience.
-- This follow-up migration keeps the RPC authorization aligned with that UI
-- and bounds requested page sizes.

CREATE OR REPLACE FUNCTION public.fn_list_contact_submissions(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 100);
  v_offset INTEGER;
  v_total BIGINT;
  v_rows JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND type = 'SUPERADMIN'
      AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'SuperAdmin privileges required';
  END IF;

  v_offset := (v_page - 1) * v_page_size;

  SELECT COUNT(*) INTO v_total
  FROM contact c
  WHERE c.submitter_id IS NOT NULL;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at_value DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      c.created_at AS created_at_value,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'phone', c.phone,
        'email', c.email,
        'subject', c.subject,
        'message', c.message,
        'status', c.status,
        'company_id', c.company_id,
        'company_name', COALESCE(c.company_name, co.name),
        'submitter_id', c.submitter_id,
        'assigned_to', c.assigned_to,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'submitter', jsonb_build_object(
          'id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'email', p.email,
          'type', p.type
        ),
        'assignee', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', a.id,
          'first_name', a.first_name,
          'last_name', a.last_name,
          'email', a.email
        ) END
      ) AS row_data
    FROM contact c
    LEFT JOIN profiles p ON p.id = c.submitter_id
    LEFT JOIN profiles a ON a.id = c.assigned_to
    LEFT JOIN company co ON co.id = c.company_id
    WHERE c.submitter_id IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT v_page_size OFFSET v_offset
  ) rows;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total_count', v_total,
    'page', v_page,
    'page_size', v_page_size
  );
END;
$$;
