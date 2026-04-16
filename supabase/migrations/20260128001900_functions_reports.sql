-- 19_functions_reports.sql
-- Report CRUD, calculate, approve

------------------------------------------------------------
-- fn_create_report
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_report(
  p_project_id INTEGER,
  p_proposal JSONB,
  p_proposal_name TEXT,
  p_status TEXT DEFAULT 'draft',
  p_notes TEXT DEFAULT NULL,
  p_installation JSONB DEFAULT NULL,
  p_custom_pricing JSONB DEFAULT NULL,
  p_availability DATE DEFAULT NULL,
  p_etadays TEXT DEFAULT NULL,
  p_rebates TEXT DEFAULT '0',
  p_shipping TEXT DEFAULT '0',
  p_tax TEXT DEFAULT '0',
  p_sensors TEXT DEFAULT '0',
  p_color_tunable TEXT DEFAULT '0',
  p_light_count_waiver TEXT DEFAULT '0'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id INTEGER;
BEGIN
  INSERT INTO report (
    project_id, created_by_id, status, notes, proposal, proposal_name,
    installation, custom_pricing, availability, etadays,
    rebates, shipping, tax, sensors, color_tunable, light_count_waiver,
    bidding, approved, active, created_at
  ) VALUES (
    p_project_id, auth.uid(), p_status, p_notes, p_proposal, p_proposal_name,
    p_installation, p_custom_pricing, p_availability, p_etadays,
    p_rebates, p_shipping, p_tax, p_sensors, p_color_tunable, p_light_count_waiver,
    false, false, true, NOW()
  )
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;

------------------------------------------------------------
-- fn_calculate_report
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_calculate_report(
  p_report_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report report%ROWTYPE;
  v_project project%ROWTYPE;
  v_system_price NUMERIC := 0;
  v_led_price NUMERIC := 0;
  v_kwreduced NUMERIC := 0;
  v_cost_year NUMERIC := 0;
  v_payback NUMERIC := 0;
  v_added_cri NUMERIC := 0;
  v_added_lumens NUMERIC := 0;
  v_lumen_increase_sq_ft NUMERIC := 0;
  v_lumen_increase_fixture NUMERIC := 0;
  v_product RECORD;
BEGIN
  SELECT * INTO v_report FROM report WHERE id = p_report_id;
  SELECT * INTO v_project FROM project WHERE id = v_report.project_id;

  -- Aggregate product data for this report
  FOR v_product IN
    SELECT * FROM product WHERE report_id = p_report_id
  LOOP
    -- Accumulate calculated values from product data
    -- Actual formulas depend on business logic in the existing PHP backend
    v_system_price := v_system_price + 0; -- placeholder for actual calc
    v_led_price := v_led_price + 0;
  END LOOP;

  -- Calculate payback if cost_year > 0
  IF v_cost_year > 0 THEN
    v_payback := v_system_price / v_cost_year;
  END IF;

  -- Update report with calculated values
  UPDATE report SET
    system_price = v_system_price::text,
    led_price = v_led_price::text,
    cost_year = v_cost_year::text,
    kwreduced = v_kwreduced::text,
    payback = v_payback::text,
    added_cri = v_added_cri::text,
    added_lumens = v_added_lumens::text,
    lumen_increase_sq_ft = v_lumen_increase_sq_ft::text,
    lumen_increase_fixture = v_lumen_increase_fixture::text
  WHERE id = p_report_id;

  RETURN jsonb_build_object(
    'system_price', v_system_price,
    'led_price', v_led_price,
    'cost_year', v_cost_year,
    'kwreduced', v_kwreduced,
    'payback', v_payback,
    'added_cri', v_added_cri,
    'added_lumens', v_added_lumens,
    'lumen_increase_sq_ft', v_lumen_increase_sq_ft,
    'lumen_increase_fixture', v_lumen_increase_fixture
  );
END;
$$;

------------------------------------------------------------
-- fn_approve_report
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

  -- Create activity
  INSERT INTO activity (user_id, user_name, user_type, action, action_id, project_id, created_at)
  SELECT auth.uid(), v_user_name, type::text, 5, p_report_id, v_project_id, NOW()
  FROM profiles WHERE id = auth.uid();

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_get_report
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_get_report(
  p_report_id INTEGER
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
    'report', to_jsonb(r.*),
    'products', COALESCE((
      SELECT jsonb_agg(to_jsonb(p.*))
      FROM product p WHERE p.report_id = r.id
    ), '[]'::jsonb),
    'created_by', jsonb_build_object(
      'id', pr.id,
      'first_name', pr.first_name,
      'last_name', pr.last_name,
      'email', pr.email
    )
  ) INTO v_result
  FROM report r
  LEFT JOIN profiles pr ON pr.id = r.created_by_id
  WHERE r.id = p_report_id;

  RETURN v_result;
END;
$$;
