// TypeScript types derived from Supabase migrations

export type UserType = 'SUPERADMIN' | 'Sa' | 'Au' | 'Reu' | 'Su' | 'Eu' | 'Gu';
export type CompanyType = 'REU' | 'SU' | 'EU';

// --- Table Row Types ---

export interface Profile {
  id: string; // UUID
  legacy_id: number;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string;
  phone: string;
  type: UserType;
  roles: Record<string, unknown> | null;
  profile_features: Record<string, unknown> | null;
  primary_interests: Record<string, unknown> | null;
  communication_preferences: Record<string, unknown> | null;
  enabled: boolean;
  confirm_token: string | null;
  title: string | null;
  avatar: string | null;
  hear_from_us: string | null;
  old_password: string | null;
  uuid: string | null;
  invited_to_company: boolean;
  company_to_sync: string | null;
  record_id: string | null;
  record_id_from_projects_users: string | null;
  is_deleted: boolean;
  associated_to_company_id: number | null;
  last_password_reset_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: number;
  owner_id: string | null;
  admin_user_id: string | null;
  name: string;
  notes: string | null;
  address: string;
  address2: string | null;
  image: string | null;
  property_priorities: PropertyPriority[];
  service_areas: ServiceArea[];
  seen: boolean;
  state: string;
  status: number;
  type: string;
  website: string;
  zip_code: string;
  country: string;
  city: string;
  is_deleted: boolean | null;
  record_id: string | null;
  company_sub_type: string | null;
}

export interface PropertyPriority {
  name: string;
  percentage: number;
  color?: string;
}

export interface ServiceArea {
  state?: string;
  city?: string;
}

export interface CompanyUpdateLog {
  id: number;
  company_id: number | null;
  updated_by_id: string | null;
  updated_date: string;
  update_log: string;
  seen: boolean;
}

export interface Project {
  id: number;
  company_id: number | null;
  user_id: string | null;
  address: string | null;
  address2: string | null;
  areas: ProjectArea[] | null;
  complience_hyperlink: string | null;
  sales_tax: string | null;
  cost_per_kilowatt_hour: string | null;
  image: string | null;
  notes: Record<string, unknown> | null;
  property_priorities: Record<string, unknown> | null;
  property_size: string | null;
  property_type: string | null;
  request_light_count: boolean | null;
  state: string | null;
  status: string | null;
  title: string | null;
  zip_code: number | null;
  be_financing: string | null;
  city: string | null;
  deposit_amount: number | null;
  interest_rate: string | null;
  labor_cost: string | null;
  light_count: string | null;
  light_count_estimate: string | null;
  loan_period: number | null;
  operation_days_per_year: number | null;
  files: Record<string, unknown> | null;
  proposals: Record<string, unknown> | null;
  bidding: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  priority_admin: boolean;
  archived: boolean;
  hidden: boolean;
  status_admin: string;
  airtable_id: string | null;
}

export interface ProjectArea {
  name: string;
  title?: string;
  luminaires: Luminaire[];
  [key: string]: unknown;
}

export interface Luminaire {
  name?: string;
  quantity?: number;
  wattage?: string;

  // Updated Interface
  id?: string;
  qty?: string;
  ledType?: boolean;
  areaName?: string;
  illuminationReport?: string | null;

  // Fixture
  fixtureApplication?: string;
  fixtureDepth?: string;
  fixtureDescription?: string;
  fixtureDiameter?: string;
  fixtureExisting?: Record<string, unknown> | null;
  fixtureLength?: string;
  fixtureMount?: string;
  fixtureMountHeight?: string;
  fixtureLens?: string;
  fixturePricePerUnit?: string;
  fixtureStyle?: string;
  fixtureWidth?: string;

  // Lamp
  lampBaseCategory?: string;
  lampBaseCategoryType?: string;
  lampCategory?: string;
  lampCategoryType?: string;
  lampColorTemperature?: string;
  lampDescription?: string;
  lampExisting?: Record<string, unknown> | null;
  lampLensType?: string;
  lampPerFixture?: string;
  lampPricePerUnit?: string;
  lampProductCode?: string;
  lampWattage?: string;

  // Power supply
  powerPricePerUnit?: string;
  powerQTYFixture?: string;
  powerSupplyDescription?: string;
  powerSupplyExisting?: Record<string, unknown> | null;
  powerSupplyManufacturer?: string;
  powerSupplyModel?: string;
  powerSupplyProductCode?: string;
  powerSupplyType?: string;

