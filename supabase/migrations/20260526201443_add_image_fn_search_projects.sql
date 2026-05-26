-- Add image field to fn_search_projects results.

CREATE OR REPLACE FUNCTION public.fn_search_projects(
  p_search_term TEXT DEFAULT NULL,
  p_company_id INTEGER DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_rows JSONB;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  SELECT COUNT(*) INTO v_total
  FROM project p
  WHERE p.archived = false
    AND (p_search_term IS NULL OR (
      p.title ILIKE '%' || p_search_term || '%'
      OR p.address ILIKE '%' || p_search_term || '%'
    ))
    AND (p_company_id IS NULL OR p.company_id = p_company_id)
    AND (p_status IS NULL OR p.status = p_status);

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'address', p.address,
      'city', p.city,
      'state', p.state,
      'status', p.status,
      'status_admin', p.status_admin,
      'company_id', p.company_id,
      'user_id', p.user_id,
      'image', p.image,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) AS row_data
    FROM project p
    WHERE p.archived = false
      AND (p_search_term IS NULL OR (
        p.title ILIKE '%' || p_search_term || '%'
        OR p.address ILIKE '%' || p_search_term || '%'
      ))
      AND (p_company_id IS NULL OR p.company_id = p_company_id)
      AND (p_status IS NULL OR p.status = p_status)
    ORDER BY p.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total_count', v_total,
    'page', p_page,
    'page_size', p_page_size
  );
END;
$$;