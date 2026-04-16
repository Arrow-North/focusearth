-- 15_functions_users.sql
-- User CRUD, search, pagination

------------------------------------------------------------
-- fn_get_user
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_get_user(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'username', p.username,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'phone', p.phone,
    'type', p.type,
    'roles', p.roles,
    'profile_features', p.profile_features,
    'primary_interests', p.primary_interests,
    'communication_preferences', p.communication_preferences,
    'enabled', p.enabled,
    'title', p.title,
    'avatar', p.avatar,
    'hear_from_us', p.hear_from_us,
    'invited_to_company', p.invited_to_company,
    'company_to_sync', p.company_to_sync,
    'is_deleted', p.is_deleted,
    'associated_to_company_id', p.associated_to_company_id,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'company', CASE
      WHEN c.id IS NOT NULL THEN jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'type', c.type
      )
      ELSE NULL
    END
  ) INTO v_result
  FROM profiles p
  LEFT JOIN company c ON c.id = p.associated_to_company_id
  WHERE p.id = p_user_id AND p.is_deleted = false;

  RETURN v_result;
END;
$$;

------------------------------------------------------------
-- fn_update_user
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_update_user(
  p_user_id UUID,
  p_fields JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE profiles SET
    first_name = COALESCE(p_fields->>'first_name', first_name),
    last_name = COALESCE(p_fields->>'last_name', last_name),
    phone = COALESCE(p_fields->>'phone', phone),
    username = COALESCE(p_fields->>'username', username),
    title = COALESCE(p_fields->>'title', title),
    avatar = COALESCE(p_fields->>'avatar', avatar),
    hear_from_us = COALESCE(p_fields->>'hear_from_us', hear_from_us),
    profile_features = COALESCE(p_fields->'profile_features', profile_features),
    primary_interests = COALESCE(p_fields->'primary_interests', primary_interests),
    communication_preferences = COALESCE(p_fields->'communication_preferences', communication_preferences),
    roles = COALESCE(p_fields->'roles', roles),
    company_to_sync = COALESCE(p_fields->>'company_to_sync', company_to_sync),
    record_id = COALESCE(p_fields->>'record_id', record_id),
    record_id_from_projects_users = COALESCE(p_fields->>'record_id_from_projects_users', record_id_from_projects_users),
    updated_at = NOW()
  WHERE id = p_user_id;

  SELECT public.fn_get_user(p_user_id) INTO v_result;

  -- Log activity
  INSERT INTO activity (user_id, user_name, user_type, action, action_id, created_at)
  SELECT p_user_id, first_name || ' ' || last_name, type::text, 1, 0, NOW()
  FROM profiles WHERE id = auth.uid();

  RETURN v_result;
END;
$$;

------------------------------------------------------------
-- fn_delete_user (soft delete)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_delete_user(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET
    is_deleted = true,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_search_users
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_search_users(
  p_search_term TEXT DEFAULT NULL,
  p_user_type user_type_enum DEFAULT NULL,
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
  FROM profiles p
  WHERE p.is_deleted = false
    AND (p_search_term IS NULL OR (
      p.first_name ILIKE '%' || p_search_term || '%'
      OR p.last_name ILIKE '%' || p_search_term || '%'
      OR p.email ILIKE '%' || p_search_term || '%'
      OR p.username ILIKE '%' || p_search_term || '%'
    ))
    AND (p_user_type IS NULL OR p.type = p_user_type);

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'type', p.type,
      'enabled', p.enabled,
      'associated_to_company_id', p.associated_to_company_id,
      'created_at', p.created_at
    ) AS row_data
    FROM profiles p
    WHERE p.is_deleted = false
      AND (p_search_term IS NULL OR (
        p.first_name ILIKE '%' || p_search_term || '%'
        OR p.last_name ILIKE '%' || p_search_term || '%'
        OR p.email ILIKE '%' || p_search_term || '%'
        OR p.username ILIKE '%' || p_search_term || '%'
      ))
      AND (p_user_type IS NULL OR p.type = p_user_type)
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
-- fn_list_users
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_list_users(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_filters JSONB DEFAULT '{}'::jsonb
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
  v_company_id INTEGER;
  v_enabled BOOLEAN;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  v_company_id := (p_filters->>'company_id')::INTEGER;
  v_enabled := (p_filters->>'enabled')::BOOLEAN;

  SELECT COUNT(*) INTO v_total
  FROM profiles p
  WHERE p.is_deleted = false
    AND (v_company_id IS NULL OR p.associated_to_company_id = v_company_id)
    AND (v_enabled IS NULL OR p.enabled = v_enabled);

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'username', p.username,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'phone', p.phone,
      'type', p.type,
      'enabled', p.enabled,
      'associated_to_company_id', p.associated_to_company_id,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) AS row_data
    FROM profiles p
    WHERE p.is_deleted = false
      AND (v_company_id IS NULL OR p.associated_to_company_id = v_company_id)
      AND (v_enabled IS NULL OR p.enabled = v_enabled)
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
-- fn_get_admin_name
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_get_admin_name()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT first_name || ' ' || last_name
  FROM profiles
  WHERE id = auth.uid()
    AND type IN ('SUPERADMIN', 'Sa', 'Au');
$$;