  // Control
  controlDimming?: string;
  controlDescription?: string;
  controlExisting?: Record<string, unknown> | null;
  controlManufacturer?: string;
  controlModel?: string;
  controlPricePerUnit?: string;
  controlQTYFixture?: string;
  controlRecordId?: string;
  controlType?: string;

  // Accessory A
  accessoryColorA?: string;
  accessoryDepthA?: string;
  accessoryDescriptionA?: string;
  accessoryDescriptionAQty?: string;
  accessoryDiameterA?: string;
  accessoryExisting?: Record<string, unknown> | null;
  accessoryLengthA?: string;
  accessoryManufacturerA?: string;
  accessoryPricePerUnitA?: string;
  accessoryProductCodeA?: string;
  accessoryRecordId?: string;
  accessoryTypeA?: string;
  accessoryWidthA?: string;

  // Accessory B
  accessoryColorB?: string;
  accessoryDepthB?: string;
  accessoryDescriptionB?: string;
  accessoryDescriptionBQty?: string;
  accessoryDiameterB?: string;
  accessoryLengthB?: string;
  accessoryManufacturerB?: string;
  accessoryPricePerUnitB?: string;
  accessoryProductCodeB?: string;
  accessoryTypeB?: string;
  accessoryWidthB?: string;

  // Accessory C
  accessoryColorC?: string;
  accessoryDepthC?: string;
  accessoryDescriptionC?: string;
  accessoryDescriptionCQty?: string;
  accessoryDiameterC?: string;
  accessoryLengthC?: string;
  accessoryManufacturerC?: string;
  accessoryPricePerUnitC?: string;
  accessoryProductCodeC?: string;
  accessoryTypeC?: string;
  accessoryWidthC?: string;

  [key: string]: unknown;
}

export interface Report {
  id: number;
  project_id: number | null;
  created_by_id: string | null;
  status: string;
  notes: string | null;
  sort_id: number | null;
  proposal: Record<string, unknown>;
  proposal_name: string;
  system_price: string | null;
  led_price: string | null;
  cost_year: string | null;
  added_cri: string | null;
  added_lumens: string | null;
  payback: string | null;
  bidding: boolean;
  etadays: string | null;
  installation: Record<string, unknown> | null;
  custom_pricing: Record<string, unknown> | null;
  availability: string | null;
  light_count_waiver: string | null;
  rebates: string | null;
  shipping: string | null;
  color_tunable: string | null;
  tax: string | null;
  sensors: string | null;
  kwreduced: string | null;
  created_at: string;
  approved: boolean;
  active: boolean;
  lumen_increase_sq_ft: string | null;
  lumen_increase_fixture: string | null;
}

export interface EstimateSU {
  id: number;
  report_id: number | null;
  user_reu_id: string | null;
  fulfilled_by_user_estimate_su_id: string | null;
  fulfilled_by_user_order_su_id: string | null;
  fulfilled_by_user_shipping_su_id: string | null;
  fulfilled_by_user_invoice_su_id: string | null;
  fulfilled_by_user_receipt_su_id: string | null;
  archived_by_user_estimate_su_id: string | null;
  user_su_id: string | null;
  user_admin_consultant_id: string | null;
  company_id: number | null;
  estimate_reu_id: number | null;
  order_uid: string | null;
  reference: string | null;
  created_at: string | null;
  order_date_created: string | null;
  order_date_updated: string | null;
  updated_at: string | null;
  su_signature: string | null;
  admin_signature: string | null;
  sales_tax: string | null;
  rebates: string | null;
  shipping: string | null;
  su_approved: boolean | null;
  su_signature_date: string | null;
  admin_signature_date: string | null;
  su_notes: string | null;
  deposit_amount: string | null;
  deposit_due: string | null;
  remainder_due: string | null;
  remainder_amount: string | null;
  is_order: boolean | null;
  is_estimate: boolean | null;
  is_shipping: boolean | null;
  shipping_status: string | null;
  luminaires: Luminaire[] | null;
  shipping_date_created: string | null;
  shipping_date_updated: string | null;
  is_invoice: boolean | null;
  invoice_date_created: string | null;
  invoice_date_updated: string | null;
  is_receipt: boolean | null;
  receipt_date_created: string | null;
  receipt_date_updated: string | null;
  marked_fulfilled: boolean | null;
  archived: boolean | null;
  archived_date_created: string | null;
  archived_date_updated: string | null;
  marked_fulfilled_date_created: string | null;
  marked_fulfilled_date_updated: string | null;
}

