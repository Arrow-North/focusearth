import type { AssetField, ImportConfig, LuminaireType } from '@/types/catalogue-import';

/** Storage bucket. Objects land at `<company-slug>/<type-slug>/<uuid><suffix>.<ext>`. */
export const LED_BUCKET = 'leds';

export const RESOLVE_FUNCTION = 'resolve-led-asset';

/** Sentinel values written into the output CSV. */
export const IMAGE_REPO = 'IMAGE_REPO';
export const FETCH_FAILED = 'FETCH_FAILED';

/** Output column headers appended after every original column, in this order. */
export const OUTPUT_COLUMNS = {
  productId: 'product_id',
  specifications: 'Specifications',
  installationInstructions: 'Installation Instructions',
  productImage: 'Product Image',
} as const;

/** Appended to the output headers when the "disambiguate" toggle is on. */
export const RESOLVED_SUFFIX = ' (Resolved)';

export const FIELD_LABELS: Record<AssetField, string> = {
  specifications: 'Specifications',
  installationInstructions: 'Installation Instructions',
  productImage: 'Product Image',
};

/**
 * Header aliases for auto-detecting the three link columns.
 * Matched after lowercasing and stripping all non-alphanumerics.
 */
export const HEADER_ALIASES: Record<AssetField, string[]> = {
  specifications: [
    'specifications', 'specification', 'spec', 'specs', 'specsheet',
    'specsheets', 'cutsheet', 'cutsheets', 'datasheet', 'datasheets',
    'speclink', 'specificationhyperlink', 'specificationslink',
  ],
  installationInstructions: [
    'installationinstructions', 'installinstructions', 'installation',
    'installationinstruction', 'installinstruction', 'installguide',
    'installationguide', 'instructions', 'ifu', 'installationlink',
  ],
  productImage: [
    'productimage', 'productimages', 'image', 'images', 'photo', 'photos',
    'picture', 'pictures', 'productphoto', 'productpicture', 'imagelink',
    'productimagehyperlink', 'imageurl',
  ],
};

/** Normalize a header for alias matching. */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  concurrency: 5,
  batchSize: 5,
  retryAttempts: 3,
  retryDelayMs: 1000,
};

export const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xlsm', '.xls'] as const;

/** 100 MB cap on the uploaded spreadsheet itself. */
export const MAX_INPUT_FILE_SIZE = 100 * 1024 * 1024;

/** Matches the `leds` bucket file_size_limit. */
export const MAX_ASSET_SIZE = 50 * 1024 * 1024;

/** Checkpoint key prefix for resuming an interrupted job. */
export const CHECKPOINT_KEY = 'catalogue-import:checkpoint';

/** Rows between localStorage checkpoints. */
export const CHECKPOINT_INTERVAL = 50;

export const LUMINAIRE_TYPE_SLUGS: Record<LuminaireType, string> = {
  'Fixtures': 'fixtures',
  'Lamps': 'lamps',
  'Power Supplies': 'power-supplies',
  'Controls': 'controls',
  'Accessories': 'accessories',
};

/**
 * Bridge to the existing catalogue taxonomy in `src/lib/catalogues.ts`,
 * which uses singular slugs for three of the five.
 */
export const LUMINAIRE_TYPE_TO_CATALOGUE_SLUG: Record<LuminaireType, string> = {
  'Fixtures': 'fixtures',
  'Lamps': 'lamp',
  'Power Supplies': 'power-supply',
  'Controls': 'control',
  'Accessories': 'accessories',
};
