export interface OverviewUserSummary {
  user_type: string;
  qty: number;
  ep_usage_hours: number;
}

export interface OverviewCompanyActivity {
  company_id: number;
  company_name: string;
  company_type: string;
  user_count: number;
  activity_count: number;
}

export interface RealEstateStat {
  property_type: string | null;
  property_size: string | null;
  project_status: string | null;
  project_id: number;
  estimate_reu_id: number | null;
  reu_is_order: boolean | null;
  reu_fulfilled: boolean | null;
  reu_luminaires: number | null;
  reu_created_at: string | null;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  user_type: string | null;
}

export interface SupplierStat {
  product_id: number;
  product_category: string | null;
  product_type: string | null;
  price_per_unit: string | null;
  company_id: number | null;
  estimate_su_id: number | null;
  su_is_order: boolean | null;
  su_fulfilled: boolean | null;
  su_luminaires: number | null;
  estimate_created_at: string | null;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  user_type: string | null;
  company_name: string | null;
}

export interface ElectricianStat {
  estimate_eu_id: number;
  project_id: number | null;
  company_id: number | null;
  user_id: string | null;
  bid_total: number | null;
  bid_status: string | null;
  labor: number | null;
  materials: number | null;
  project_title: string | null;
  project_state: string | null;
  property_size: string | null;
  first_name: string | null;
  last_name: string | null;
  user_type: string | null;
  company_name: string | null;
  service_areas: unknown[] | null;
}

export interface SalesStat {
  project_id: number;
  property_size: string | null;
  project_status: string | null;
  project_title: string | null;
  report_id: number | null;
  system_price: number | null;
  led_price: number | null;
  report_approved: boolean | null;
  estimate_su_id: number | null;
  su_is_order: boolean | null;
  estimate_reu_id: number | null;
  reu_is_order: boolean | null;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  user_type: string | null;
}

export interface AdminStat {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  user_type: string;
  companies_managed: number;
  active_orders: number;
  products_managed: number;
  messages_sent: number;
  activity_count: number;
}
