-- 21_functions_uploads.sql
-- File association, cascade delete

------------------------------------------------------------
-- fn_create_upload
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_upload(
  p_user_id UUID,
  p_files TEXT,
  p_name TEXT,
  p_file_type INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upload_id INTEGER;
BEGIN
  INSERT INTO uploads (user_id, files, name, file_type, created_at, updated_at)
  VALUES (p_user_id, p_files, p_name, p_file_type, NOW(), NOW())
  RETURNING id INTO v_upload_id;

  RETURN v_upload_id;
END;
$$;

------------------------------------------------------------
-- fn_associate_upload_to_project
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_associate_upload_to_project(
  p_upload_id INTEGER,
  p_project_id INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id INTEGER;
BEGIN
  INSERT INTO uploads_projects (user_id, project_id, files_id)
  VALUES (auth.uid(), p_project_id, p_upload_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

------------------------------------------------------------
-- fn_associate_upload_to_company
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_associate_upload_to_company(
  p_upload_id INTEGER,
  p_company_id INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id INTEGER;
BEGIN
  INSERT INTO uploads_company (user_id, company_id, file_id)
  VALUES (auth.uid(), p_company_id, p_upload_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

------------------------------------------------------------
-- fn_associate_upload_to_invoice
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_associate_upload_to_invoice(
  p_upload_id INTEGER,
  p_estimate_su_id INTEGER DEFAULT NULL,
  p_estimate_reu_id INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id INTEGER;
BEGIN
  INSERT INTO uploads_invoice (user_id, file_id, estimate_su_id, estimate_reu_id)
  VALUES (auth.uid(), p_upload_id, p_estimate_su_id, p_estimate_reu_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

------------------------------------------------------------
-- fn_associate_upload_to_receipt
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_associate_upload_to_receipt(
  p_upload_id INTEGER,
  p_estimate_su_id INTEGER DEFAULT NULL,
  p_estimate_reu_id INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id INTEGER;
BEGIN
  INSERT INTO uploads_receipt (user_id, file_id, estimate_su_id, estimate_reu_id)
  VALUES (auth.uid(), p_upload_id, p_estimate_su_id, p_estimate_reu_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

------------------------------------------------------------
-- fn_delete_upload
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_delete_upload(
  p_upload_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove all junction rows first
  DELETE FROM uploads_projects WHERE files_id = p_upload_id;
  DELETE FROM uploads_company WHERE file_id = p_upload_id;
  DELETE FROM uploads_invoice WHERE file_id = p_upload_id;
  DELETE FROM uploads_receipt WHERE file_id = p_upload_id;

  -- Remove the upload itself
  DELETE FROM uploads WHERE id = p_upload_id;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_list_files
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_list_files(
  p_entity_type TEXT, -- 'project', 'company', 'invoice', 'receipt'
  p_entity_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_entity_type = 'project' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', u.id, 'files', u.files, 'name', u.name,
      'file_type', u.file_type, 'sort_id', u.sort_id,
      'user_id', up.user_id, 'created_at', u.created_at
    )), '[]'::jsonb) INTO v_result
    FROM uploads_projects up
    JOIN uploads u ON u.id = up.files_id
    WHERE up.project_id = p_entity_id;

  ELSIF p_entity_type = 'company' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', u.id, 'files', u.files, 'name', u.name,
      'file_type', u.file_type, 'sort_id', u.sort_id,
      'user_id', uc.user_id, 'created_at', u.created_at
    )), '[]'::jsonb) INTO v_result
    FROM uploads_company uc
    JOIN uploads u ON u.id = uc.file_id
    WHERE uc.company_id = p_entity_id;

  ELSIF p_entity_type = 'invoice' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', u.id, 'files', u.files, 'name', u.name,
      'file_type', u.file_type, 'user_id', ui.user_id,
      'estimate_su_id', ui.estimate_su_id, 'estimate_reu_id', ui.estimate_reu_id,
      'created_at', u.created_at
    )), '[]'::jsonb) INTO v_result
    FROM uploads_invoice ui
    JOIN uploads u ON u.id = ui.file_id
    WHERE ui.estimate_su_id = p_entity_id OR ui.estimate_reu_id = p_entity_id;

  ELSIF p_entity_type = 'receipt' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', u.id, 'files', u.files, 'name', u.name,
      'file_type', u.file_type, 'user_id', ur.user_id,
      'estimate_su_id', ur.estimate_su_id, 'estimate_reu_id', ur.estimate_reu_id,
      'created_at', u.created_at
    )), '[]'::jsonb) INTO v_result
    FROM uploads_receipt ur
    JOIN uploads u ON u.id = ur.file_id
    WHERE ur.estimate_su_id = p_entity_id OR ur.estimate_reu_id = p_entity_id;

  ELSE
    RAISE EXCEPTION 'Invalid entity_type: %', p_entity_type;
  END IF;

  RETURN v_result;
END;
$$;
