/**
 * Dependency-free RFC 4180 CSV reader/writer for the catalogue import.
 *
 * Deliberately does NOT go through the `xlsx` package: SheetJS coerces CSV
 * values, which turns an order code like `0012340` into the number `12340`
 * and date-like strings into serial numbers. Everything here stays a string.
 */

/** UTF-8 byte-order mark; Excel needs it to open our output as UTF-8. */
const BOM = '﻿';

/** Delimiters we are willing to sniff, in preference order after the comma. */
const CANDIDATE_DELIMITERS = [',', ';', '\t'] as const;

/** Lines inspected when sniffing; enough to see past a title/banner row. */
const SNIFF_LINES = 10;

/**
 * Pick the delimiter by counting unquoted separators over the first few lines.
 * European Excel exports are semicolon-delimited; some exports are tabbed.
 * The comma stays the default and wins any tie.
 *
 * More than one line is inspected because a file may open with a title/banner
 * row that contains no delimiter at all.
 */
function sniffDelimiter(text: string): string {
  const counts = new Map<string, number>(CANDIDATE_DELIMITERS.map(d => [d, 0]));
  let inQuotes = false;
  let lines = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') i++;
        else inQuotes = false;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (++lines >= SNIFF_LINES) break;
      continue;
    }
    if (counts.has(ch)) counts.set(ch, counts.get(ch) + 1);
  }

  const comma = counts.get(',');
  let best = ',';
  let bestCount = comma;
  for (const delim of CANDIDATE_DELIMITERS) {
    if (delim === ',') continue;
    const count = counts.get(delim);
    // Strictly greater, so the comma stays the default on a tie.
    if (count > bestCount) {
      best = delim;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Parse CSV text into a row-major grid of strings.
 *
 * Handles quoted fields, `""` escapes, embedded delimiters/newlines, CRLF, LF
 * and lone-CR line endings, strips a leading UTF-8 BOM, and does not emit a
 * phantom final row for a trailing newline. Rows may be ragged.
 */
export function parseCsv(text: string): string[][] {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  if (source.length === 0) return [];

  const delimiter = sniffDelimiter(source);
  const rows: string[][] = [];

  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  /** True once the current record has consumed at least one character. */
  let pending = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];

    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      pending = true;
      continue;
    }

    if (ch === delimiter) {
      row.push(field);
      field = '';
      pending = true;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      pending = false;
      continue;
    }

    field += ch;
    pending = true;
  }

  if (pending) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** Quote a single field if it contains a comma, quote, CR or LF. */
function escapeField(value: string): string {
  const field = value ?? '';
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Serialise headers + rows to RFC 4180 CSV, prefixed with a UTF-8 BOM.
 *
 * The header list intentionally may contain DUPLICATE names — the output stage
 * appends resolved columns that collide with existing ones on purpose — so
 * nothing here dedupes or renames them.
 */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines: string[] = [headers.map(escapeField).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeField).join(','));
  }
  return BOM + lines.join('\r\n') + '\r\n';
}

/** Trigger a browser download of `content` as `filename`. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
