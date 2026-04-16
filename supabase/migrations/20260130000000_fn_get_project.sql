-- fn_get_project: fetch a single project by ID (SECURITY DEFINER to bypass RLS)

CREATE OR REPLACE FUNCTION public.fn_get_project(
  p_project_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT row_to_json(p.*)::jsonb INTO v_result
  FROM project p
  WHERE p.id = p_project_id
    AND p.archived = false;

  RETURN v_result;
END;
$$;