export interface EstimateREU {
  id: number;
  fulfilled_by_user_estimate_reu_id: string | null;
  fulfilled_by_user_order_reu_id: string | null;
  fulfilled_by_user_shipping_reu_id: string | null;
  fulfilled_by_user_invoice_reu_id: string | null;
  archived_by_user_estimate_reu_id: string | null;
  fulfilled_by_user_receipt_reu_id: string | null;
  user_reu_id: string | null;
  company_id: number | null;
  report_id: number | null;
  user_admin_consultant_id: string | null;
  order_uid: string | null;
  reference: string | null;
  reu_signature: string | null;
  reu_signature_date: string | null;
  admin_signature_date: string | null;
  admin_signature: string | null;
  sales_tax: string | null;
  rebates: string | null;
  shipping: string | null;
  reu_approved: boolean | null;
  reu_notes: string | null;
  deposit_amount: string | null;
  deposit_due: string | null;
  remainder_due: string | null;
  remainder_amount: string | null;
  is_order: boolean | null;
  is_estimate: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  order_date_created: string | null;
  order_date_updated: string | null;
  is_shipping: boolean | null;
  shipping_status: string | null;
  shipping_date_created: string | null;
  shipping_date_updated: string | null;
  is_invoice: boolean | null;
  invoice_date_created: string | null;
  invoice_date_updated: string | null;
  is_receipt: boolean | null;
  receipt_date_created: string | null;
  receipt_date_updated: string | null;
  deposit_paid_date: string | null;
  remainder_due_date: string | null;
  marked_fulfilled: boolean | null;
  archived: boolean | null;
  archived_date_created: string | null;
  archived_date_updated: string | null;
  marked_fulfilled_date_created: string | null;
  marked_fulfilled_date_updated: string | null;
  luminaires: Luminaire[] | null;
}

// --- Estimate Detail (enriched API response) ---

export interface EstimateDetailCompany {
  id: number;
  name: string;
  notes: string | null;
  address: string | null;
  address2: string | null;
  image: string | null;
  state: string | null;
  status: number | null;
  type: string | null;
  website: string | null;
  zipCode: string | null;
  country: string | null;
  city: string | null;
  isDeleted: boolean;
  recordId: string | null;
  companySubType: string | null;
  propertyPriorities: string[];
  serviceAreas: string[];
}

export interface EstimateDetailUser {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  type: string;
  title: string | null;
  avatar: string | null;
  phone: string | null;
  enabled: boolean;
  isDeleted: boolean;
  recordId: string | null;
  associatedToCompany: EstimateDetailCompany | null;
  company?: any[];
}

