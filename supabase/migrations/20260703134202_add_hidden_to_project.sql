-- Add hidden flag to project table
ALTER TABLE project
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- RPC: toggle the hidden flag for a project
CREATE OR REPLACE FUNCTION fn_toggle_project_hidden(p_project_id integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_value boolean;
BEGIN
  UPDATE project
  SET hidden = NOT hidden
  WHERE id = p_project_id
  RETURNING hidden INTO v_new_value;

  RETURN v_new_value;
END;
$$;