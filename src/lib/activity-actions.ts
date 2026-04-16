import type { Activity } from "@/types/database";

interface ActivityActionButton {
  label: string;
  color: string;
  getRoute: (activity: Activity) => string | null;
}

const ACTIVITY_ACTION_BUTTONS: Record<number, ActivityActionButton> = {
  // View Project — project actions
  2:  { label: "View Project", color: "green", getRoute: (a) => a.project_id ? `/projects/${a.project_id}` : null },
  3:  { label: "View Project", color: "green", getRoute: (a) => a.project_id ? `/projects/${a.project_id}` : null },
  4:  { label: "View Project", color: "green", getRoute: (a) => a.project_id ? `/projects/${a.project_id}` : null },
  30: { label: "View Project", color: "green", getRoute: (a) => a.project_id ? `/projects/${a.project_id}` : null },

  // View Report — report actions (fallback to project)
  5:  { label: "View Report", color: "blue", getRoute: (a) => a.report_id ? `/reports/${a.report_id}` : a.project_id ? `/projects/${a.project_id}` : null },
  24: { label: "View Report", color: "blue", getRoute: (a) => a.report_id ? `/reports/${a.report_id}` : a.project_id ? `/projects/${a.project_id}` : null },

  // View Order — estimate actions
  6:  { label: "View Order", color: "purple", getRoute: (a) => a.estimate_id ? `/orders/suppliers/${a.estimate_id}` : a.estimate_reu_id ? `/orders/real-estate/${a.estimate_reu_id}` : null },
  7:  { label: "View Order", color: "purple", getRoute: (a) => a.estimate_id ? `/orders/suppliers/${a.estimate_id}` : a.estimate_reu_id ? `/orders/real-estate/${a.estimate_reu_id}` : null },
  8:  { label: "View Order", color: "purple", getRoute: (a) => a.estimate_id ? `/orders/suppliers/${a.estimate_id}` : a.estimate_reu_id ? `/orders/real-estate/${a.estimate_reu_id}` : null },
  9:  { label: "View Order", color: "purple", getRoute: (a) => a.estimate_id ? `/orders/suppliers/${a.estimate_id}` : a.estimate_reu_id ? `/orders/real-estate/${a.estimate_reu_id}` : null },
  10: { label: "View Order", color: "purple", getRoute: (a) => a.estimate_id ? `/orders/suppliers/${a.estimate_id}` : a.estimate_reu_id ? `/orders/real-estate/${a.estimate_reu_id}` : null },
  11: { label: "View Order", color: "purple", getRoute: (a) => a.estimate_id ? `/orders/suppliers/${a.estimate_id}` : a.estimate_reu_id ? `/orders/real-estate/${a.estimate_reu_id}` : null },
  12: { label: "View Order", color: "purple", getRoute: (a) => a.estimate_id ? `/orders/suppliers/${a.estimate_id}` : a.estimate_reu_id ? `/orders/real-estate/${a.estimate_reu_id}` : null },
  13: { label: "View Order", color: "purple", getRoute: (a) => a.estimate_id ? `/orders/suppliers/${a.estimate_id}` : a.estimate_reu_id ? `/orders/real-estate/${a.estimate_reu_id}` : null },
  31: { label: "View Order", color: "purple", getRoute: (a) => a.estimate_id ? `/orders/suppliers/${a.estimate_id}` : a.estimate_reu_id ? `/orders/real-estate/${a.estimate_reu_id}` : null },

  // View Company — company actions
  // Fallback chain: company_id → action_id (may be company id for legacy rows) → null
  14: { label: "View Company", color: "yellow", getRoute: (a) => a.company_id ? `/companies/${a.company_id}` : a.action_id ? `/companies/${a.action_id}` : null },
  15: { label: "View Company", color: "yellow", getRoute: (a) => a.company_id ? `/companies/${a.company_id}` : a.action_id ? `/companies/${a.action_id}` : null },
  16: { label: "View Company", color: "yellow", getRoute: (a) => a.company_id ? `/companies/${a.company_id}` : a.action_id ? `/companies/${a.action_id}` : null },
  32: { label: "View Company", color: "yellow", getRoute: (a) => a.company_id ? `/companies/${a.company_id}` : a.action_id ? `/companies/${a.action_id}` : null },

  // invite_accepted — company fallback to user
  18: { label: "View Company", color: "yellow", getRoute: (a) => a.company_id ? `/companies/${a.company_id}` : a.action_id ? `/companies/${a.action_id}` : a.user_id ? `/users/${a.user_id}` : null },

  // View Profile — user actions
  1:  { label: "View Profile", color: "yellow", getRoute: (a) => a.user_id ? `/users/${a.user_id}` : null },
  17: { label: "View Profile", color: "yellow", getRoute: (a) => a.user_id ? `/users/${a.user_id}` : null },
  19: { label: "View Profile", color: "yellow", getRoute: (a) => a.user_id ? `/users/${a.user_id}` : null },
  29: { label: "View Profile", color: "yellow", getRoute: (a) => a.user_id ? `/users/${a.user_id}` : null },
  33: { label: "View Profile", color: "yellow", getRoute: (a) => a.user_id ? `/users/${a.user_id}` : null },

  // View Product — product actions
  20: { label: "View Product", color: "teal", getRoute: (a) => a.product_id ? `/catalogues/all-products/${a.product_id}` : null },
  21: { label: "View Product", color: "teal", getRoute: (a) => a.product_id ? `/catalogues/all-products/${a.product_id}` : null },

  // product_deleted — link to catalogue list
  22: { label: "View Catalogue", color: "teal", getRoute: () => `/catalogues/all-products` },

  // file_uploaded, 25, 26 — project actions
  23: { label: "View Project", color: "green", getRoute: (a) => a.project_id ? `/projects/${a.project_id}` : null },
  25: { label: "View Project", color: "green", getRoute: (a) => a.project_id ? `/projects/${a.project_id}` : null },
  26: { label: "View Project", color: "green", getRoute: (a) => a.project_id ? `/projects/${a.project_id}` : null },

  // message_sent
  27: { label: "View Messages", color: "blue", getRoute: () => `/messages` },

  // contact_submitted
  28: { label: "View Profile", color: "yellow", getRoute: (a) => a.user_id ? `/users/${a.user_id}` : null },

  // unknown
  0:  { label: "View Profile", color: "yellow", getRoute: (a) => a.user_id ? `/users/${a.user_id}` : null },
};

const DEFAULT_BUTTON: ActivityActionButton = {
  label: "View Profile",
  color: "yellow",
  getRoute: (a) => a.user_id ? `/users/${a.user_id}` : null,
};

export function getActivityButton(activity: Activity): ActivityActionButton {
  return ACTIVITY_ACTION_BUTTONS[activity.action] ?? DEFAULT_BUTTON;
}