export interface EstimateDetailProject {
  id: number;
  title: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zipCode: number | null;
  status: string | null;
  statusAdmin: string | null;
  image: string | null;
  propertyType: string | null;
  propertySize: string | null;
  propertyPriorities: string[];
  salesTax: string | null;
  costPerKilowattHour: string | null;
  operationDaysPerYear: number | null;
  beFinancing: string | null;
  depositAmount: number | null;
  interestRate: string | null;
  laborCost: string | null;
  lightCount: string | null;
  lightCountEstimate: string | null;
  loanPeriod: number | null;
  notes: string | null;
  areas: Record<string, unknown>[];
  files: unknown | null;
  proposals: unknown | null;
  bidding: boolean;
  requestLightCount: boolean;
  priorityAdmin: boolean;
  archived: boolean;
  complienceHyperlink: string | null;
  airtableId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EstimateDetailReport {
  id: number;
  status: string;
  notes: string | null;
  sortId: number | null;
  proposal: Record<string, unknown>[];
  illumination: unknown[];
  proposalName: string;
  systemPrice: string | null;
  ledPrice: string | null;
  costYear: string | null;
  addedCRI: string | null;
  addedLumens: string | null;
  payback: string | null;
  bidding: boolean;
  ETAdays: string | null;
  installation: string | null;
  customPricing: Record<string, boolean> | null;
  availability: string | null;
  lightCountWaiver: string | null;
  rebates: string | null;
  shipping: string | null;
  colorTunable: string | null;
  lumenIncreaseSqFt: string | null;
  lumenIncreaseFixture: string | null;
  tax: string | null;
  sensors: string | null;
  KWReduced: string | null;
  createdAt: string | null;
  approved: boolean;
  active: boolean;
  project: EstimateDetailProject | null;
}

export interface EstimateDetail {
  id: number;
  orderUid: string | null;
  reference: string | null;
  createdAt: string | null;
  orderDateCreated: string | null;
  orderDateUpdated: string | null;
  updatedAt: string | null;
  suSignature: string | null;
  adminSignature: string | null;
  salesTax: string | null;
  rebates: string | null;
  shipping: string | null;
  suApproved: boolean;
  suSignatureDate: string | null;
  adminSignatureDate: string | null;
  suNotes: string | null;
  depositAmount: string | null;
  depositDue: string | null;
  remainderDue: string | null;
  remainderAmount: string | null;
  isOrder: boolean;
  isEstimate: boolean;
  isShipping: boolean;
  shippingStatus: string | null;
  luminaires: Record<string, unknown>[];
  shippingDateCreated: string | null;
  shippingDateUpdated: string | null;
  isInvoice: boolean;
  invoiceDateCreated: string | null;
  invoiceDateUpdated: string | null;
  isReceipt: boolean;
  receiptDateCreated: string | null;
  receiptDateUpdated: string | null;
  markedFulfilled: boolean;
  archived: boolean;
  archivedDateCreated: string | null;
  archivedDateUpdated: string | null;
  markedFulfilledDateCreated: string | null;
  markedFulfilledDateUpdated: string | null;
  report: EstimateDetailReport | null;
  userReu: EstimateDetailUser | null;
  userSu: EstimateDetailUser | null;
  userAdminConsultant: EstimateDetailUser | null;
  invoiceFiles: unknown[];
  receiptFiles: unknown[];
  shippingDetails: unknown[];
  fulfilledByUserEstimateSu: EstimateDetailUser | null;
  fulfilledByUserOrderSu: EstimateDetailUser | null;
  fulfilledByUserShippingSu: EstimateDetailUser | null;
  fulfilledByUserInvoiceSu: EstimateDetailUser | null;
  fulfilledByUserReceiptSu: EstimateDetailUser | null;
  archivedByUserEstimateSu: EstimateDetailUser | null;
}

export interface EstimateEU {
  id: number;
  user_id: string | null;
  project_id: number | null;
  estimate_reu_id: number | null;
  order_uid: string | null;
  reference: string | null;
  created_at: string | null;
  updated_at: string | null;
  company_id: number | null;
}

export interface ShippingDetail {
  id: number;
  estimate_su_id: number | null;
  sender_company_name: string | null;
  sender_tracking_link: string | null;
  sender_country: string | null;
  sender_address1: string | null;
  sender_address2: string | null;
  sender_city: string | null;
  sender_state: string | null;
  sender_zip_code: string | null;
  sender_phone: string | null;
  receiver_company_name: string | null;
  receiver_name: string | null;
  receiver_country: string | null;
  receiver_address1: string | null;
  receiver_address2: string | null;
  receiver_city: string | null;
  receiver_state: string | null;
  receiver_zip_code: string | null;
  receiver_phone: string | null;
  status: number;
  shipping_reference: string;
  luminaires: Luminaire[] | null;
  created_at: string | null;
  updated_at: string | null;
  notes: string | null;
}

export interface ProductDetails {
  // ── General ─────────────────────────────────────────────
  description?: string;
  isCustomPrice?: boolean;
  baseCategory?: string;
  color?: string;
  supplier?: string;
  productType?: string;
  type?: string;
  manufacturer?: string;
  orderCode?: string;
  wattage?: string;
  areaName?: string;
  qty?: string;
  ledType?: boolean;
  airtableId?: string;
  illuminationReport?: string | null;

  // ── Fixture ─────────────────────────────────────────────
  fixtureMount?: string;
  fixtureStyle?: string;
  fixtureApplication?: string;
  fixtureDescription?: string;
  fixtureMountHeight?: string;
  fixtureLength?: string;
  fixtureWidth?: string;
  fixtureDepth?: string;
  fixtureDiameter?: string;
  fixtureLens?: string;
  fixturePricePerUnit?: string;

