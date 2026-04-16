-- 12_indexes.sql
-- All non-PK, non-UNIQUE FK indexes from the original MySQL schema
-- PostgreSQL auto-creates indexes for PRIMARY KEY and UNIQUE constraints

-- activity
CREATE INDEX idx_activity_project_id ON activity(project_id);
CREATE INDEX idx_activity_project_update_log_id ON activity(project_update_log_id);
CREATE INDEX idx_activity_product_id ON activity(product_id);
CREATE INDEX idx_activity_estimate_reu_id ON activity(estimate_reu_id);
CREATE INDEX idx_activity_estimate_id ON activity(estimate_id);
CREATE INDEX idx_activity_user_id ON activity(user_id);

-- city
CREATE INDEX idx_city_state_id ON city(state_id);

-- company
CREATE INDEX idx_company_admin_user_id ON company(admin_user_id);
CREATE INDEX idx_company_owner_id ON company(owner_id);

-- company_update_log
CREATE INDEX idx_company_update_log_updated_by_id ON company_update_log(updated_by_id);
CREATE INDEX idx_company_update_log_company_id ON company_update_log(company_id);

-- electrician_bids
CREATE INDEX idx_electrician_bids_project_id ON electrician_bids(project_id);
CREATE INDEX idx_electrician_bids_estimate_eu_id ON electrician_bids(estimate_eu_id);
CREATE INDEX idx_electrician_bids_report_id ON electrician_bids(report_id);
CREATE INDEX idx_electrician_bids_user_id ON electrician_bids(user_id);

-- estimate
CREATE INDEX idx_estimate_archived_by_user_estimate_su_id ON estimate(archived_by_user_estimate_su_id);
CREATE INDEX idx_estimate_fulfilled_by_user_shipping_su_id ON estimate(fulfilled_by_user_shipping_su_id);
CREATE INDEX idx_estimate_report_id ON estimate(report_id);
CREATE INDEX idx_estimate_fulfilled_by_user_order_su_id ON estimate(fulfilled_by_user_order_su_id);
CREATE INDEX idx_estimate_user_su_id ON estimate(user_su_id);
CREATE INDEX idx_estimate_user_reu_id ON estimate(user_reu_id);
CREATE INDEX idx_estimate_estimate_reu_id ON estimate(estimate_reu_id);
CREATE INDEX idx_estimate_fulfilled_by_user_invoice_su_id ON estimate(fulfilled_by_user_invoice_su_id);
CREATE INDEX idx_estimate_company_id ON estimate(company_id);
CREATE INDEX idx_estimate_fulfilled_by_user_estimate_su_id ON estimate(fulfilled_by_user_estimate_su_id);
CREATE INDEX idx_estimate_fulfilled_by_user_receipt_su_id ON estimate(fulfilled_by_user_receipt_su_id);
CREATE INDEX idx_estimate_user_admin_consultant_id ON estimate(user_admin_consultant_id);

-- estimate_eu
CREATE INDEX idx_estimate_eu_project_id ON estimate_eu(project_id);
CREATE INDEX idx_estimate_eu_estimate_reu_id ON estimate_eu(estimate_reu_id);
CREATE INDEX idx_estimate_eu_company_id ON estimate_eu(company_id);
CREATE INDEX idx_estimate_eu_user_id ON estimate_eu(user_id);

-- estimate_reu
CREATE INDEX idx_estimate_reu_fulfilled_by_user_receipt_reu_id ON estimate_reu(fulfilled_by_user_receipt_reu_id);
CREATE INDEX idx_estimate_reu_report_id ON estimate_reu(report_id);
CREATE INDEX idx_estimate_reu_user_reu_id ON estimate_reu(user_reu_id);
CREATE INDEX idx_estimate_reu_fulfilled_by_user_order_reu_id ON estimate_reu(fulfilled_by_user_order_reu_id);
CREATE INDEX idx_estimate_reu_company_id ON estimate_reu(company_id);
CREATE INDEX idx_estimate_reu_archived_by_user_estimate_reu_id ON estimate_reu(archived_by_user_estimate_reu_id);
CREATE INDEX idx_estimate_reu_user_admin_consultant_id ON estimate_reu(user_admin_consultant_id);
CREATE INDEX idx_estimate_reu_fulfilled_by_user_invoice_reu_id ON estimate_reu(fulfilled_by_user_invoice_reu_id);
CREATE INDEX idx_estimate_reu_fulfilled_by_user_shipping_reu_id ON estimate_reu(fulfilled_by_user_shipping_reu_id);
CREATE INDEX idx_estimate_reu_fulfilled_by_user_estimate_reu_id ON estimate_reu(fulfilled_by_user_estimate_reu_id);

-- eu_reports
CREATE INDEX idx_eu_reports_project_id ON eu_reports(project_id);
CREATE INDEX idx_eu_reports_report_id ON eu_reports(report_id);
CREATE INDEX idx_eu_reports_user_id ON eu_reports(user_id);

