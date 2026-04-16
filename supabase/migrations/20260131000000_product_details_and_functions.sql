-- Add details JSONB column to product table
ALTER TABLE product ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;

-- GIN index on details for containment queries
CREATE INDEX IF NOT EXISTS idx_product_details_gin ON product USING gin (details);

-- btree index on airtable_colum_name for category filtering
CREATE INDEX IF NOT EXISTS idx_product_airtable_colum_name ON product (airtable_colum_name);

------------------------------------------------------------
-- fn_create_product (updated: add p_details param)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_product(
  p_user_id UUID,
  p_company_id INTEGER DEFAULT NULL,
  p_project_id INTEGER DEFAULT NULL,
  p_report_id INTEGER DEFAULT NULL,
  p_airtable_record TEXT DEFAULT '',
  p_airtable_base TEXT DEFAULT NULL,
  p_airtable_colum_name TEXT DEFAULT '',
  p_estimate_su_id INTEGER DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id INTEGER;
BEGIN
  INSERT INTO product (
    user_id, company_id, project_id, report_id, estimate_su_id,
    airtable_record, airtable_base, airtable_colum_name,
    details, created_at, updated_at
  ) VALUES (
    p_user_id, p_company_id, p_project_id, p_report_id, p_estimate_su_id,
    p_airtable_record, p_airtable_base, p_airtable_colum_name,
    p_details, NOW(), NOW()
  )
  RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$;

------------------------------------------------------------
-- fn_update_product (updated: handle details JSONB key)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_update_product(
  p_product_id INTEGER,
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
  UPDATE product SET
    airtable_record = COALESCE(p_fields->>'airtable_record', airtable_record),
    airtable_base = COALESCE(p_fields->>'airtable_base', airtable_base),
    airtable_colum_name = COALESCE(p_fields->>'airtable_colum_name', airtable_colum_name),
    company_id = COALESCE((p_fields->>'company_id')::INTEGER, company_id),
    project_id = COALESCE((p_fields->>'project_id')::INTEGER, project_id),
    report_id = COALESCE((p_fields->>'report_id')::INTEGER, report_id),
    estimate_su_id = COALESCE((p_fields->>'estimate_su_id')::INTEGER, estimate_su_id),
    details = CASE WHEN p_fields ? 'details' THEN (p_fields->'details') ELSE details END,
    updated_at = NOW()
  WHERE id = p_product_id;

  SELECT to_jsonb(p.*) INTO v_result FROM product p WHERE p.id = p_product_id;
  RETURN v_result;
END;
$$;

------------------------------------------------------------
-- fn_list_products (updated: category + search filters)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_list_products(
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
  v_project_id INTEGER;
  v_report_id INTEGER;
  v_company_id INTEGER;
  v_user_id UUID;
  v_category TEXT;
  v_search TEXT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  v_project_id := (p_filters->>'project_id')::INTEGER;
  v_report_id := (p_filters->>'report_id')::INTEGER;
  v_company_id := (p_filters->>'company_id')::INTEGER;
  v_user_id := (p_filters->>'user_id')::UUID;
  v_category := p_filters->>'category';
  v_search := p_filters->>'search';

  SELECT COUNT(*) INTO v_total
  FROM product p
  WHERE (v_project_id IS NULL OR p.project_id = v_project_id)
    AND (v_report_id IS NULL OR p.report_id = v_report_id)
    AND (v_company_id IS NULL OR p.company_id = v_company_id)
    AND (v_user_id IS NULL OR p.user_id = v_user_id)
    AND (v_category IS NULL OR p.airtable_colum_name = v_category)
    AND (v_search IS NULL OR p.airtable_record ILIKE '%' || v_search || '%');

  SELECT COALESCE(jsonb_agg(to_jsonb(p.*) ORDER BY p.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT * FROM product p
    WHERE (v_project_id IS NULL OR p.project_id = v_project_id)
      AND (v_report_id IS NULL OR p.report_id = v_report_id)
      AND (v_company_id IS NULL OR p.company_id = v_company_id)
      AND (v_user_id IS NULL OR p.user_id = v_user_id)
      AND (v_category IS NULL OR p.airtable_colum_name = v_category)
      AND (v_search IS NULL OR p.airtable_record ILIKE '%' || v_search || '%')
    ORDER BY p.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) p;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total_count', v_total,
    'page', p_page,
    'page_size', p_page_size
  );
END;
$$;

------------------------------------------------------------
-- fn_get_product (new: single product by ID)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_get_product(
  p_product_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT to_jsonb(p.*) INTO v_result FROM product p WHERE p.id = p_product_id;
  RETURN v_result;
END;
$$;

------------------------------------------------------------
-- fn_search_products (new: paginated search with category)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_search_products(
  p_search_term TEXT DEFAULT '',
  p_category TEXT DEFAULT NULL,
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
  v_search TEXT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  v_search := NULLIF(TRIM(p_search_term), '');

  SELECT COUNT(*) INTO v_total
  FROM product p
  WHERE (p_category IS NULL OR p.airtable_colum_name = p_category)
    AND (v_search IS NULL OR p.airtable_record ILIKE '%' || v_search || '%');

  SELECT COALESCE(jsonb_agg(to_jsonb(p.*) ORDER BY p.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT * FROM product p
    WHERE (p_category IS NULL OR p.airtable_colum_name = p_category)
      AND (v_search IS NULL OR p.airtable_record ILIKE '%' || v_search || '%')
    ORDER BY p.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) p;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total_count', v_total,
    'page', p_page,
    'page_size', p_page_size
  );
END;
$$;
