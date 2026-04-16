-- 13_rls_policies.sql
-- Enable RLS on all 42 tables + helper functions + policies

------------------------------------------------------------
-- Helper functions
------------------------------------------------------------

CREATE OR REPLACE FUNCTION auth.user_type()
RETURNS user_type_enum
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT type FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT associated_to_company_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT type IN ('SUPERADMIN', 'Sa', 'Au')
  FROM public.profiles WHERE id = auth.uid();
$$;

------------------------------------------------------------
-- Enable RLS on all tables
------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_update_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_update_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_user_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_project ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_invited ENABLE ROW LEVEL SECURITY;
ALTER TABLE report ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_reu ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_eu ENABLE ROW LEVEL SECURITY;
ALTER TABLE eu_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE electrician_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE state ENABLE ROW LEVEL SECURITY;
ALTER TABLE city ENABLE ROW LEVEL SECURITY;
ALTER TABLE postal_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE page ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_translation ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_catalogue_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_platform_usage ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- PROFILES
------------------------------------------------------------

CREATE POLICY profiles_select ON profiles FOR SELECT USING (
  id = auth.uid()
  OR auth.is_admin()
  OR associated_to_company_id = auth.user_company_id()
);

CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (
  auth.is_admin()
);

CREATE POLICY profiles_update ON profiles FOR UPDATE USING (
  id = auth.uid()
);

CREATE POLICY profiles_delete ON profiles FOR DELETE USING (
  auth.user_type() = 'SUPERADMIN'
);

------------------------------------------------------------
-- USER_ROLES
------------------------------------------------------------

CREATE POLICY user_roles_select ON user_roles FOR SELECT USING (true);
CREATE POLICY user_roles_insert ON user_roles FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY user_roles_update ON user_roles FOR UPDATE USING (auth.is_admin());
CREATE POLICY user_roles_delete ON user_roles FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- USER_USER_ROLES
------------------------------------------------------------

CREATE POLICY user_user_roles_select ON user_user_roles FOR SELECT USING (
  user_id = auth.uid() OR auth.is_admin()
);
CREATE POLICY user_user_roles_insert ON user_user_roles FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY user_user_roles_update ON user_user_roles FOR UPDATE USING (auth.is_admin());
CREATE POLICY user_user_roles_delete ON user_user_roles FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- COMPANY
------------------------------------------------------------

CREATE POLICY company_select ON company FOR SELECT USING (
  auth.is_admin()
  OR id = auth.user_company_id()
);

CREATE POLICY company_insert ON company FOR INSERT WITH CHECK (
  auth.is_admin()
  OR owner_id = auth.uid()
);

CREATE POLICY company_update ON company FOR UPDATE USING (
  auth.is_admin()
  OR owner_id = auth.uid()
  OR admin_user_id = auth.uid()
);

CREATE POLICY company_delete ON company FOR DELETE USING (
  auth.is_admin()
);

------------------------------------------------------------
-- COMPANY_UPDATE_LOG
------------------------------------------------------------

CREATE POLICY company_update_log_select ON company_update_log FOR SELECT USING (
  auth.is_admin()
  OR company_id = auth.user_company_id()
);
CREATE POLICY company_update_log_insert ON company_update_log FOR INSERT WITH CHECK (
  auth.is_admin() OR updated_by_id = auth.uid()
);
CREATE POLICY company_update_log_update ON company_update_log FOR UPDATE USING (auth.is_admin());
CREATE POLICY company_update_log_delete ON company_update_log FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- PROJECT
------------------------------------------------------------

CREATE POLICY project_select ON project FOR SELECT USING (
  auth.is_admin()
  OR user_id = auth.uid()
  OR company_id = auth.user_company_id()
  OR EXISTS (
    SELECT 1 FROM user_project up WHERE up.project_id = project.id AND up.user_id = auth.uid()
  )
);

CREATE POLICY project_insert ON project FOR INSERT WITH CHECK (
  auth.is_admin()
  OR auth.user_type() IN ('Reu', 'Su')
);

CREATE POLICY project_update ON project FOR UPDATE USING (
  auth.is_admin()
  OR user_id = auth.uid()
);

CREATE POLICY project_delete ON project FOR DELETE USING (
  auth.is_admin()
);