-- messages
CREATE INDEX idx_messages_activity_id ON messages(activity_id);
CREATE INDEX idx_messages_company_id ON messages(company_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_contact_id ON messages(contact_id);
CREATE INDEX idx_messages_notification_id ON messages(notification_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- notification
CREATE INDEX idx_notification_project_id ON notification(project_id);
CREATE INDEX idx_notification_report_id ON notification(report_id);
CREATE INDEX idx_notification_estimate_reu_id ON notification(estimate_reu_id);
CREATE INDEX idx_notification_estimate_id ON notification(estimate_id);
CREATE INDEX idx_notification_company_id ON notification(company_id);
CREATE INDEX idx_notification_user_id ON notification(user_id);
CREATE INDEX idx_notification_receiver_id ON notification(receiver_id);
CREATE INDEX idx_notification_contact_id ON notification(contact_id);

-- page_translation
CREATE INDEX idx_page_translation_object_id ON page_translation(object_id);

-- postal_code
CREATE INDEX idx_postal_code_city_id ON postal_code(city_id);

-- product
CREATE INDEX idx_product_project_id ON product(project_id);
CREATE INDEX idx_product_report_id ON product(report_id);
CREATE INDEX idx_product_company_id ON product(company_id);
CREATE INDEX idx_product_user_id ON product(user_id);
CREATE INDEX idx_product_estimate_su_id ON product(estimate_su_id);

-- project
CREATE INDEX idx_project_company_id ON project(company_id);
CREATE INDEX idx_project_user_id ON project(user_id);

-- project_update_log
CREATE INDEX idx_project_update_log_project_id ON project_update_log(project_id);
CREATE INDEX idx_project_update_log_updated_by_id ON project_update_log(updated_by_id);

-- project_user_statuses
CREATE INDEX idx_project_user_statuses_project_id ON project_user_statuses(project_id);
CREATE INDEX idx_project_user_statuses_user_id ON project_user_statuses(user_id);

-- report
CREATE INDEX idx_report_project_id ON report(project_id);
CREATE INDEX idx_report_created_by_id ON report(created_by_id);

-- shipping_detail
CREATE INDEX idx_shipping_detail_estimate_su_id ON shipping_detail(estimate_su_id);

-- uploads
CREATE INDEX idx_uploads_user_id ON uploads(user_id);

-- uploads_company
CREATE INDEX idx_uploads_company_file_id ON uploads_company(file_id);
CREATE INDEX idx_uploads_company_company_id ON uploads_company(company_id);
CREATE INDEX idx_uploads_company_user_id ON uploads_company(user_id);

-- uploads_invoice
CREATE INDEX idx_uploads_invoice_estimate_reu_id ON uploads_invoice(estimate_reu_id);
CREATE INDEX idx_uploads_invoice_file_id ON uploads_invoice(file_id);
CREATE INDEX idx_uploads_invoice_user_id ON uploads_invoice(user_id);
CREATE INDEX idx_uploads_invoice_estimate_su_id ON uploads_invoice(estimate_su_id);

-- uploads_projects
CREATE INDEX idx_uploads_projects_project_id ON uploads_projects(project_id);
CREATE INDEX idx_uploads_projects_files_id ON uploads_projects(files_id);
CREATE INDEX idx_uploads_projects_user_id ON uploads_projects(user_id);

-- uploads_receipt
CREATE INDEX idx_uploads_receipt_estimate_reu_id ON uploads_receipt(estimate_reu_id);
CREATE INDEX idx_uploads_receipt_file_id ON uploads_receipt(file_id);
CREATE INDEX idx_uploads_receipt_user_id ON uploads_receipt(user_id);
CREATE INDEX idx_uploads_receipt_estimate_su_id ON uploads_receipt(estimate_su_id);

-- profiles
CREATE INDEX idx_profiles_associated_to_company_id ON profiles(associated_to_company_id);

-- user_user_roles
CREATE INDEX idx_user_user_roles_user_id ON user_user_roles(user_id);
CREATE INDEX idx_user_user_roles_user_roles_id ON user_user_roles(user_roles_id);

-- user_project
CREATE INDEX idx_user_project_project_id ON user_project(project_id);
CREATE INDEX idx_user_project_user_id ON user_project(user_id);

-- users_invited
CREATE INDEX idx_users_invited_project_id ON users_invited(project_id);
CREATE INDEX idx_users_invited_user_id ON users_invited(user_id);

-- user_platform_usage
CREATE INDEX idx_user_platform_usage_user_id ON user_platform_usage(user_id);

-- GIN indexes on JSONB columns
CREATE INDEX idx_profiles_roles_gin ON profiles USING GIN (roles);
CREATE INDEX idx_project_areas_gin ON project USING GIN (areas);
CREATE INDEX idx_estimate_luminaires_gin ON estimate USING GIN (luminaires);
CREATE INDEX idx_estimate_reu_luminaires_gin ON estimate_reu USING GIN (luminaires);
