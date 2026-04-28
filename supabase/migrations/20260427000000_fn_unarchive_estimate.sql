-- Migration: fn_unarchive_estimate
-- Unarchive an estimate/order, reversing the archive operation

------------------------------------------------------------
-- fn_unarchive_estimate
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_unarchive_estimate(
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
      archived = false,
      archived_date_updated = NOW(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSIF p_table_type = 'estimate_reu' THEN
    UPDATE estimate_reu SET
      archived = false,
      archived_date_updated = NOW(),
      updated_at = NOW()
    WHERE id = p_estimate_id;
  ELSE
    RAISE EXCEPTION 'Invalid table_type: %', p_table_type;
  END IF;

  RETURN true;
END;
$$;
