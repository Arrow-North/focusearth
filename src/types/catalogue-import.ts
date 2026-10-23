/**
 * Catalogue Import (company + luminaire type -> resolved asset CSV)
 *
 * Shared contract for: the parser, the link classifier, the `resolve-led-asset`
 * edge function, the orchestration hook, and the UI.
 */

// ─── Domain ─────────────────────────────────────────────────────────────────

export const LUMINAIRE_TYPES = [
  'Fixtures',
  'Lamps',
  'Power Supplies',
  'Controls',
  'Accessories',
] as const;

export type LuminaireType = (typeof LUMINAIRE_TYPES)[number];

/** The three hyperlink columns we resolve. */
export type AssetField =
  | 'specifications'
  | 'installationInstructions'
  | 'productImage';

export const ASSET_FIELDS: AssetField[] = [
  'specifications',
  'installationInstructions',
  'productImage',
];

// ─── Link classification ────────────────────────────────────────────────────

/**
 * IMAGE      - a specific image; fetch and mirror to Storage
 * FILE       - a specific non-image file (usually a PDF spec sheet); also mirrored
 * IMAGE_REPO - a folder / gallery / archive of many images; recorded, never fetched
 * UNKNOWN    - could not be decided; recorded as a failure, never silently dropped
 */
export type LinkClass = 'IMAGE' | 'FILE' | 'IMAGE_REPO' | 'UNKNOWN';

/** Which layer of the classifier reached the verdict. */
export type ClassifiedVia = 'host' | 'extension' | 'probe' | 'none';

export interface Classification {
  kind: LinkClass;
  /** The URL to actually fetch; hosts like Dropbox need a rewrite to serve bytes. */
  fetchUrl: string;
  via: ClassifiedVia;
  /** Human-readable justification, surfaced in the preview and error report. */
  reason: string;
}

// ─── Parsing ────────────────────────────────────────────────────────────────

export interface ParsedTable {
  /** All sheet names in the workbook; `['Sheet1']` for a CSV. */
  sheetNames: string[];
  /** The sheet these rows came from; null for CSV. */
  sheetName: string | null;
  headers: string[];
  /** Row-major, always `headers.length` wide, '' for blanks. Never sparse. */
  rows: string[][];
  /** `${rowIndex},${colIndex}` (0-based, rowIndex relative to `rows`) -> hyperlink target. */
  hyperlinks: Map<string, string>;
  /** 0-based index of the header row within the raw sheet. */
  headerRowIndex: number;
  /**
   * 1-based original sheet row number for each entry in `rows`, parallel to it.
   * Blank rows are dropped during parsing, so this is NOT
   * `headerRowIndex + 2 + i` — the error report relies on these being the real
   * line numbers a human can find in the source file.
   */
  sourceRowNumbers: number[];
  totalRows: number;
}

export interface SheetSummary {
  name: string;
  rowCount: number;
}

/** header index chosen for each asset field; null = not present in this file. */
export type ColumnMapping = Record<AssetField, number | null>;

// ─── Edge function wire format ──────────────────────────────────────────────

export interface ResolveRequestItem {
  productId: string;
  field: AssetField;
  url: string;
}

export interface ResolveRequest {
  companySlug: string;
  /** Luminaire type slug, e.g. 'power-supplies'. */
  luminaireType: string;
  items: ResolveRequestItem[];
}

export type ResolveStatus = 'uploaded' | 'image_repo' | 'failed' | 'skipped';

export interface ResolveResultItem {
  productId: string;
  field: AssetField;
  status: ResolveStatus;
  /** Public Storage URL when status === 'uploaded', else null. */
  publicUrl: string | null;
  classification: LinkClass;
  httpStatus: number | null;
  bytes: number | null;
  error: string | null;
  /** True when served from the function's per-request URL dedupe cache. */
  cached: boolean;
  /** Storage object key, for debugging. */
  objectKey: string | null;
}

export interface ResolveResponse {
  results: ResolveResultItem[];
}

// ─── Job orchestration ──────────────────────────────────────────────────────

export type ImportPhase =
  | 'configuring'
  | 'uploading'
  | 'mapping'
  | 'previewing'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface ImportRow {
  /** 1-based row number as it appears in the source file, for the error report. */
  sourceRow: number;
  productId: string;
  /** Original cell values, parallel to `ParsedTable.headers`. */
  values: string[];
  /** Resolved output value per field: public URL, IMAGE_REPO, FETCH_FAILED, or ''. */
  resolved: Record<AssetField, string>;
}

export interface ImportFailure {
  sourceRow: number;
  productId: string;
  field: AssetField;
  originalUrl: string;
  classification: LinkClass;
  httpStatus: number | null;
  message: string;
}

export interface ImportProgressState {
  phase: ImportPhase;
  rowsTotal: number;
  rowsCompleted: number;
  assetsTotal: number;
  assetsCompleted: number;
  uploaded: number;
  imageRepos: number;
  skipped: number;
  failed: number;
  /** Deduped uploads avoided by the URL cache. */
  cacheHits: number;
  currentLabel: string | null;
  startedAt: number | null;
  failures: ImportFailure[];
}

export interface ImportConfig {
  /** Concurrent edge-function invocations in flight. */
  concurrency: number;
  /** URLs per invocation. */
  batchSize: number;
  retryAttempts: number;
  retryDelayMs: number;
}
