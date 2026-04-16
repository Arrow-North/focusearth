import type { EstimateStage, CompanyType } from '@/types/database';

// ---------------------------------------------------------------------------
// Activity action codes
// ---------------------------------------------------------------------------

export const ACTIVITY_ACTIONS: Record<number, string> = {
  0: 'unknown',
  1: 'profile_updated',
  2: 'project_created',
  3: 'project_updated',
  4: 'project_status_changed',
  5: 'report_approved',
  6: 'estimate_created',
  7: 'estimate_approved',
  8: 'order_created',
  9: 'shipping_updated',
  10: 'invoice_marked',
  11: 'receipt_marked',
  12: 'fulfilled',
  13: 'archived',
  14: 'company_created',
  15: 'company_updated',
  16: 'company_approved',
  17: 'user_invited',
  18: 'invite_accepted',
  19: 'user_registered',
  20: 'product_created',
  21: 'product_updated',
  22: 'product_deleted',
  23: 'file_uploaded',
  24: 'report_created',
  25: 'bid_submitted',
  26: 'bid_accepted',
  27: 'message_sent',
  28: 'contact_submitted',
  29: 'password_changed',
  30: 'project_archived',
  31: 'estimate_shared',
  32: 'company_sync',
  33: 'user_deleted',
};

export const ACTIVITY_ACTION_LABELS: Record<number, string> = {
  0: 'Unknown action',
  1: 'Profile updated',
  2: 'Project created',
  3: 'Project updated',
  4: 'Project status changed',
  5: 'Report approved',
  6: 'Estimate created',
  7: 'Estimate approved',
  8: 'Order created',
  9: 'Shipping updated',
  10: 'Invoice marked',
  11: 'Receipt marked',
  12: 'Fulfilled',
  13: 'Archived',
  14: 'Company created',
  15: 'Company updated',
  16: 'Company approved',
  17: 'User invited',
  18: 'Invite accepted',
  19: 'User registered',
  20: 'Product created',
  21: 'Product updated',
  22: 'Product deleted',
  23: 'File uploaded',
  24: 'Report created',
  25: 'Bid submitted',
  26: 'Bid accepted',
  27: 'Message sent',
  28: 'Contact submitted',
  29: 'Password changed',
  30: 'Project archived',
  31: 'Estimate shared',
  32: 'Company sync',
  33: 'User deleted',
};

// ---------------------------------------------------------------------------
// Notification types
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPES: Record<number, string> = {
  0: 'general',
  1: 'project_created',
  2: 'project_updated',
  3: 'project_status_changed',
  4: 'report_created',
  5: 'report_approved',
  6: 'estimate_created',
  7: 'estimate_approved',
  8: 'order_created',
  9: 'shipping_updated',
  10: 'invoice_marked',
  11: 'receipt_marked',
  12: 'fulfilled',
  13: 'archived',
  14: 'company_created',
  15: 'company_approved',
  16: 'user_invited',
  17: 'invite_accepted',
  18: 'bid_submitted',
  19: 'bid_accepted',
  20: 'message_received',
  21: 'contact_submitted',
  22: 'file_uploaded',
  23: 'product_created',
  24: 'product_updated',
  25: 'estimate_shared',
};

export const NOTIFICATION_TYPE_LABELS: Record<number, string> = {
  0: 'General',
  1: 'Project created',
  2: 'Project updated',
  3: 'Project status changed',
  4: 'Report created',
  5: 'Report approved',
  6: 'Estimate created',
  7: 'Estimate approved',
  8: 'Order created',
  9: 'Shipping updated',
  10: 'Invoice marked',
  11: 'Receipt marked',
  12: 'Fulfilled',
  13: 'Archived',
  14: 'Company created',
  15: 'Company approved',
  16: 'User invited',
  17: 'Invite accepted',
  18: 'Bid submitted',
  19: 'Bid accepted',
  20: 'Message received',
  21: 'Contact submitted',
  22: 'File uploaded',
  23: 'Product created',
  24: 'Product updated',
  25: 'Estimate shared',
};

// ---------------------------------------------------------------------------
// Estimate stages
// ---------------------------------------------------------------------------

export const ESTIMATE_STAGES: EstimateStage[] = [
  'created',
  'estimate',
  'approved',
  'order',
  'shipping',
  'invoice',
  'receipt',
  'fulfilled',
  'archived',
];

// ---------------------------------------------------------------------------
// Company subtypes by role (re-exported from roles for convenience)
// ---------------------------------------------------------------------------

export { COMPANY_SUBTYPES } from '@/lib/roles';

export const COMPANY_SUBTYPES_BY_TYPE: Record<CompanyType, string[]> = {
  REU: [
    'Property Management',
    'Commercial Real Estate',
    'Industrial Real Estate',
    'Retail Real Estate',
    'Hospitality',
    'Healthcare',
  ],
  SU: [
    'LED Manufacturer',
    'Lighting Distributor',
    'Controls Manufacturer',
    'General Supplier',
  ],
  EU: [
    'Licensed Electrician',
    'Electrical Contractor',
    'Energy Auditor',
  ],
};

// ---------------------------------------------------------------------------
// Property types
// ---------------------------------------------------------------------------

export const PROPERTY_TYPES: string[] = [
  'Office',
  'Industrial',
  'Retail',
  'Multi Family',
  'Hospitality',
  'Parking',
  'Horticulture',
  'Healthcare',
  'Data Center',
  'Other',
];

// ---------------------------------------------------------------------------
// Color map – maps semantic color names to Tailwind bg-status-* classes
// ---------------------------------------------------------------------------

export const colorMap: Record<string, string> = {
  gray: 'bg-status-gray',
  blue: 'bg-status-blue',
  green: 'bg-status-green',
  purple: 'bg-status-purple',
  yellow: 'bg-status-yellow',
  orange: 'bg-status-orange',
  teal: 'bg-status-teal',
  brown: 'bg-status-brown',
  red: 'bg-status-red',
  pink: 'bg-status-pink',
};
