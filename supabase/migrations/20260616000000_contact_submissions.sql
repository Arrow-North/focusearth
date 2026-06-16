-- Contact page submissions for REU/SU users and superadmin review.

ALTER TABLE public.contact
  ADD COLUMN IF NOT EXISTS submitter_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES public.company(id),
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_contact_submitter_id ON public.contact(submitter_id);
CREATE INDEX IF NOT EXISTS idx_contact_assigned_to ON public.contact(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contact_created_at ON public.contact(created_at DESC);

------------------------------------------------------------
-- fn_submit_contact_request
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_submit_contact_request(
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_subject TEXT,
  p_message TEXT,
  p_company_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_assigned_to UUID;
  v_contact contact%ROWTYPE;
  v_sender_name TEXT;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = auth.uid() AND is_deleted = false;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for current user';
  END IF;

  IF v_profile.type NOT IN ('Reu', 'Su') THEN
    RAISE EXCEPTION 'Only real estate and supplier users can submit contact requests';
  END IF;

  SELECT id INTO v_assigned_to
  FROM profiles
  WHERE type = 'SUPERADMIN' AND is_deleted = false AND enabled = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_assigned_to IS NULL THEN
    SELECT id INTO v_assigned_to
    FROM profiles
    WHERE type = 'SUPERADMIN' AND is_deleted = false
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  INSERT INTO contact (
    name,
    phone,
    email,
    subject,
    message,
    user_id,
    type,
    submitter_id,
    assigned_to,
    company_id,
    company_name,
    status,
    created_at,
    updated_at
  ) VALUES (
    NULLIF(TRIM(p_name), ''),
    NULLIF(TRIM(p_phone), ''),
    NULLIF(TRIM(p_email), ''),
    NULLIF(TRIM(p_subject), ''),
    NULLIF(TRIM(p_message), ''),
    v_profile.legacy_id,
    CASE WHEN v_profile.type = 'Reu' THEN 1 WHEN v_profile.type = 'Su' THEN 2 ELSE 0 END,
    v_profile.id,
    v_assigned_to,
    v_profile.associated_to_company_id,
    NULLIF(TRIM(p_company_name), ''),
    'new',
    NOW(),
    NOW()
  )
  RETURNING * INTO v_contact;

  IF v_assigned_to IS NOT NULL THEN
    v_sender_name := CONCAT_WS(' ', v_profile.first_name, v_profile.last_name);

    INSERT INTO notification (
      receiver_id,
      contact_id,
      user_id,
      company_id,
      sender_name,
      seen,
      description,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_assigned_to,
      v_contact.id,
      v_profile.id,
      v_profile.associated_to_company_id,
      v_sender_name,
      false,
      'New contact form submission',
      28,
      NOW(),
      NOW()
    );
  END IF;

  RETURN to_jsonb(v_contact);
END;
$$;

------------------------------------------------------------
-- fn_list_contact_submissions
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_list_contact_submissions(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50
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
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  v_offset := GREATEST(p_page - 1, 0) * p_page_size;

  SELECT COUNT(*) INTO v_total
  FROM contact c
  WHERE c.submitter_id IS NOT NULL;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at_value DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      c.created_at AS created_at_value,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'phone', c.phone,
        'email', c.email,
        'subject', c.subject,
        'message', c.message,
        'status', c.status,
        'company_id', c.company_id,
        'company_name', COALESCE(c.company_name, co.name),
        'submitter_id', c.submitter_id,
        'assigned_to', c.assigned_to,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'submitter', jsonb_build_object(
          'id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'email', p.email,
          'type', p.type
        ),
        'assignee', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', a.id,
          'first_name', a.first_name,
          'last_name', a.last_name,
          'email', a.email
        ) END
      ) AS row_data
    FROM contact c
    LEFT JOIN profiles p ON p.id = c.submitter_id
    LEFT JOIN profiles a ON a.id = c.assigned_to
    LEFT JOIN company co ON co.id = c.company_id
    WHERE c.submitter_id IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) rows;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'total_count', v_total,
    'page', p_page,
    'page_size', p_page_size
  );
END;
$$;
