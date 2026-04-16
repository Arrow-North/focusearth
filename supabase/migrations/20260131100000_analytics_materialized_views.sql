-- Analytics Materialized Views
-- These views pre-compute analytics data for fast dashboard rendering.

-- 1. Overview: User type summary
CREATE MATERIALIZED VIEW mv_overview_user_summary AS
SELECT
  p.type                          AS user_type,
  COUNT(*)                        AS qty,
  COALESCE(SUM(upu.total), 0)    AS ep_usage_hours
FROM profiles p
LEFT JOIN user_platform_usage upu ON upu.user_id = p.id
WHERE p.is_deleted = false
GROUP BY p.type;

-- 2. Overview: Company activity
CREATE MATERIALIZED VIEW mv_overview_company_activity AS
SELECT
  c.id                            AS company_id,
  c.name                          AS company_name,
  c.type                          AS company_type,
  COUNT(DISTINCT p.id)            AS user_count,
  COUNT(DISTINCT a.id)            AS activity_count
FROM company c
LEFT JOIN profiles p ON p.associated_to_company_id = c.id AND p.is_deleted = false
LEFT JOIN activity a ON a.user_id = p.id
WHERE c.is_deleted = false
GROUP BY c.id, c.name, c.type;

-- 3. Real Estate stats
CREATE MATERIALIZED VIEW mv_real_estate_stats AS
SELECT
  proj.property_type,
  proj.property_size,
  proj.status                      AS project_status,
  proj.id                          AS project_id,
  er.id                            AS estimate_reu_id,
  er.is_order                      AS reu_is_order,
  er.marked_fulfilled              AS reu_fulfilled,
  er.luminaires                    AS reu_luminaires,
  er.created_at                    AS reu_created_at,
  p.id                             AS user_id,
  p.first_name,
  p.last_name,
  p.type                           AS user_type
FROM project proj
LEFT JOIN report r ON r.project_id = proj.id
LEFT JOIN estimate_reu er ON er.report_id = r.id AND er.archived = false
LEFT JOIN profiles p ON p.id = proj.user_id AND p.is_deleted = false
WHERE proj.archived = false;

-- 4. Supplier stats
CREATE MATERIALIZED VIEW mv_supplier_stats AS
SELECT
  prod.id                          AS product_id,
  prod.airtable_colum_name         AS product_category,
  prod.details->>'productType'     AS product_type,
  prod.details->>'pricePerUnit'    AS price_per_unit,
  prod.company_id,
  e.id                             AS estimate_su_id,
  e.is_order                       AS su_is_order,
  e.marked_fulfilled               AS su_fulfilled,
  e.luminaires                     AS su_luminaires,
  e.created_at                     AS estimate_created_at,
  p.id                             AS user_id,
  p.first_name,
  p.last_name,
  p.type                           AS user_type,
  c.name                           AS company_name
FROM product prod
LEFT JOIN estimate e ON e.id = prod.estimate_su_id AND e.archived = false
LEFT JOIN profiles p ON p.id = prod.user_id AND p.is_deleted = false
LEFT JOIN company c ON c.id = prod.company_id AND c.is_deleted = false;

-- 5. Electrician stats
CREATE MATERIALIZED VIEW mv_electrician_stats AS
SELECT
  eeu.id                           AS estimate_eu_id,
  eeu.project_id,
  eeu.company_id,
  eeu.user_id,
  eb.total                         AS bid_total,
  eb.bid_status,
  eb.labor,
  eb.materials,
  proj.title                       AS project_title,
  proj.state                       AS project_state,
  proj.property_size,
  p.first_name,
  p.last_name,
  p.type                           AS user_type,
  c.name                           AS company_name,
  c.service_areas
FROM estimate_eu eeu
LEFT JOIN electrician_bids eb ON eb.estimate_eu_id = eeu.id
LEFT JOIN project proj ON proj.id = eeu.project_id AND proj.archived = false
LEFT JOIN profiles p ON p.id = eeu.user_id AND p.is_deleted = false
LEFT JOIN company c ON c.id = eeu.company_id AND c.is_deleted = false;

-- 6. Sales stats
CREATE MATERIALIZED VIEW mv_sales_stats AS
SELECT
  proj.id                          AS project_id,
  proj.property_size,
  proj.status                      AS project_status,
  proj.title                       AS project_title,
  r.id                             AS report_id,
  r.system_price,
  r.led_price,
  r.approved                       AS report_approved,
  e.id                             AS estimate_su_id,
  e.is_order                       AS su_is_order,
  er.id                            AS estimate_reu_id,
  er.is_order                      AS reu_is_order,
  p.id                             AS user_id,
  p.first_name,
  p.last_name,
  p.type                           AS user_type
FROM project proj
LEFT JOIN report r ON r.project_id = proj.id
LEFT JOIN estimate e ON e.report_id = r.id AND e.archived = false
LEFT JOIN estimate_reu er ON er.report_id = r.id AND er.archived = false
LEFT JOIN profiles p ON p.id = proj.user_id AND p.is_deleted = false
WHERE proj.archived = false;

-- 7. Admin stats
CREATE MATERIALIZED VIEW mv_admin_stats AS
SELECT
  p.id                             AS user_id,
  p.first_name,
  p.last_name,
  p.type                           AS user_type,
  (SELECT COUNT(*) FROM company c WHERE c.admin_user_id = p.id AND c.is_deleted = false) AS companies_managed,
  (SELECT COUNT(*) FROM estimate e WHERE e.user_admin_consultant_id = p.id AND e.is_order = true AND e.archived = false) +
  (SELECT COUNT(*) FROM estimate_reu er WHERE er.user_admin_consultant_id = p.id AND er.is_order = true AND er.archived = false) AS active_orders,
  COALESCE(ucc.fixture, 0) + COALESCE(ucc.lamp, 0) + COALESCE(ucc.control, 0) + COALESCE(ucc.power_supply, 0) + COALESCE(ucc.accessory, 0) AS products_managed,
  (SELECT COUNT(*) FROM messages m WHERE m.sender_id = p.id) AS messages_sent,
  (SELECT COUNT(*) FROM activity a WHERE a.user_id = p.id) AS activity_count
FROM profiles p
LEFT JOIN user_catalogue_counts ucc ON ucc.user_id = p.id
WHERE p.is_deleted = false AND p.type IN ('SUPERADMIN', 'Sa', 'Au');

-- Indexes
CREATE UNIQUE INDEX ON mv_overview_user_summary (user_type);
CREATE UNIQUE INDEX ON mv_overview_company_activity (company_id);
CREATE INDEX ON mv_real_estate_stats (project_id);
CREATE INDEX ON mv_supplier_stats (product_id);
CREATE INDEX ON mv_electrician_stats (estimate_eu_id);
CREATE INDEX ON mv_sales_stats (project_id);
CREATE INDEX ON mv_admin_stats (user_id);
