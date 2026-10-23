import type { AssetField } from '@/types/catalogue-import';

/**
 * Filename suffix per asset field.
 *
 * All three assets of a row share one UUID, so the product image keeps the bare
 * `<uuid>` and the two document fields are suffixed. Without this, a row whose
 * Specifications and Installation Instructions are both PDFs would write twice
 * to `<uuid>.pdf` and the second upload would silently clobber the first.
 */
export const FIELD_SUFFIX: Record<AssetField, string> = {
  productImage: '',
  specifications: '-spec',
  installationInstructions: '-install',
};

/**
 * Slugify a company name into a Storage-key-safe segment.
 * Supabase object keys reject most punctuation and all whitespace.
 */
export function slugify(input: string): string {
  return (input || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')  // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80) || 'unknown';
}

/**
 * Build the Storage object key within the `leds` bucket.
 * `ext` is expected to include the leading dot.
 */
export function buildObjectKey(
  companySlug: string,
  typeSlug: string,
  productId: string,
  field: AssetField,
  ext: string,
): string {
  const dotted = ext.startsWith('.') ? ext : `.${ext}`;
  return `${companySlug}/${typeSlug}/${productId}${FIELD_SUFFIX[field]}${dotted}`;
}

/** Filename for the output CSV. */
export function outputFilename(
  companySlug: string,
  typeSlug: string,
  date = new Date(),
): string {
  return `${companySlug}-${typeSlug}-${date.toISOString().slice(0, 10)}.csv`;
}

/** Filename for the failure report CSV. */
export function errorReportFilename(
  companySlug: string,
  typeSlug: string,
  date = new Date(),
): string {
  return `${companySlug}-${typeSlug}-errors-${date.toISOString().slice(0, 10)}.csv`;
}
