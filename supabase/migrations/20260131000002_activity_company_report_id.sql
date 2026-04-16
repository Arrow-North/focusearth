-- Add company_id and report_id columns to activity table
-- and update related functions to carry these IDs through.

------------------------------------------------------------
-- (a) Add columns
------------------------------------------------------------

ALTER TABLE activity
  ADD COLUMN company_id INTEGER REFERENCES company(id),
  ADD COLUMN report_id  INTEGER REFERENCES report(id);

------------------------------------------------------------
-- (b) Backfill existing rows where action implies a report
------------------------------------------------------------

-- Backfill report_id for report-related actions (action_id = report id)
UPDATE activity SET report_id = action_id
  WHERE action IN (5, 24) AND report_id IS NULL
  AND EXISTS (SELECT 1 FROM report WHERE id = activity.action_id);

-- Backfill company_id for company-related activities created via
-- fn_convert_notification_to_activity (action_id = notification id)
UPDATE activity a SET company_id = n.company_id
  FROM notification n
  WHERE a.action IN (14, 15, 16, 18, 32)
    AND a.company_id IS NULL
    AND n.id = a.action_id
    AND n.company_id IS NOT NULL;

-- Backfill company_id from the user's associated company as a last resort
UPDATE activity a SET company_id = p.associated_to_company_id
  FROM profiles p
  WHERE a.action IN (14, 15, 16, 18, 32)
    AND a.company_id IS NULL
    AND p.id = a.user_id
    AND p.associated_to_company_id IS NOT NULL;

------------------------------------------------------------
-- (c) Recreate fn_create_activity with new optional params
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_activity(
  p_user_id UUID,
  p_action INTEGER,
  p_action_id INTEGER,
  p_project_id INTEGER DEFAULT NULL,
  p_estimate_id INTEGER DEFAULT NULL,
  p_estimate_reu_id INTEGER DEFAULT NULL,
  p_project_update_log_id INTEGER DEFAULT NULL,
  p_product_id INTEGER DEFAULT NULL,
  p_company_id INTEGER DEFAULT NULL,
  p_report_id INTEGER DEFAULT NULL
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
    project_update_log_id, product_id, company_id, report_id, created_at
  ) VALUES (
    p_user_id, v_user_name, v_user_type, p_action, p_action_id,
    p_project_id, v_project_title, p_estimate_id, p_estimate_reu_id,
    p_project_update_log_id, p_product_id, p_company_id, p_report_id, NOW()
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

------------------------------------------------------------
-- (d) Recreate fn_convert_notification_to_activity
--     Carry company_id and report_id from the notification
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
    project_id, estimate_id, estimate_reu_id,
    company_id, report_id, created_at
  ) VALUES (
    v_notif.user_id, v_user_name, v_notif.sender_name, v_user_type,
    v_notif.status, p_notification_id,
    v_notif.project_id, v_notif.estimate_id, v_notif.estimate_reu_id,
    v_notif.company_id, v_notif.report_id, NOW()
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

------------------------------------------------------------
-- (e) Recreate fn_approve_report
--     Include report_id in the activity INSERT
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_approve_report(
  p_report_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_project_id INTEGER;
BEGIN
  UPDATE report SET approved = true WHERE id = p_report_id;

  SELECT project_id INTO v_project_id FROM report WHERE id = p_report_id;
  SELECT first_name || ' ' || last_name INTO v_user_name FROM profiles WHERE id = auth.uid();

  -- Create activity with report_id
  INSERT INTO activity (user_id, user_name, user_type, action, action_id, project_id, report_id, created_at)
  SELECT auth.uid(), v_user_name, type::text, 5, p_report_id, v_project_id, p_report_id, NOW()
  FROM profiles WHERE id = auth.uid();

  RETURN true;
END;
$$;
