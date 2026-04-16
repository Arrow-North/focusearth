-- 16_functions_companies.sql
-- Company CRUD, invite, sync, approve

------------------------------------------------------------
-- fn_create_company
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_company(
  p_name TEXT,
  p_type TEXT,
  p_address TEXT,
  p_state TEXT,
  p_city TEXT,
  p_zip_code TEXT,
  p_country TEXT,
  p_website TEXT DEFAULT '',
  p_address2 TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_image TEXT DEFAULT NULL,
  p_property_priorities JSONB DEFAULT '[]'::jsonb,
  p_service_areas JSONB DEFAULT '[]'::jsonb,
  p_company_sub_type TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id INTEGER;
BEGIN
  INSERT INTO company (
    owner_id, name, type, address, address2, state, city, zip_code, country,
    website, notes, image, property_priorities, service_areas,
    seen, status, company_sub_type
  ) VALUES (
    auth.uid(), p_name, p_type, p_address, p_address2, p_state, p_city, p_zip_code, p_country,
    p_website, p_notes, p_image, p_property_priorities, p_service_areas,
    false, 0, p_company_sub_type
  )
  RETURNING id INTO v_company_id;

  -- Link owner to company
  UPDATE profiles SET
    associated_to_company_id = v_company_id,
    updated_at = NOW()
  WHERE id = auth.uid();

  RETURN v_company_id;
END;
$$;

------------------------------------------------------------
-- fn_update_company
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_update_company(
  p_company_id INTEGER,
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
  -- Capture old state for log
  SELECT to_jsonb(c.*) INTO v_old_record FROM company c WHERE c.id = p_company_id;

  UPDATE company SET
    name = COALESCE(p_fields->>'name', name),
    address = COALESCE(p_fields->>'address', address),
    address2 = COALESCE(p_fields->>'address2', address2),
    state = COALESCE(p_fields->>'state', state),
    city = COALESCE(p_fields->>'city', city),
    zip_code = COALESCE(p_fields->>'zip_code', zip_code),
    country = COALESCE(p_fields->>'country', country),
    website = COALESCE(p_fields->>'website', website),
    notes = COALESCE(p_fields->>'notes', notes),
    image = COALESCE(p_fields->>'image', image),
    property_priorities = COALESCE(p_fields->'property_priorities', property_priorities),
    service_areas = COALESCE(p_fields->'service_areas', service_areas),
    type = COALESCE(p_fields->>'type', type),
    company_sub_type = COALESCE(p_fields->>'company_sub_type', company_sub_type),
    status = COALESCE((p_fields->>'status')::INTEGER, status),
    seen = COALESCE((p_fields->>'seen')::BOOLEAN, seen)
  WHERE id = p_company_id;

  -- Create update log
  INSERT INTO company_update_log (company_id, updated_by_id, update_log, seen)
  VALUES (p_company_id, auth.uid(), v_old_record::text, false);

  SELECT to_jsonb(c.*) INTO v_result FROM company c WHERE c.id = p_company_id;
  RETURN v_result;
END;
$$;

------------------------------------------------------------
-- fn_delete_company (soft delete)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_delete_company(
  p_company_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE company SET is_deleted = true WHERE id = p_company_id;
  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_invite_user_to_company
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_invite_user_to_company(
  p_company_id INTEGER,
  p_email TEXT,
  p_user_type user_type_enum
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id UUID;
  v_sender_name TEXT;
BEGIN
  SELECT id INTO v_target_user_id FROM profiles WHERE email = p_email AND is_deleted = false;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', p_email;
  END IF;

  -- Mark user as invited
  UPDATE profiles SET
    invited_to_company = true,
    company_to_sync = p_company_id::text,
    updated_at = NOW()
  WHERE id = v_target_user_id;

  -- Create notification
  SELECT first_name || ' ' || last_name INTO v_sender_name FROM profiles WHERE id = auth.uid();

  INSERT INTO notification (receiver_id, user_id, company_id, sender_name, seen, description, status, created_at)
  VALUES (v_target_user_id, auth.uid(), p_company_id, v_sender_name, false, 'Company invitation', 0, NOW());

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_accept_company_invite
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_accept_company_invite(
  p_company_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET
    associated_to_company_id = p_company_id,
    invited_to_company = false,
    company_to_sync = NULL,
    updated_at = NOW()
  WHERE id = auth.uid();

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_sync_company_to_user
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_sync_company_to_user(
  p_company_id INTEGER,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET
    associated_to_company_id = p_company_id,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_sync_company_to_company
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_sync_company_to_company(
  p_source_id INTEGER,
  p_target_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update all users from source company to target company
  UPDATE profiles SET
    associated_to_company_id = p_target_id,
    updated_at = NOW()
  WHERE associated_to_company_id = p_source_id;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_confirm_company_sync
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_confirm_company_sync(
  p_company_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE company SET seen = true WHERE id = p_company_id;
  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_admin_approve_company
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_admin_approve_company(
  p_company_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE company SET
    status = 1,
    seen = true
  WHERE id = p_company_id;

  -- Create notification for company owner
  INSERT INTO notification (
    receiver_id, user_id, company_id, sender_name, seen, description, status, created_at
  )
  SELECT
    c.owner_id, auth.uid(), p_company_id,
    (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
    false, 'Company approved', 1, NOW()
  FROM company c WHERE c.id = p_company_id;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_remove_user_from_company
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_remove_user_from_company(
  p_company_id INTEGER,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET
    associated_to_company_id = NULL,
    updated_at = NOW()
  WHERE id = p_user_id AND associated_to_company_id = p_company_id;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_get_company_changes
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_get_company_changes(
  p_company_id INTEGER
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
      'id', cul.id,
      'company_id', cul.company_id,
      'updated_by_id', cul.updated_by_id,
      'updated_by_name', p.first_name || ' ' || p.last_name,
      'updated_date', cul.updated_date,
      'update_log', cul.update_log,
      'seen', cul.seen
    ) ORDER BY cul.updated_date DESC
  ), '[]'::jsonb) INTO v_result
  FROM company_update_log cul
  LEFT JOIN profiles p ON p.id = cul.updated_by_id
  WHERE cul.company_id = p_company_id;

  RETURN v_result;
END;
$$;
