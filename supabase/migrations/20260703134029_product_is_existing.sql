-- Add is_existing flag: false = recommended (default), true = existing
-- REU users may only see products where is_existing = true

ALTER TABLE product
  ADD COLUMN IF NOT EXISTS is_existing BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_product_is_existing ON product (is_existing);

-- RLS: single SELECT policy — REU sees only existing products; everyone else sees all
ALTER TABLE product ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_select          ON product;
DROP POLICY IF EXISTS product_non_reu_select  ON product;
DROP POLICY IF EXISTS product_reu_select      ON product;

CREATE POLICY product_select ON product
  FOR SELECT
  USING (
    get_user_type() <> 'Reu'::user_type_enum
    OR is_existing = TRUE
  );

------------------------------------------------------------
-- fn_create_product
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_product(
  p_user_id           UUID,
  p_company_id        INTEGER DEFAULT NULL,
  p_project_id        INTEGER DEFAULT NULL,
  p_report_id         INTEGER DEFAULT NULL,
  p_airtable_record   TEXT    DEFAULT '',
  p_airtable_base     TEXT    DEFAULT NULL,
  p_airtable_colum_name TEXT  DEFAULT '',
  p_estimate_su_id    INTEGER DEFAULT NULL,
  p_details           JSONB   DEFAULT '{}'::jsonb,
  p_is_existing       BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id INTEGER;
BEGIN
  INSERT INTO product (
    user_id, company_id, project_id, report_id, estimate_su_id,
    airtable_record, airtable_base, airtable_colum_name,
    details, is_existing, created_at, updated_at
  ) VALUES (
    p_user_id, p_company_id, p_project_id, p_report_id, p_estimate_su_id,
    p_airtable_record, p_airtable_base, p_airtable_colum_name,
    p_details, p_is_existing, NOW(), NOW()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

------------------------------------------------------------
-- fn_update_product
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_update_product(
  p_product_id INTEGER,
  p_fields     JSONB
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result JSONB;
BEGIN
  UPDATE product SET
    airtable_record     = COALESCE(p_fields->>'airtable_record',     airtable_record),
    airtable_base       = COALESCE(p_fields->>'airtable_base',       airtable_base),
    airtable_colum_name = COALESCE(p_fields->>'airtable_colum_name', airtable_colum_name),
    company_id          = COALESCE((p_fields->>'company_id')::INTEGER,      company_id),
    project_id          = COALESCE((p_fields->>'project_id')::INTEGER,      project_id),
    report_id           = COALESCE((p_fields->>'report_id')::INTEGER,       report_id),
    estimate_su_id      = COALESCE((p_fields->>'estimate_su_id')::INTEGER,  estimate_su_id),
    details             = CASE WHEN p_fields ? 'details'     THEN p_fields->'details'                  ELSE details     END,
    is_existing         = CASE WHEN p_fields ? 'is_existing' THEN (p_fields->>'is_existing')::BOOLEAN  ELSE is_existing END,
    updated_at          = NOW()
  WHERE id = p_product_id;

  SELECT to_jsonb(p.*) INTO v_result FROM product p WHERE p.id = p_product_id;
  RETURN v_result;
END;
$$;

------------------------------------------------------------
-- fn_list_products
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_list_products(
  p_filters   JSONB   DEFAULT '{}'::jsonb,
  p_page      INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_offset      INTEGER;
  v_total       BIGINT;
  v_rows        JSONB;
  v_project_id  INTEGER;
  v_report_id   INTEGER;
  v_company_id  INTEGER;
  v_user_id     UUID;
  v_category    TEXT;
  v_search      TEXT;
  v_is_existing BOOLEAN;
BEGIN
  v_offset      := (p_page - 1) * p_page_size;
  v_project_id  := (p_filters->>'project_id')::INTEGER;
  v_report_id   := (p_filters->>'report_id')::INTEGER;
  v_company_id  := (p_filters->>'company_id')::INTEGER;
  v_user_id     := (p_filters->>'user_id')::UUID;
  v_category    := p_filters->>'category';
  v_search      := p_filters->>'search';
  v_is_existing := (p_filters->>'is_existing')::BOOLEAN;

  IF get_user_type() = 'Reu'::user_type_enum THEN
    v_is_existing := TRUE;
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM product p
  WHERE (v_project_id  IS NULL OR p.project_id         = v_project_id)
    AND (v_report_id   IS NULL OR p.report_id           = v_report_id)
    AND (v_company_id  IS NULL OR p.company_id          = v_company_id)
    AND (v_user_id     IS NULL OR p.user_id             = v_user_id)
    AND (v_category    IS NULL OR p.airtable_colum_name = v_category)
    AND (v_is_existing IS NULL OR p.is_existing         = v_is_existing)
    AND (v_search      IS NULL OR p.airtable_record ILIKE '%' || v_search || '%');

  SELECT COALESCE(jsonb_agg(to_jsonb(p.*) ORDER BY p.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT * FROM product p
    WHERE (v_project_id  IS NULL OR p.project_id         = v_project_id)
      AND (v_report_id   IS NULL OR p.report_id           = v_report_id)
      AND (v_company_id  IS NULL OR p.company_id          = v_company_id)
      AND (v_user_id     IS NULL OR p.user_id             = v_user_id)
      AND (v_category    IS NULL OR p.airtable_colum_name = v_category)
      AND (v_is_existing IS NULL OR p.is_existing         = v_is_existing)
      AND (v_search      IS NULL OR p.airtable_record ILIKE '%' || v_search || '%')
    ORDER BY p.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) p;

  RETURN jsonb_build_object(
    'rows',        v_rows,
    'total_count', v_total,
    'page',        p_page,
    'page_size',   p_page_size
  );
END;
$$;

------------------------------------------------------------
-- fn_search_products
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_search_products(
  p_search_term TEXT    DEFAULT '',
  p_category    TEXT    DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_page_size   INTEGER DEFAULT 20,
  p_is_existing BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_offset      INTEGER;
  v_total       BIGINT;
  v_rows        JSONB;
  v_search      TEXT;
  v_is_existing BOOLEAN;
BEGIN
  v_offset      := (p_page - 1) * p_page_size;
  v_search      := NULLIF(TRIM(p_search_term), '');
  v_is_existing := p_is_existing;

  IF get_user_type() = 'Reu'::user_type_enum THEN
    v_is_existing := TRUE;
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM product p
  WHERE (p_category    IS NULL OR p.airtable_colum_name = p_category)
    AND (v_is_existing IS NULL OR p.is_existing         = v_is_existing)
    AND (v_search      IS NULL OR p.airtable_record ILIKE '%' || v_search || '%');

  SELECT COALESCE(jsonb_agg(to_jsonb(p.*) ORDER BY p.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT * FROM product p
    WHERE (p_category    IS NULL OR p.airtable_colum_name = p_category)
      AND (v_is_existing IS NULL OR p.is_existing         = v_is_existing)
      AND (v_search      IS NULL OR p.airtable_record ILIKE '%' || v_search || '%')
    ORDER BY p.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) p;

  RETURN jsonb_build_object(
    'rows',        v_rows,
    'total_count', v_total,
    'page',        p_page,
    'page_size',   p_page_size
  );
END;
$$;
