-- Analytics Cron Job: Refresh materialized views every 15 minutes

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule refresh every 15 minutes
SELECT cron.schedule(
  'refresh-analytics-views',
  '*/15 * * * *',
  $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_overview_user_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_overview_company_activity;
    REFRESH MATERIALIZED VIEW mv_real_estate_stats;
    REFRESH MATERIALIZED VIEW mv_supplier_stats;
    REFRESH MATERIALIZED VIEW mv_electrician_stats;
    REFRESH MATERIALIZED VIEW mv_sales_stats;
    REFRESH MATERIALIZED VIEW mv_admin_stats;
  $$
);

-- Manual refresh function for on-demand use
CREATE OR REPLACE FUNCTION fn_refresh_analytics_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_overview_user_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_overview_company_activity;
  REFRESH MATERIALIZED VIEW mv_real_estate_stats;
  REFRESH MATERIALIZED VIEW mv_supplier_stats;
  REFRESH MATERIALIZED VIEW mv_electrician_stats;
  REFRESH MATERIALIZED VIEW mv_sales_stats;
  REFRESH MATERIALIZED VIEW mv_admin_stats;
END;
$$;
