-- 18_functions_estimates.sql
-- Estimate CRUD, workflow state machine, order conversion

------------------------------------------------------------
-- fn_create_estimate_su (SU estimate)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_estimate_su(
  p_report_id INTEGER,
  p_user_su_id UUID,
  p_company_id INTEGER,
  p_luminaires JSONB DEFAULT NULL,
  p_user_reu_id UUID DEFAULT NULL,
  p_estimate_reu_id INTEGER DEFAULT NULL,
  p_sales_tax TEXT DEFAULT NULL,
  p_rebates TEXT DEFAULT NULL,
  p_shipping TEXT DEFAULT NULL,
  p_su_notes TEXT DEFAULT NULL,
  p_deposit_amount TEXT DEFAULT NULL,
  p_deposit_due TEXT DEFAULT NULL,
  p_remainder_due TEXT DEFAULT NULL,
  p_remainder_amount TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estimate_id INTEGER;
BEGIN
  INSERT INTO estimate (
    report_id, user_su_id, company_id, luminaires, user_reu_id, estimate_reu_id,
    sales_tax, rebates, shipping, su_notes, deposit_amount, deposit_due,
    remainder_due, remainder_amount, reference, is_estimate, created_at, updated_at
  ) VALUES (
    p_report_id, p_user_su_id, p_company_id, p_luminaires, p_user_reu_id, p_estimate_reu_id,
    p_sales_tax, p_rebates, p_shipping, p_su_notes, p_deposit_amount, p_deposit_due,
    p_remainder_due, p_remainder_amount, p_reference, true, NOW(), NOW()
  )
  RETURNING id INTO v_estimate_id;

  RETURN v_estimate_id;
END;
$$;

------------------------------------------------------------
-- fn_create_estimate_reu (REU estimate)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_estimate_reu(
  p_report_id INTEGER,
  p_user_reu_id UUID,
  p_company_id INTEGER,
  p_luminaires JSONB DEFAULT NULL,
  p_sales_tax TEXT DEFAULT NULL,
  p_rebates TEXT DEFAULT NULL,
  p_shipping TEXT DEFAULT NULL,
  p_reu_notes TEXT DEFAULT NULL,
  p_deposit_amount TEXT DEFAULT NULL,
  p_deposit_due TEXT DEFAULT NULL,
  p_remainder_due TEXT DEFAULT NULL,
  p_remainder_amount TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_user_admin_consultant_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estimate_id INTEGER;
BEGIN
  INSERT INTO estimate_reu (
    report_id, user_reu_id, company_id, luminaires, sales_tax, rebates, shipping,
    reu_notes, deposit_amount, deposit_due, remainder_due, remainder_amount,
    reference, user_admin_consultant_id, is_estimate, created_at, updated_at
  ) VALUES (
    p_report_id, p_user_reu_id, p_company_id, p_luminaires, p_sales_tax, p_rebates, p_shipping,
    p_reu_notes, p_deposit_amount, p_deposit_due, p_remainder_due, p_remainder_amount,
    p_reference, p_user_admin_consultant_id, true, NOW(), NOW()
  )
  RETURNING id INTO v_estimate_id;

  RETURN v_estimate_id;
END;
$$;

------------------------------------------------------------
-- fn_create_estimate_eu (EU estimate)
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_estimate_eu(
  p_project_id INTEGER,
  p_user_id UUID,
  p_estimate_reu_id INTEGER,
  p_company_id INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estimate_id INTEGER;
BEGIN
  INSERT INTO estimate_eu (project_id, user_id, estimate_reu_id, company_id, created_at, updated_at)
  VALUES (p_project_id, p_user_id, p_estimate_reu_id, p_company_id, NOW(), NOW())
  RETURNING id INTO v_estimate_id;

  RETURN v_estimate_id;
END;
$$;

------------------------------------------------------------
-- fn_approve_estimate
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_approve_estimate(
  p_estimate_id INTEGER,
  p_table_type TEXT, -- 'estimate' or 'estimate_reu'
  p_signature_text TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_type = 'estimate' THEN
    UPDATE estimate SET
      su_approved = true,
      su_signature = p_signature_text,
      su_signature_date = NOW()::text,
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSIF p_table_type = 'estimate_reu' THEN
    UPDATE estimate_reu SET
      reu_approved = true,
      reu_signature = p_signature_text,
      reu_signature_date = NOW()::text,
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSE
    RAISE EXCEPTION 'Invalid table_type: %', p_table_type;
  END IF;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_admin_approve_estimate
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_admin_approve_estimate(
  p_estimate_id INTEGER,
  p_table_type TEXT,
  p_admin_signature_text TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_type = 'estimate' THEN
    UPDATE estimate SET
      admin_signature = p_admin_signature_text,
      admin_signature_date = NOW()::text,
      user_admin_consultant_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSIF p_table_type = 'estimate_reu' THEN
    UPDATE estimate_reu SET
      admin_signature = p_admin_signature_text,
      admin_signature_date = NOW()::text,
      user_admin_consultant_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSE
    RAISE EXCEPTION 'Invalid table_type: %', p_table_type;
  END IF;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_convert_to_order
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_convert_to_order(
  p_estimate_id INTEGER,
  p_table_type TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_uid TEXT;
BEGIN
  v_order_uid := 'ORD-' || LPAD(p_estimate_id::text, 6, '0') || '-' || TO_CHAR(NOW(), 'YYYYMMDD');

  IF p_table_type = 'estimate' THEN
    UPDATE estimate SET
      is_order = true,
      order_uid = v_order_uid,
      order_date_created = NOW(),
      order_date_updated = NOW(),
      fulfilled_by_user_order_su_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSIF p_table_type = 'estimate_reu' THEN
    UPDATE estimate_reu SET
      is_order = true,
      order_uid = v_order_uid,
      order_date_created = NOW(),
      order_date_updated = NOW(),
      fulfilled_by_user_order_reu_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSE
    RAISE EXCEPTION 'Invalid table_type: %', p_table_type;
  END IF;

  RETURN v_order_uid;
END;
$$;

------------------------------------------------------------
-- fn_update_shipping
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_update_shipping(
  p_estimate_id INTEGER,
  p_table_type TEXT,
  p_shipping_details JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_type = 'estimate' THEN
    UPDATE estimate SET
      is_shipping = true,
      shipping_status = COALESCE(p_shipping_details->>'shipping_status', shipping_status),
      shipping_date_created = COALESCE(shipping_date_created, NOW()),
      shipping_date_updated = NOW(),
      fulfilled_by_user_shipping_su_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;

    -- Upsert shipping_detail
    INSERT INTO shipping_detail (
      estimate_su_id, sender_company_name, sender_tracking_link, sender_country,
      sender_address1, sender_address2, sender_city, sender_state, sender_zip_code, sender_phone,
      receiver_company_name, receiver_name, receiver_country,
      receiver_address1, receiver_address2, receiver_city, receiver_state, receiver_zip_code, receiver_phone,
      status, shipping_reference, luminaires, notes, created_at, updated_at
    ) VALUES (
      p_estimate_id,
      p_shipping_details->>'sender_company_name', p_shipping_details->>'sender_tracking_link',
      p_shipping_details->>'sender_country', p_shipping_details->>'sender_address1',
      p_shipping_details->>'sender_address2', p_shipping_details->>'sender_city',
      p_shipping_details->>'sender_state', p_shipping_details->>'sender_zip_code',
      p_shipping_details->>'sender_phone',
      p_shipping_details->>'receiver_company_name', p_shipping_details->>'receiver_name',
      p_shipping_details->>'receiver_country', p_shipping_details->>'receiver_address1',
      p_shipping_details->>'receiver_address2', p_shipping_details->>'receiver_city',
      p_shipping_details->>'receiver_state', p_shipping_details->>'receiver_zip_code',
      p_shipping_details->>'receiver_phone',
      COALESCE((p_shipping_details->>'status')::INTEGER, 0),
      COALESCE(p_shipping_details->>'shipping_reference', ''),
      (p_shipping_details->'luminaires'),
      p_shipping_details->>'notes',
      NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      sender_tracking_link = EXCLUDED.sender_tracking_link,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      updated_at = NOW();

  ELSIF p_table_type = 'estimate_reu' THEN
    UPDATE estimate_reu SET
      is_shipping = true,
      shipping_status = COALESCE(p_shipping_details->>'shipping_status', shipping_status),
      shipping_date_created = COALESCE(shipping_date_created, NOW()),
      shipping_date_updated = NOW(),
      fulfilled_by_user_shipping_reu_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSE
    RAISE EXCEPTION 'Invalid table_type: %', p_table_type;
  END IF;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_mark_invoice
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_mark_invoice(
  p_estimate_id INTEGER,
  p_table_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_type = 'estimate' THEN
    UPDATE estimate SET
      is_invoice = true,
      invoice_date_created = COALESCE(invoice_date_created, NOW()),
      invoice_date_updated = NOW(),
      fulfilled_by_user_invoice_su_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSIF p_table_type = 'estimate_reu' THEN
    UPDATE estimate_reu SET
      is_invoice = true,
      invoice_date_created = COALESCE(invoice_date_created, NOW()),
      invoice_date_updated = NOW(),
      fulfilled_by_user_invoice_reu_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSE
    RAISE EXCEPTION 'Invalid table_type: %', p_table_type;
  END IF;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_mark_receipt
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_mark_receipt(
  p_estimate_id INTEGER,
  p_table_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_type = 'estimate' THEN
    UPDATE estimate SET
      is_receipt = true,
      receipt_date_created = COALESCE(receipt_date_created, NOW()),
      receipt_date_updated = NOW(),
      fulfilled_by_user_receipt_su_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSIF p_table_type = 'estimate_reu' THEN
    UPDATE estimate_reu SET
      is_receipt = true,
      receipt_date_created = COALESCE(receipt_date_created, NOW()),
      receipt_date_updated = NOW(),
      fulfilled_by_user_receipt_reu_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSE
    RAISE EXCEPTION 'Invalid table_type: %', p_table_type;
  END IF;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_mark_fulfilled
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_mark_fulfilled(
  p_estimate_id INTEGER,
  p_table_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_type = 'estimate' THEN
    UPDATE estimate SET
      marked_fulfilled = true,
      marked_fulfilled_date_created = COALESCE(marked_fulfilled_date_created, NOW()),
      marked_fulfilled_date_updated = NOW(),
      fulfilled_by_user_estimate_su_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSIF p_table_type = 'estimate_reu' THEN
    UPDATE estimate_reu SET
      marked_fulfilled = true,
      marked_fulfilled_date_created = COALESCE(marked_fulfilled_date_created, NOW()),
      marked_fulfilled_date_updated = NOW(),
      fulfilled_by_user_estimate_reu_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSE
    RAISE EXCEPTION 'Invalid table_type: %', p_table_type;
  END IF;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_archive_estimate
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_archive_estimate(
  p_estimate_id INTEGER,
  p_table_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_type = 'estimate' THEN
    UPDATE estimate SET
      archived = true,
      archived_date_created = COALESCE(archived_date_created, NOW()),
      archived_date_updated = NOW(),
      archived_by_user_estimate_su_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSIF p_table_type = 'estimate_reu' THEN
    UPDATE estimate_reu SET
      archived = true,
      archived_date_created = COALESCE(archived_date_created, NOW()),
      archived_date_updated = NOW(),
      archived_by_user_estimate_reu_id = auth.uid(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSE
    RAISE EXCEPTION 'Invalid table_type: %', p_table_type;
  END IF;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_share_estimate_email
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_share_estimate_email(
  p_estimate_id INTEGER,
  p_recipient_emails TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estimate JSONB;
BEGIN
  -- Return estimate data for Edge Function to send email
  SELECT to_jsonb(e.*) INTO v_estimate FROM estimate e WHERE e.id = p_estimate_id;

  RETURN jsonb_build_object(
    'estimate', v_estimate,
    'recipients', to_jsonb(p_recipient_emails),
    'shared_by', auth.uid(),
    'shared_at', NOW()
  );
END;
$$;

------------------------------------------------------------
-- fn_get_estimates
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_get_estimates(
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
  v_table_type TEXT;
  v_company_id INTEGER;
  v_is_order BOOLEAN;
  v_archived BOOLEAN;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  v_table_type := COALESCE(p_filters->>'table_type', 'estimate');
  v_company_id := (p_filters->>'company_id')::INTEGER;
  v_is_order := (p_filters->>'is_order')::BOOLEAN;
  v_archived := COALESCE((p_filters->>'archived')::BOOLEAN, false);

  IF v_table_type = 'estimate' THEN
    SELECT COUNT(*) INTO v_total
    FROM estimate e
    WHERE (v_archived IS NULL OR COALESCE(e.archived, false) = v_archived)
      AND (v_company_id IS NULL OR e.company_id = v_company_id)
      AND (v_is_order IS NULL OR COALESCE(e.is_order, false) = v_is_order);

    SELECT COALESCE(jsonb_agg(to_jsonb(e.*) ORDER BY e.created_at DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT * FROM estimate e
      WHERE (v_archived IS NULL OR COALESCE(e.archived, false) = v_archived)
        AND (v_company_id IS NULL OR e.company_id = v_company_id)
        AND (v_is_order IS NULL OR COALESCE(e.is_order, false) = v_is_order)
      ORDER BY e.created_at DESC
      LIMIT p_page_size OFFSET v_offset
    ) e;
  ELSE
    SELECT COUNT(*) INTO v_total
    FROM estimate_reu e
    WHERE (v_archived IS NULL OR COALESCE(e.archived, false) = v_archived)
      AND (v_company_id IS NULL OR e.company_id = v_company_id)
      AND (v_is_order IS NULL OR COALESCE(e.is_order, false) = v_is_order);

    SELECT COALESCE(jsonb_agg(to_jsonb(e.*) ORDER BY e.created_at DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT * FROM estimate_reu e
      WHERE (v_archived IS NULL OR COALESCE(e.archived, false) = v_archived)
        AND (v_company_id IS NULL OR e.company_id = v_company_id)
        AND (v_is_order IS NULL OR COALESCE(e.is_order, false) = v_is_order)
      ORDER BY e.created_at DESC
      LIMIT p_page_size OFFSET v_offset
    ) e;
  END IF;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total_count', v_total,
    'page', p_page,
    'page_size', p_page_size
  );
END;
$$;

------------------------------------------------------------
-- fn_get_order_path
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_get_order_path(
  p_estimate_id INTEGER,
  p_table_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_table_type = 'estimate' THEN
    SELECT jsonb_build_object(
      'is_estimate', COALESCE(is_estimate, false),
      'su_approved', COALESCE(su_approved, false),
      'admin_signed', admin_signature IS NOT NULL,
      'is_order', COALESCE(is_order, false),
      'is_shipping', COALESCE(is_shipping, false),
      'is_invoice', COALESCE(is_invoice, false),
      'is_receipt', COALESCE(is_receipt, false),
      'marked_fulfilled', COALESCE(marked_fulfilled, false),
      'archived', COALESCE(archived, false),
      'current_stage', CASE
        WHEN COALESCE(archived, false) THEN 'archived'
        WHEN COALESCE(marked_fulfilled, false) THEN 'fulfilled'
        WHEN COALESCE(is_receipt, false) THEN 'receipt'
        WHEN COALESCE(is_invoice, false) THEN 'invoice'
        WHEN COALESCE(is_shipping, false) THEN 'shipping'
        WHEN COALESCE(is_order, false) THEN 'order'
        WHEN COALESCE(su_approved, false) THEN 'approved'
        WHEN COALESCE(is_estimate, false) THEN 'estimate'
        ELSE 'created'
      END
    ) INTO v_result
    FROM estimate WHERE id = p_estimate_id;
  ELSIF p_table_type = 'estimate_reu' THEN
    SELECT jsonb_build_object(
      'is_estimate', COALESCE(is_estimate, false),
      'reu_approved', COALESCE(reu_approved, false),
      'admin_signed', admin_signature IS NOT NULL,
      'is_order', COALESCE(is_order, false),
      'is_shipping', COALESCE(is_shipping, false),
      'is_invoice', COALESCE(is_invoice, false),
      'is_receipt', COALESCE(is_receipt, false),
      'marked_fulfilled', COALESCE(marked_fulfilled, false),
      'archived', COALESCE(archived, false),
      'current_stage', CASE
        WHEN COALESCE(archived, false) THEN 'archived'
        WHEN COALESCE(marked_fulfilled, false) THEN 'fulfilled'
        WHEN COALESCE(is_receipt, false) THEN 'receipt'
        WHEN COALESCE(is_invoice, false) THEN 'invoice'
        WHEN COALESCE(is_shipping, false) THEN 'shipping'
        WHEN COALESCE(is_order, false) THEN 'order'
        WHEN COALESCE(reu_approved, false) THEN 'approved'
        WHEN COALESCE(is_estimate, false) THEN 'estimate'
        ELSE 'created'
      END
    ) INTO v_result
    FROM estimate_reu WHERE id = p_estimate_id;
  ELSE
    RAISE EXCEPTION 'Invalid table_type: %', p_table_type;
  END IF;

  RETURN v_result;
END;
$$;
