import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface StatusBadgeProps {
  status: string | number;
  variant?: 'estimate' | 'project' | 'company';
}

// ---------------------------------------------------------------------------
// Color maps per variant
// ---------------------------------------------------------------------------

const ESTIMATE_STAGE_COLORS: Record<string, string> = {
  created: 'bg-gray-200 text-gray-800',
  estimate: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  order: 'bg-purple-100 text-purple-800',
  shipping: 'bg-yellow-100 text-yellow-800',
  invoice: 'bg-orange-100 text-orange-800',
  receipt: 'bg-teal-100 text-teal-800',
  fulfilled: 'bg-green-100 text-green-800',
  archived: 'bg-stone-200 text-stone-800',
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  proposal: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
};

const COMPANY_STATUS_COLORS: Record<string, { label: string; className: string }> = {
  '0': { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  '1': { label: 'Approved', className: 'bg-green-100 text-green-800' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEstimateStyle(status: string) {
  return ESTIMATE_STAGE_COLORS[status] ?? 'bg-gray-200 text-gray-800';
}

function getProjectStyle(status: string) {
  return PROJECT_STATUS_COLORS[status] ?? 'bg-gray-200 text-gray-800';
}

function getCompanyInfo(status: string | number) {
  const key = String(status);
  return COMPANY_STATUS_COLORS[key] ?? { label: String(status), className: 'bg-gray-200 text-gray-800' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusBadge({ status, variant = 'estimate' }: StatusBadgeProps) {
  let colorClass: string;
  let label: string;

  switch (variant) {
    case 'estimate': {
      const s = String(status);
      colorClass = getEstimateStyle(s);
      label = s.charAt(0).toUpperCase() + s.slice(1);
      break;
    }
    case 'project': {
      const s = String(status);
      colorClass = getProjectStyle(s);
      label = s
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      break;
    }
    case 'company': {
      const info = getCompanyInfo(status);
      colorClass = info.className;
      label = info.label;
      break;
    }
    default: {
      colorClass = 'bg-gray-200 text-gray-800';
      label = String(status);
    }
  }

  return (
    <Badge
      variant="secondary"
      className={cn('border-transparent font-medium', colorClass)}
    >
      {label}
    </Badge>
  );
}