------------------------------------------------------------
-- PROJECT_UPDATE_LOG
------------------------------------------------------------

CREATE POLICY project_update_log_select ON project_update_log FOR SELECT USING (
  auth.is_admin()
  OR updated_by_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM project p WHERE p.id = project_update_log.project_id
      AND (p.user_id = auth.uid() OR p.company_id = auth.user_company_id())
  )
);
CREATE POLICY project_update_log_insert ON project_update_log FOR INSERT WITH CHECK (
  auth.is_admin() OR updated_by_id = auth.uid()
);
CREATE POLICY project_update_log_update ON project_update_log FOR UPDATE USING (auth.is_admin());
CREATE POLICY project_update_log_delete ON project_update_log FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- PROJECT_USER_STATUSES
------------------------------------------------------------

CREATE POLICY project_user_statuses_select ON project_user_statuses FOR SELECT USING (
  auth.is_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM project p WHERE p.id = project_user_statuses.project_id AND p.company_id = auth.user_company_id()
  )
);
CREATE POLICY project_user_statuses_insert ON project_user_statuses FOR INSERT WITH CHECK (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY project_user_statuses_update ON project_user_statuses FOR UPDATE USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY project_user_statuses_delete ON project_user_statuses FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- USER_PROJECT
------------------------------------------------------------

CREATE POLICY user_project_select ON user_project FOR SELECT USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY user_project_insert ON user_project FOR INSERT WITH CHECK (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY user_project_update ON user_project FOR UPDATE USING (auth.is_admin());
CREATE POLICY user_project_delete ON user_project FOR DELETE USING (
  auth.is_admin() OR user_id = auth.uid()
);

------------------------------------------------------------
-- USERS_INVITED
------------------------------------------------------------

CREATE POLICY users_invited_select ON users_invited FOR SELECT USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY users_invited_insert ON users_invited FOR INSERT WITH CHECK (
  auth.is_admin() OR auth.user_type() IN ('Reu', 'Su')
);
CREATE POLICY users_invited_update ON users_invited FOR UPDATE USING (auth.is_admin());
CREATE POLICY users_invited_delete ON users_invited FOR DELETE USING (
  auth.is_admin() OR user_id = auth.uid()
);

------------------------------------------------------------
-- REPORT
------------------------------------------------------------

CREATE POLICY report_select ON report FOR SELECT USING (
  auth.is_admin()
  OR created_by_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM project p WHERE p.id = report.project_id
      AND (p.user_id = auth.uid() OR p.company_id = auth.user_company_id())
  )
);
CREATE POLICY report_insert ON report FOR INSERT WITH CHECK (
  auth.is_admin() OR created_by_id = auth.uid()
);
CREATE POLICY report_update ON report FOR UPDATE USING (
  auth.is_admin() OR created_by_id = auth.uid()
);
CREATE POLICY report_delete ON report FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- ESTIMATE_REU
------------------------------------------------------------

CREATE POLICY estimate_reu_select ON estimate_reu FOR SELECT USING (
  auth.is_admin()
  OR user_reu_id = auth.uid()
  OR user_admin_consultant_id = auth.uid()
  OR company_id = auth.user_company_id()
);
CREATE POLICY estimate_reu_insert ON estimate_reu FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY estimate_reu_update ON estimate_reu FOR UPDATE USING (auth.is_admin());
CREATE POLICY estimate_reu_delete ON estimate_reu FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- ESTIMATE
------------------------------------------------------------

CREATE POLICY estimate_select ON estimate FOR SELECT USING (
  auth.is_admin()
  OR user_su_id = auth.uid()
  OR user_reu_id = auth.uid()
  OR user_admin_consultant_id = auth.uid()
  OR company_id = auth.user_company_id()
);
CREATE POLICY estimate_insert ON estimate FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY estimate_update ON estimate FOR UPDATE USING (auth.is_admin());
CREATE POLICY estimate_delete ON estimate FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- ESTIMATE_EU
------------------------------------------------------------

CREATE POLICY estimate_eu_select ON estimate_eu FOR SELECT USING (
  auth.is_admin()
  OR user_id = auth.uid()
  OR company_id = auth.user_company_id()
);
CREATE POLICY estimate_eu_insert ON estimate_eu FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY estimate_eu_update ON estimate_eu FOR UPDATE USING (auth.is_admin());
CREATE POLICY estimate_eu_delete ON estimate_eu FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- EU_REPORTS
------------------------------------------------------------

CREATE POLICY eu_reports_select ON eu_reports FOR SELECT USING (
  auth.is_admin()
  OR user_id = auth.uid()
);
CREATE POLICY eu_reports_insert ON eu_reports FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY eu_reports_update ON eu_reports FOR UPDATE USING (auth.is_admin());
CREATE POLICY eu_reports_delete ON eu_reports FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- ELECTRICIAN_BIDS
------------------------------------------------------------

CREATE POLICY electrician_bids_select ON electrician_bids FOR SELECT USING (
  auth.is_admin()
  OR user_id = auth.uid()
);
CREATE POLICY electrician_bids_insert ON electrician_bids FOR INSERT WITH CHECK (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY electrician_bids_update ON electrician_bids FOR UPDATE USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY electrician_bids_delete ON electrician_bids FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- SHIPPING_DETAIL
------------------------------------------------------------

CREATE POLICY shipping_detail_select ON shipping_detail FOR SELECT USING (
  auth.is_admin()
  OR EXISTS (
    SELECT 1 FROM estimate e WHERE e.id = shipping_detail.estimate_su_id
      AND (e.user_su_id = auth.uid() OR e.user_reu_id = auth.uid() OR e.company_id = auth.user_company_id())
  )
);
CREATE POLICY shipping_detail_insert ON shipping_detail FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY shipping_detail_update ON shipping_detail FOR UPDATE USING (auth.is_admin());
CREATE POLICY shipping_detail_delete ON shipping_detail FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- GEOGRAPHIC: state, city, postal_code
------------------------------------------------------------

CREATE POLICY state_select ON state FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY state_insert ON state FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY state_update ON state FOR UPDATE USING (auth.is_admin());
CREATE POLICY state_delete ON state FOR DELETE USING (auth.is_admin());

CREATE POLICY city_select ON city FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY city_insert ON city FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY city_update ON city FOR UPDATE USING (auth.is_admin());
CREATE POLICY city_delete ON city FOR DELETE USING (auth.is_admin());

CREATE POLICY postal_code_select ON postal_code FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY postal_code_insert ON postal_code FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY postal_code_update ON postal_code FOR UPDATE USING (auth.is_admin());
CREATE POLICY postal_code_delete ON postal_code FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- UPLOADS + junction tables
------------------------------------------------------------

CREATE POLICY uploads_select ON uploads FOR SELECT USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY uploads_insert ON uploads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY uploads_update ON uploads FOR UPDATE USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY uploads_delete ON uploads FOR DELETE USING (
  auth.is_admin() OR user_id = auth.uid()
);

CREATE POLICY uploads_company_select ON uploads_company FOR SELECT USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY uploads_company_insert ON uploads_company FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY uploads_company_update ON uploads_company FOR UPDATE USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY uploads_company_delete ON uploads_company FOR DELETE USING (
  auth.is_admin() OR user_id = auth.uid()
);

CREATE POLICY uploads_projects_select ON uploads_projects FOR SELECT USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY uploads_projects_insert ON uploads_projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY uploads_projects_update ON uploads_projects FOR UPDATE USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY uploads_projects_delete ON uploads_projects FOR DELETE USING (
  auth.is_admin() OR user_id = auth.uid()
);

CREATE POLICY uploads_invoice_select ON uploads_invoice FOR SELECT USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY uploads_invoice_insert ON uploads_invoice FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY uploads_invoice_update ON uploads_invoice FOR UPDATE USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY uploads_invoice_delete ON uploads_invoice FOR DELETE USING (
  auth.is_admin() OR user_id = auth.uid()
);

CREATE POLICY uploads_receipt_select ON uploads_receipt FOR SELECT USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY uploads_receipt_insert ON uploads_receipt FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY uploads_receipt_update ON uploads_receipt FOR UPDATE USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY uploads_receipt_delete ON uploads_receipt FOR DELETE USING (
  auth.is_admin() OR user_id = auth.uid()
);

------------------------------------------------------------
-- ACTIVITY
------------------------------------------------------------

CREATE POLICY activity_select ON activity FOR SELECT USING (
  auth.is_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM project p WHERE p.id = activity.project_id
      AND (p.user_id = auth.uid() OR p.company_id = auth.user_company_id())
  )
);
CREATE POLICY activity_insert ON activity FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY activity_delete ON activity FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- NOTIFICATION
------------------------------------------------------------

CREATE POLICY notification_select ON notification FOR SELECT USING (
  receiver_id = auth.uid()
  OR user_id = auth.uid()
  OR auth.is_admin()
);
CREATE POLICY notification_insert ON notification FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY notification_update ON notification FOR UPDATE USING (
  receiver_id = auth.uid()
);
CREATE POLICY notification_delete ON notification FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- MESSAGES
------------------------------------------------------------

CREATE POLICY messages_select ON messages FOR SELECT USING (
  sender_id = auth.uid()
  OR receiver_id = auth.uid()
  OR auth.is_admin()
);
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY messages_update ON messages FOR UPDATE USING (auth.is_admin());
CREATE POLICY messages_delete ON messages FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- CONTACT
------------------------------------------------------------

CREATE POLICY contact_select ON contact FOR SELECT USING (auth.is_admin());
CREATE POLICY contact_insert ON contact FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY contact_update ON contact FOR UPDATE USING (auth.is_admin());
CREATE POLICY contact_delete ON contact FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- PRODUCT
------------------------------------------------------------

CREATE POLICY product_select ON product FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY product_insert ON product FOR INSERT WITH CHECK (
  auth.is_admin()
  OR (auth.user_type() = 'Su' AND user_id = auth.uid())
);
CREATE POLICY product_update ON product FOR UPDATE USING (
  auth.is_admin()
  OR (auth.user_type() = 'Su' AND user_id = auth.uid())
);
CREATE POLICY product_delete ON product FOR DELETE USING (
  auth.is_admin()
  OR (auth.user_type() = 'Su' AND user_id = auth.uid())
);

------------------------------------------------------------
-- ERROR_LOG / ERROR_MESSAGE
------------------------------------------------------------

CREATE POLICY error_log_select ON error_log FOR SELECT USING (auth.is_admin());
CREATE POLICY error_log_insert ON error_log FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY error_log_update ON error_log FOR UPDATE USING (auth.is_admin());
CREATE POLICY error_log_delete ON error_log FOR DELETE USING (auth.is_admin());

CREATE POLICY error_message_select ON error_message FOR SELECT USING (auth.is_admin());
CREATE POLICY error_message_insert ON error_message FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY error_message_update ON error_message FOR UPDATE USING (auth.is_admin());
CREATE POLICY error_message_delete ON error_message FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- PAGE / PAGE_TRANSLATION
------------------------------------------------------------

CREATE POLICY page_select ON page FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY page_insert ON page FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY page_update ON page FOR UPDATE USING (auth.is_admin());
CREATE POLICY page_delete ON page FOR DELETE USING (auth.is_admin());

CREATE POLICY page_translation_select ON page_translation FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY page_translation_insert ON page_translation FOR INSERT WITH CHECK (auth.is_admin());
CREATE POLICY page_translation_update ON page_translation FOR UPDATE USING (auth.is_admin());
CREATE POLICY page_translation_delete ON page_translation FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- USER_CATALOGUE_COUNTS
------------------------------------------------------------

CREATE POLICY user_catalogue_counts_select ON user_catalogue_counts FOR SELECT USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY user_catalogue_counts_insert ON user_catalogue_counts FOR INSERT WITH CHECK (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY user_catalogue_counts_update ON user_catalogue_counts FOR UPDATE USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY user_catalogue_counts_delete ON user_catalogue_counts FOR DELETE USING (auth.is_admin());

------------------------------------------------------------
-- USER_PLATFORM_USAGE
------------------------------------------------------------

CREATE POLICY user_platform_usage_select ON user_platform_usage FOR SELECT USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY user_platform_usage_insert ON user_platform_usage FOR INSERT WITH CHECK (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY user_platform_usage_update ON user_platform_usage FOR UPDATE USING (
  auth.is_admin() OR user_id = auth.uid()
);
CREATE POLICY user_platform_usage_delete ON user_platform_usage FOR DELETE USING (auth.is_admin());
