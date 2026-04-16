import type { ImportConfig } from '@/types/led-import';

/**
 * Column indices for extracting data from XLSM sheets (0-indexed)
 */
export const COLUMN_INDICES = {
  ORDER_CODE: 1,         // Column B
  SPECIFICATIONS: 39,    // Column AN
  PRODUCT_IMAGE: 41,     // Column AP
} as const;

/**
 * Sheets to skip when parsing the XLSM file
 */
export const SHEETS_TO_SKIP = ['Introduction', 'Validations'] as const;

/**
 * Storage bucket name for LED images
 */
export const LED_BUCKET = 'leds';

/**
 * Sheet name to folder name mapping
 */
export const SHEET_TO_FOLDER: Record<string, string> = {
  'Fixtures': 'Fixtures',
  'Lamps': 'Lamps',
  'Power Supplies': 'Power Supplies',
  'Controls': 'Controls',
  'Accessories': 'Accessories',
};

/**
 * Default import configuration
 */
export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  concurrency: 5,
  batchDelay: 100,
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * Allowed file types for upload
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;

/**
 * Maximum file size (50 MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * File extension to MIME type mapping
 */
export const EXTENSION_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

/**
 * Get file extension from URL or default to .jpg
 */
export function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.[a-zA-Z0-9]+$/);
    if (match) {
      return match[0].toLowerCase();
    }
  } catch {
    // Invalid URL
  }
  return '.jpg';
}
