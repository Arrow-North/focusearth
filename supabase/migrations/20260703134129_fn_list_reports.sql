-- fn_list_reports: fetch all active reports for a project, ordered by sort_id then created_at

CREATE OR REPLACE FUNCTION public.fn_list_reports(
  p_project_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(r.*) ORDER BY r.sort_id NULLS LAST, r.created_at)
      FROM report r
      WHERE r.project_id = p_project_id
        AND r.active = true
    ),
    '[]'::jsonb
  );
END;
$$;
