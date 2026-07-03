-- Persist calculated report metrics back to the report row.
-- Called from the TypeScript useCalculateReport hook after the client-side
-- calculateReport() function runs.

CREATE OR REPLACE FUNCTION public.fn_save_report_calculation(
  p_report_id   INTEGER,
  p_calculation JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE report SET
    -- All-in project price
    system_price          = p_calculation->>'projectTotal',
    -- LED luminaires subtotal
    led_price             = p_calculation->>'ledLuminaires',
    -- Annual cost savings (stored in cost_year for historical compatibility)
    cost_year             = p_calculation->>'annualSavings',
    -- kW reduced (formatted string "1,234.56")
    kwreduced             = p_calculation->>'energySaved',
    -- Payback period in years
    payback               = p_calculation->>'payback',
    -- CRI and lumen improvements
    added_cri             = p_calculation->>'criGlobal',
    added_lumens          = p_calculation->>'lumensGlobal',
    lumen_increase_sq_ft  = p_calculation->>'lumenIncreaseSqFt',
    lumen_increase_fixture = p_calculation->>'lumenIncreaseFixture',
    -- Quality metrics
    color_tunable         = p_calculation->>'colorTunable',
    sensors               = p_calculation->>'sensor',
    -- Tax amount
    tax                   = p_calculation->>'tax'
  WHERE id = p_report_id;

  RETURN FOUND;
END;
$$;
