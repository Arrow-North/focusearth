-- 20_functions_notifications.sql
-- Notification/activity CRUD, convert notification-to-activity

------------------------------------------------------------
-- fn_create_notification
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_notification(
  p_receiver_id UUID,
  p_description TEXT,
  p_status INTEGER DEFAULT 0,
  p_related_ids JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id INTEGER;
  v_sender_name TEXT;
BEGIN
  SELECT first_name || ' ' || last_name INTO v_sender_name FROM profiles WHERE id = auth.uid();

  INSERT INTO notification (
    receiver_id, user_id, sender_name, description, status, seen,
    contact_id, company_id, project_id, report_id, estimate_id, estimate_reu_id,
    created_at, updated_at
  ) VALUES (
    p_receiver_id, auth.uid(), v_sender_name, p_description, p_status, false,
    (p_related_ids->>'contact_id')::INTEGER,
    (p_related_ids->>'company_id')::INTEGER,
    (p_related_ids->>'project_id')::INTEGER,
    (p_related_ids->>'report_id')::INTEGER,
    (p_related_ids->>'estimate_id')::INTEGER,
    (p_related_ids->>'estimate_reu_id')::INTEGER,
    NOW(), NOW()
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

------------------------------------------------------------
-- fn_list_notifications
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_list_notifications(
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
  FROM notification
  WHERE receiver_id = auth.uid();

  SELECT COALESCE(jsonb_agg(to_jsonb(n.*) ORDER BY n.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT * FROM notification
    WHERE receiver_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) n;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total_count', v_total,
    'page', p_page,
    'page_size', p_page_size
  );
END;
$$;

------------------------------------------------------------
-- fn_mark_notifications_seen
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_mark_notifications_seen(
  p_notification_ids INTEGER[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification SET
    seen = true,
    updated_at = NOW()
  WHERE id = ANY(p_notification_ids)
    AND receiver_id = auth.uid();

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_convert_notification_to_activity
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_convert_notification_to_activity(
  p_notification_id INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notif notification%ROWTYPE;
  v_activity_id INTEGER;
  v_user_name TEXT;
  v_user_type TEXT;
BEGIN
  SELECT * INTO v_notif FROM notification WHERE id = p_notification_id;

  IF v_notif.id IS NULL THEN
    RAISE EXCEPTION 'Notification not found: %', p_notification_id;
  END IF;

  SELECT first_name || ' ' || last_name, type::text
  INTO v_user_name, v_user_type
  FROM profiles WHERE id = v_notif.user_id;

  INSERT INTO activity (
    user_id, user_name, sender_name, user_type, action, action_id,
    project_id, estimate_id, estimate_reu_id, created_at
  ) VALUES (
    v_notif.user_id, v_user_name, v_notif.sender_name, v_user_type,
    v_notif.status, p_notification_id,
    v_notif.project_id, v_notif.estimate_id, v_notif.estimate_reu_id, NOW()
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

------------------------------------------------------------
-- fn_create_activity
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_activity(
  p_user_id UUID,
  p_action INTEGER,
  p_action_id INTEGER,
  p_project_id INTEGER DEFAULT NULL,
  p_estimate_id INTEGER DEFAULT NULL,
  p_estimate_reu_id INTEGER DEFAULT NULL,
  p_project_update_log_id INTEGER DEFAULT NULL,
  p_product_id INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id INTEGER;
  v_user_name TEXT;
  v_user_type TEXT;
  v_project_title TEXT;
BEGIN
  SELECT first_name || ' ' || last_name, type::text
  INTO v_user_name, v_user_type
  FROM profiles WHERE id = p_user_id;

  IF p_project_id IS NOT NULL THEN
    SELECT title INTO v_project_title FROM project WHERE id = p_project_id;
  END IF;

  INSERT INTO activity (
    user_id, user_name, user_type, action, action_id,
    project_id, project_title, estimate_id, estimate_reu_id,
    project_update_log_id, product_id, created_at
  ) VALUES (
    p_user_id, v_user_name, v_user_type, p_action, p_action_id,
    p_project_id, v_project_title, p_estimate_id, p_estimate_reu_id,
    p_project_update_log_id, p_product_id, NOW()
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

------------------------------------------------------------
-- fn_list_activities
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_list_activities(
  p_filters JSONB DEFAULT '{}'::jsonb,
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
  v_user_id UUID;
  v_project_id INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  v_user_id := (p_filters->>'user_id')::UUID;
  v_project_id := (p_filters->>'project_id')::INTEGER;

  SELECT COUNT(*) INTO v_total
  FROM activity a
  WHERE (v_user_id IS NULL OR a.user_id = v_user_id)
    AND (v_project_id IS NULL OR a.project_id = v_project_id);

  SELECT COALESCE(jsonb_agg(to_jsonb(a.*) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT * FROM activity a
    WHERE (v_user_id IS NULL OR a.user_id = v_user_id)
      AND (v_project_id IS NULL OR a.project_id = v_project_id)
    ORDER BY a.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) a;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total_count', v_total,
    'page', p_page,
    'page_size', p_page_size
  );
END;
$$;
