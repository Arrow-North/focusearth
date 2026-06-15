import { ACTIVITY_ACTION_LABELS, NOTIFICATION_TYPE_LABELS } from '@/lib/constants';
import { getUserTypeColor as _getUserTypeColor, USER_TYPE_LABELS } from '@/lib/roles';
import type { UserType } from '@/types/database';

/**
 * Format a date string (ISO or similar) into a human-readable locale string.
 * Returns an empty string for falsy inputs.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a numeric amount as USD currency.
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Return a human-readable label for an activity action code.
 */
export function formatActivityAction(code: number): string {
  return ACTIVITY_ACTION_LABELS[code] ?? 'Unknown action';
}

/**
 * Return a human-readable label for a notification type/status code.
 */
export function formatNotificationType(status: number): string {
  return NOTIFICATION_TYPE_LABELS[status] ?? 'General';
}

/**
 * Build a human-readable summary of a luminaire's components
 * (fixture, lamp, power supply, control, accessory).
 */
export function buildLuminaireSummary(lum: {
  fixtureDescription?: string;
  lampPerFixture?: string;
  lampDescription?: string;
  powerSupplyDescription?: string;
  controlDescription?: string;
  accessoryDescriptionA?: string;
}): string {
  const parts: string[] = [];
  if (lum.fixtureDescription) parts.push(lum.fixtureDescription);
  if (lum.lampDescription) {
    parts.push(lum.lampPerFixture ? `(${lum.lampPerFixture}) ${lum.lampDescription}` : lum.lampDescription);
  }
  if (lum.powerSupplyDescription) parts.push(`powered by ${lum.powerSupplyDescription}`);
  if (lum.controlDescription) parts.push(`controlled by ${lum.controlDescription}`);
  if (lum.accessoryDescriptionA) parts.push(`with ${lum.accessoryDescriptionA}`);
  return parts.join(', ');
}

/**
 * Derive initials from first/last name.
 */
export function getInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  if (!first && !last) return '?';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/**
 * Re-export getUserTypeColor from roles.
 */
export function getUserTypeColor(type: UserType | null | undefined): string {
  return _getUserTypeColor(type);
}

/**
 * Return a user-friendly label for a UserType code.
 */
export function getUserTypeLabel(type: UserType | null | undefined): string {
  if (!type) return 'Unknown';
  return USER_TYPE_LABELS[type] ?? 'Unknown';
}