  // ── Lamp ────────────────────────────────────────────────
  lampCategory?: string;
  lampCategoryType?: string;
  lampWattage?: string;
  lampLensType?: string;
  lampPerFixture?: string;
  lampColorTemperature?: string;
  lampBaseCategory?: string;
  lampBaseCategoryType?: string;
  lampDescription?: string;
  lampProductCode?: string;
  lampPricePerUnit?: string;

  // ── Control ─────────────────────────────────────────────
  controlType?: string;
  controlModel?: string;
  controlDimming?: string;
  controlQTYFixture?: string;
  controlManufacturer?: string;
  controlPricePerUnit?: string;
  controlDescription?: string;
  controlRecordId?: string;

  // ── Power Supply ─────────────────────────────────────────
  powerSupplyType?: string;
  powerSupplyModel?: string;
  powerQTYFixture?: string;
  powerSupplyManufacturer?: string;
  powerPricePerUnit?: string;
  powerSupplyDescription?: string;
  powerSupplyProductCode?: string;

  // ── Accessories (slots A / B / C) ────────────────────────
  accessoryRecordId?: string;
  accessoryTypeA?: string;
  accessoryColorA?: string;
  accessoryLengthA?: string;
  accessoryWidthA?: string;
  accessoryDepthA?: string;
  accessoryDiameterA?: string;
  accessoryManufacturerA?: string;
  accessoryPricePerUnitA?: string;
  accessoryDescriptionA?: string;
  accessoryProductCodeA?: string;
  accessoryDescriptionAQty?: string;
  accessoryTypeB?: string;
  accessoryColorB?: string;
  accessoryLengthB?: string;
  accessoryWidthB?: string;
  accessoryDepthB?: string;
  accessoryDiameterB?: string;
  accessoryManufacturerB?: string;
  accessoryPricePerUnitB?: string;
  accessoryDescriptionB?: string;
  accessoryProductCodeB?: string;
  accessoryDescriptionBQty?: string;
  accessoryTypeC?: string;
  accessoryColorC?: string;
  accessoryLengthC?: string;
  accessoryWidthC?: string;
  accessoryDepthC?: string;
  accessoryDiameterC?: string;
  accessoryManufacturerC?: string;
  accessoryPricePerUnitC?: string;
  accessoryDescriptionC?: string;
  accessoryProductCodeC?: string;
  accessoryDescriptionCQty?: string;

  // ── Fixture (canonical names) ────────────────────────────
  fixtureShape?: string;
  fixtureWarranty?: string;
  image?: string;
  lampType?: string;
  baseType?: string;

  // ── Dimensions (canonical names) ─────────────────────────
  dimensionsLength?: string;
  dimensionsWidth?: string;
  dimensionsDiameter?: string;
  dimensionsDepth?: string;

  // ── LED Replacement Specs ────────────────────────────────
  lumens?: string;
  cct?: string | string[];
  cri?: string;
  beamAngle?: string;
  optics?: string;
  thd?: string;
  vMin?: string;
  vMax?: string;
  pricePerUnit?: string;
  lifetime?: string;
  dimmability?: string;
  colorTunable?: string;
  powerFactor?: string;
  cBCP?: string;
  application?: string;
  lensType?: string;
  ingressProtection?: string;
  fixtureColor?: string;
  trim?: string;
  certifications?: string | string[];
  buyAmerica?: string;
  installationTime?: string;
  approxDeliveryDays?: string;
  volumeTier1MinQty?: string;
  volumeTier1PPU?: string;
  volumeTier2MinQty?: string;
  volumeTier2PPU?: string;

  // ── Additional (canonical names) ─────────────────────────
  supplierProductDescription?: string;
  productSpecificationsHyperlink?: string;
  installationInstructionsHyperlink?: string;
  productImageHyperlink?: string;
  compatibleProductOrderCodes?: string | string[];
  notes?: string;

