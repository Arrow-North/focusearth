-- Migration: Add image parameter to fn_create_project

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
  p_status_admin TEXT DEFAULT 'new',
  p_be_financing TEXT DEFAULT NULL,
  p_deposit_amount INTEGER DEFAULT NULL,
  p_interest_rate TEXT DEFAULT NULL,
  p_labor_cost TEXT DEFAULT NULL,
  p_loan_period INTEGER DEFAULT NULL,
  p_image TEXT DEFAULT NULL
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
    status, status_admin, priority_admin, archived,
    be_financing, deposit_amount, interest_rate, labor_cost, loan_period,
    image, created_at, updated_at
  ) VALUES (
    auth.uid(), p_company_id, p_title, p_address, p_address2, p_state, p_city, p_zip_code,
    p_property_type, p_property_size, p_property_priorities, p_areas,
    p_cost_per_kilowatt_hour, p_sales_tax, p_operation_days_per_year, p_notes,
    p_status, p_status_admin, false, false,
    p_be_financing, p_deposit_amount, p_interest_rate, p_labor_cost, p_loan_period,
    p_image, NOW(), NOW()
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
