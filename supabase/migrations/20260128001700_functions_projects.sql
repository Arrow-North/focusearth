-- 17_functions_projects.sql
-- Project CRUD, status changes, search

------------------------------------------------------------
-- fn_create_project
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_project(
  p_title TEXT,
  p_company_id INTEGER DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_address2 TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_zip_code INTEGER DEFAULT NULL,
  p_property_type TEXT DEFAULT NULL,
  p_property_size TEXT DEFAULT NULL,
  p_property_priorities JSONB DEFAULT NULL,
  p_areas JSONB DEFAULT NULL,
  p_cost_per_kilowatt_hour TEXT DEFAULT NULL,
  p_sales_tax TEXT DEFAULT NULL,
  p_operation_days_per_year INTEGER DEFAULT NULL,
  p_notes JSONB DEFAULT NULL,
  p_status TEXT DEFAULT 'new',
  p_status_admin TEXT DEFAULT 'new'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id INTEGER;
  v_user_name TEXT;
  v_user_type TEXT;
BEGIN
  INSERT INTO project (
    user_id, company_id, title, address, address2, state, city, zip_code,
    property_type, property_size, property_priorities, areas,
    cost_per_kilowatt_hour, sales_tax, operation_days_per_year, notes,
    status, status_admin, priority_admin, archived, created_at, updated_at
  ) VALUES (
    auth.uid(), p_company_id, p_title, p_address, p_address2, p_state, p_city, p_zip_code,
    p_property_type, p_property_size, p_property_priorities, p_areas,
    p_cost_per_kilowatt_hour, p_sales_tax, p_operation_days_per_year, p_notes,
    p_status, p_status_admin, false, false, NOW(), NOW()
  )
  RETURNING id INTO v_project_id;

  -- Add creator to user_project
  INSERT INTO user_project (user_id, project_id) VALUES (auth.uid(), v_project_id);

  -- Create activity log
  SELECT first_name || ' ' || last_name, type::text
  INTO v_user_name, v_user_type
  FROM profiles WHERE id = auth.uid();

  INSERT INTO activity (user_id, user_name, user_type, action, action_id, project_id, project_title, created_at)
  VALUES (auth.uid(), v_user_name, v_user_type, 2, 0, v_project_id, p_title, NOW());

  RETURN v_project_id;
END;
$$;

------------------------------------------------------------
-- fn_update_project
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_update_project(
  p_project_id INTEGER,
  p_fields JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_old_record JSONB;
BEGIN
  SELECT to_jsonb(p.*) INTO v_old_record FROM project p WHERE p.id = p_project_id;

  UPDATE project SET
    title = COALESCE(p_fields->>'title', title),
    address = COALESCE(p_fields->>'address', address),
    address2 = COALESCE(p_fields->>'address2', address2),
    state = COALESCE(p_fields->>'state', state),
    city = COALESCE(p_fields->>'city', city),
    zip_code = COALESCE((p_fields->>'zip_code')::INTEGER, zip_code),
    property_type = COALESCE(p_fields->>'property_type', property_type),
    property_size = COALESCE(p_fields->>'property_size', property_size),
    property_priorities = COALESCE(p_fields->'property_priorities', property_priorities),
    areas = COALESCE(p_fields->'areas', areas),
    notes = COALESCE(p_fields->'notes', notes),
    files = COALESCE(p_fields->'files', files),
    proposals = COALESCE(p_fields->'proposals', proposals),
    cost_per_kilowatt_hour = COALESCE(p_fields->>'cost_per_kilowatt_hour', cost_per_kilowatt_hour),
    sales_tax = COALESCE(p_fields->>'sales_tax', sales_tax),
    operation_days_per_year = COALESCE((p_fields->>'operation_days_per_year')::INTEGER, operation_days_per_year),
    status = COALESCE(p_fields->>'status', status),
    status_admin = COALESCE(p_fields->>'status_admin', status_admin),
    image = COALESCE(p_fields->>'image', image),
    complience_hyperlink = COALESCE(p_fields->>'complience_hyperlink', complience_hyperlink),
    be_financing = COALESCE(p_fields->>'be_financing', be_financing),
    deposit_amount = COALESCE((p_fields->>'deposit_amount')::INTEGER, deposit_amount),
    interest_rate = COALESCE(p_fields->>'interest_rate', interest_rate),
    labor_cost = COALESCE(p_fields->>'labor_cost', labor_cost),
    light_count = COALESCE(p_fields->>'light_count', light_count),
    light_count_estimate = COALESCE(p_fields->>'light_count_estimate', light_count_estimate),
    loan_period = COALESCE((p_fields->>'loan_period')::INTEGER, loan_period),
    request_light_count = COALESCE((p_fields->>'request_light_count')::BOOLEAN, request_light_count),
    bidding = COALESCE((p_fields->>'bidding')::BOOLEAN, bidding),
    priority_admin = COALESCE((p_fields->>'priority_admin')::BOOLEAN, priority_admin),
    airtable_id = COALESCE(p_fields->>'airtable_id', airtable_id),
    updated_at = NOW()
  WHERE id = p_project_id;

  -- Create update log
  INSERT INTO project_update_log (project_id, updated_by_id, update_log)
  VALUES (p_project_id, auth.uid(), v_old_record::text);

  SELECT to_jsonb(p.*) INTO v_result FROM project p WHERE p.id = p_project_id;
  RETURN v_result;
END;
$$;

------------------------------------------------------------
-- fn_change_project_status
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_change_project_status(
  p_project_id INTEGER,
  p_new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_project_title TEXT;
BEGIN
  UPDATE project SET
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_project_id;

  SELECT title INTO v_project_title FROM project WHERE id = p_project_id;

  -- Update project_user_statuses for all users on this project
  UPDATE project_user_statuses SET
    status = p_new_status
  WHERE project_id = p_project_id;

  -- Create notification for project owner
  SELECT first_name || ' ' || last_name INTO v_user_name FROM profiles WHERE id = auth.uid();

  INSERT INTO notification (
    receiver_id, user_id, project_id, sender_name, seen, description, status, created_at
  )
  SELECT
    p.user_id, auth.uid(), p_project_id, v_user_name,
    false, 'Project status changed to ' || p_new_status, 0, NOW()
  FROM project p WHERE p.id = p_project_id AND p.user_id != auth.uid();

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_archive_project
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_archive_project(
  p_project_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE project SET
    archived = true,
    updated_at = NOW()
  WHERE id = p_project_id;

  -- Log
  INSERT INTO project_update_log (project_id, updated_by_id, update_log)
  VALUES (p_project_id, auth.uid(), 'Project archived');

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_search_projects
------------------------------------------------------------

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

------------------------------------------------------------
-- fn_get_project_files
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_get_project_files(
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
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'upload_id', u.id,
      'files', u.files,
      'name', u.name,
      'file_type', u.file_type,
      'sort_id', u.sort_id,
      'created_at', u.created_at,
      'user_id', up.user_id
    )
  ), '[]'::jsonb) INTO v_result
  FROM uploads_projects up
  JOIN uploads u ON u.id = up.files_id
  WHERE up.project_id = p_project_id;

  RETURN v_result;
END;
$$;