  // ── Legacy aliases (kept for backwards compatibility) ────
  style?: string;
  mount?: string;
  shape?: string;
  length?: string;
  width?: string;
  diameter?: string;
  depth?: string;
  warranty?: string;
  l70Lifetime?: string;
  voltageMin?: string;
  voltageMax?: string;
  cbcp?: string;
  deliveryDays?: string;
  volumeTier1Qty?: string;
  volumeTier2Qty?: string;
  supplierDescription?: string;
  productSpecifications?: string;
  installationInstructions?: string;
  productImage?: string;
  compatibleOrderCodes?: string;
  iesFile?: string;
  compatibleBallastCodes?: string;
  lampsPowered?: string;
}

export type ProductCategory = 'fixtures' | 'lamp' | 'control' | 'power-supply' | 'accessories';

export interface Product {
  id: number;
  user_id: string | null;
  company_id: number | null;
  project_id: number | null;
  report_id: number | null;
  estimate_su_id: number | null;
  airtable_record: string;
  airtable_base: string | null;
  airtable_colum_name: string;
  details: ProductDetails;
  is_existing: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Activity {
  id: number;
  estimate_id: number | null;
  project_id: number | null;
  user_id: string | null;
  estimate_reu_id: number | null;
  project_update_log_id: number | null;
  product_id: number | null;
  company_id: number | null;
  report_id: number | null;
  user_name: string;
  sender_name: string | null;
  u_id: string | null;
  user_type: string;
  action: number;
  action_id: number;
  project_title: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Notification {
  id: number;
  receiver_id: string | null;
  contact_id: number | null;
  user_id: string | null;
  company_id: number | null;
  project_id: number | null;
  report_id: number | null;
  estimate_id: number | null;
  estimate_reu_id: number | null;
  sender_name: string | null;
  disabled: boolean | null;
  seen: boolean;
  description: string;
  status: number | null;
  address: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Message {
  id: number;
  sender_id: string | null;
  receiver_id: string | null;
  activity_id: number | null;
  contact_id: number | null;
  company_id: number | null;
  notification_id: number | null;
  message: string;
  created_at: string;
}

export interface ContactSubmission {
  id: number;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  company_id: number | null;
  company_name: string | null;
  submitter_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  submitter: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    type: UserType;
  } | null;
  assignee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

export interface Upload {
  id: number;
  user_id: string | null;
  files: string;
  name: string;
  file_type: number | null;
  sort_id: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GeoState {
  id: number;
  name: string;
  abbreviation: string;
}

export interface GeoCity {
  id: number;
  state_id: number;
  name: string;
}

export interface UserCatalogueCounts {
  id: number;
  user_id: string;
  fixture: number;
  lamp: number;
  control: number;
  power_supply: number;
  accessory: number;
  companies: number | null;
  updated_at: string;
}

export interface UserPlatformUsage {
  id: number;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  total: number;
}

// --- RPC Return Types ---

export interface PaginatedResult<T = Record<string, unknown>> {
  rows: T[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface UserWithCompany extends Profile {
  company?: {
    id: number;
    name: string;
    type: string;
  } | null;
}

export interface OrderPath {
  is_estimate: boolean;
  su_approved?: boolean;
  reu_approved?: boolean;
  admin_signed: boolean;
  is_order: boolean;
  is_shipping: boolean;
  is_invoice: boolean;
  is_receipt: boolean;
  marked_fulfilled: boolean;
  archived: boolean;
  current_stage: EstimateStage;
}

export type EstimateStage =
  | 'created'
  | 'estimate'
  | 'approved'
  | 'order'
  | 'shipping'
  | 'invoice'
  | 'receipt'
  | 'fulfilled'
  | 'archived';

export type EstimateTableType = 'estimate' | 'estimate_reu';

export interface ReportWithDetails {
  report: Report;
  products: Product[];
  created_by: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

// --- Supabase Database type (minimal for client typing) ---

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile };
      company: { Row: Company };
      company_update_log: { Row: CompanyUpdateLog };
      project: { Row: Project };
      report: { Row: Report };
      estimate: { Row: EstimateSU };
      estimate_reu: { Row: EstimateREU };
      estimate_eu: { Row: EstimateEU };
      shipping_detail: { Row: ShippingDetail };
      product: { Row: Product };
      activity: { Row: Activity };
      notification: { Row: Notification };
      messages: { Row: Message };
      uploads: { Row: Upload };
      state: { Row: GeoState };
      city: { Row: GeoCity };
      user_catalogue_counts: { Row: UserCatalogueCounts };
      user_platform_usage: { Row: UserPlatformUsage };
    };
    Functions: Record<string, unknown>;
    Enums: {
      user_type_enum: UserType;
      company_type_enum: CompanyType;
    };
  };
}
