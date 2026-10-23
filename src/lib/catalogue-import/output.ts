import { toCsv } from './csv';
import { FETCH_FAILED, OUTPUT_COLUMNS, RESOLVED_SUFFIX } from './constants';
import type {
  AssetField,
  ImportFailure,
  ImportRow,
} from '@/types/catalogue-import';

/**
 * Build the output CSV: every original column untouched, then the four
 * appended columns.
 *
 * The three resolved column names deliberately collide with the source file's
 * own column names. Excel tolerates duplicate headers; pandas renames the
 * second to `Specifications.1`. `disambiguate` appends " (Resolved)" instead.
 */
export function buildOutputCsv(
  sourceHeaders: string[],
  rows: ImportRow[],
  disambiguate = false,
): string {
  const suffix = disambiguate ? RESOLVED_SUFFIX : '';

  const headers = [
    ...sourceHeaders,
    OUTPUT_COLUMNS.productId,
    OUTPUT_COLUMNS.specifications + suffix,
    OUTPUT_COLUMNS.installationInstructions + suffix,
    OUTPUT_COLUMNS.productImage + suffix,
  ];

  const body = rows.map((row) => {
    // Defensive: pad/trim so every line matches the header width exactly.
    const original = sourceHeaders.map((_, i) => row.values[i] ?? '');
    return [
      ...original,
      row.productId,
      row.resolved.specifications ?? '',
      row.resolved.installationInstructions ?? '',
      row.resolved.productImage ?? '',
    ];
  });

  return toCsv(headers, body);
}

const ERROR_HEADERS = [
  'row_number',
  'product_id',
  'field',
  'original_url',
  'classification',
  'http_status',
  'error_message',
];

/** Build the companion failure report, the basis for a targeted re-run. */
export function buildErrorCsv(failures: ImportFailure[]): string {
  const body = failures.map((f) => [
    String(f.sourceRow),
    f.productId,
    f.field,
    f.originalUrl,
    f.classification,
    f.httpStatus == null ? '' : String(f.httpStatus),
    f.message,
  ]);
  return toCsv(ERROR_HEADERS, body);
}

/** Blank resolved-value map for a freshly created row. */
export function emptyResolved(): Record<AssetField, string> {
  return {
    specifications: '',
    installationInstructions: '',
    productImage: '',
  };
}

export { FETCH_FAILED };
