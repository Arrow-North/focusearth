import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Map well-known Supabase / PostgreSQL error codes to user-friendly messages.
 */
const ERROR_CODE_MAP: Record<string, string> = {
  '23505': 'Already exists',
  '23503': 'Referenced record not found',
  '23502': 'Required field missing',
  '23514': 'Value out of allowed range',
  '42501': 'Permission denied',
  '42P01': 'Resource not found',
  PGRST116: 'Not found',
  PGRST301: 'Request timeout',
  PGRST204: 'No content',
};

/**
 * Convert a Supabase PostgrestError or generic Error into a concise,
 * user-friendly string suitable for toast messages / UI display.
 */
export function handleSupabaseError(error: PostgrestError | Error | unknown): string {
  if (!error) return 'An unknown error occurred';

  // PostgrestError has a `code` property
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const pgError = error as PostgrestError;
    const code = pgError.code;
    if (code && ERROR_CODE_MAP[code]) {
      return ERROR_CODE_MAP[code];
    }
    if (pgError.message) {
      return pgError.message;
    }
  }

  // Standard Error
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback for string errors or unknown shapes
  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}
