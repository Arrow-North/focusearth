-- Update fn_list_notifications to support unseen-only filter

CREATE OR REPLACE FUNCTION public.fn_list_notifications(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_unseen_only BOOLEAN DEFAULT false
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
  WHERE receiver_id = auth.uid()
    AND (NOT p_unseen_only OR seen = false);

  SELECT COALESCE(jsonb_agg(to_jsonb(n.*) ORDER BY n.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT * FROM notification
    WHERE receiver_id = auth.uid()
      AND (NOT p_unseen_only OR seen = false)
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
