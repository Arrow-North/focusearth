/**
 * Tabular input parser for the catalogue import.
 *
 * Reads .csv / .xlsx / .xlsm / .xls into the shared `ParsedTable` shape:
 * every value is the text the user sees, every column survives (even blank and
 * duplicate headers), and every non-empty row survives (even rows with no
 * hyperlinks at all).
 */

import * as XLSX from 'xlsx';
import type {
  AssetField,
  ColumnMapping,
  ParsedTable,
  SheetSummary,
} from '@/types/catalogue-import';
import { ASSET_FIELDS } from '@/types/catalogue-import';
import {
  ACCEPTED_EXTENSIONS,
  HEADER_ALIASES,
  MAX_INPUT_FILE_SIZE,
  normalizeHeader,
} from './constants';
import { parseCsv } from './csv';

/** Sheet name reported for a CSV, which has no real sheets. */
const CSV_SHEET_NAME = 'Sheet1';

/** Shortest alias allowed to match as a substring, to limit false positives. */
const MIN_SUBSTRING_ALIAS = 3;

function fileExtension(file: File): string {
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot);
}

function isCsvFile(file: File): boolean {
  return fileExtension(file) === '.csv';
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Validate extension and size before we spend time reading the file. */
export function validateTabularFile(file: File): { valid: boolean; error?: string } {
  const ext = fileExtension(file);
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file type. Accepted formats: ${ACCEPTED_EXTENSIONS.join(', ')}.`,
    };
  }

  if (file.size > MAX_INPUT_FILE_SIZE) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${formatBytes(MAX_INPUT_FILE_SIZE)}.`,
    };
  }

  return { valid: true };
}

/** Read an Excel workbook with hyperlinks and display text intact. */
async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { cellStyles: true });
}

/**
 * Read a worksheet as a grid of displayed text, anchored at A1.
 *
 * Forcing the range to start at A1 keeps grid indices identical to absolute
 * sheet row/column indices, which is what the hyperlink walk relies on.
 * `raw: false` is essential: `raw: true` destroys leading-zero codes and turns
 * dates into serial numbers.
 */
function sheetToGrid(ws: XLSX.WorkSheet): { grid: string[][]; width: number } {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const endRow = Math.max(range.e.r, 0);
  const endCol = Math.max(range.e.c, 0);

  const grid = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: true,
    range: { s: { r: 0, c: 0 }, e: { r: endRow, c: endCol } },
  });

  let width = endCol + 1;
  for (const row of grid) {
    if (row && row.length > width) width = row.length;
  }

  return { grid: grid.map(row => row ?? []), width };
}

/** All sheets with their row counts. Unlike the legacy parser, nothing is skipped. */
export async function listSheets(file: File): Promise<SheetSummary[]> {
  if (isCsvFile(file)) {
    const grid = parseCsv(await file.text());
    return [{ name: CSV_SHEET_NAME, rowCount: grid.length }];
  }

  const workbook = await readWorkbook(file);
  return workbook.SheetNames.map(name => {
    const ws = workbook.Sheets[name];
    if (!ws || !ws['!ref']) return { name, rowCount: 0 };
    const range = XLSX.utils.decode_range(ws['!ref']);
    return { name, rowCount: Math.max(range.e.r - range.s.r + 1, 0) };
  });
}

function isBlankRow(row: string[]): boolean {
  return row.every(cell => (cell ?? '').trim() === '');
}

/** First row carrying >= 2 non-empty cells; skips title/banner rows that only fill A1. */
function detectHeaderRow(grid: string[][]): number {
  for (let r = 0; r < grid.length; r++) {
    const filled = (grid[r] ?? []).filter(cell => (cell ?? '').trim() !== '').length;
    if (filled >= 2) return r;
  }
  return 0;
}

/** Pad (or trim) a row so every row is exactly `width` wide. */
function normalizeRow(row: string[], width: number): string[] {
  const out = new Array<string>(width);
  for (let c = 0; c < width; c++) {
    const value = row?.[c];
    out[c] = value === undefined || value === null ? '' : String(value);
  }
  return out;
}

/**
 * Build the header list.
 *
 * A blank header keeps its column and is named `Column <Excel letter>`.
 * Duplicate headers are preserved VERBATIM — the output stage deliberately
 * appends columns that collide with existing ones.
 */
function buildHeaders(headerRow: string[], width: number): string[] {
  const headers: string[] = [];
  for (let c = 0; c < width; c++) {
    const raw = (headerRow?.[c] ?? '').trim();
    headers.push(raw === '' ? `Column ${XLSX.utils.encode_col(c)}` : raw);
  }
  return headers;
}

/**
 * Parse a CSV or Excel file into a `ParsedTable`.
 *
 * @param opts.sheetName       Excel sheet to read; defaults to the first sheet.
 * @param opts.headerRowIndex  0-based row index of the header within the sheet;
 *                             defaults to the first row with >= 2 non-empty cells.
 */
export async function parseTabularFile(
  file: File,
  opts?: { sheetName?: string; headerRowIndex?: number },
): Promise<ParsedTable> {
  const validation = validateTabularFile(file);
  if (!validation.valid) throw new Error(validation.error);

  let grid: string[][];
  let width: number;
  let sheetNames: string[];
  let sheetName: string | null;
  let worksheet: XLSX.WorkSheet | null = null;

  if (isCsvFile(file)) {
    grid = parseCsv(await file.text());
    width = grid.reduce((max, row) => Math.max(max, row.length), 0);
    sheetNames = [CSV_SHEET_NAME];
    sheetName = null;
  } else {
    const workbook = await readWorkbook(file);
    sheetNames = workbook.SheetNames.slice();
    const requested = opts?.sheetName;
    sheetName =
      requested && sheetNames.includes(requested) ? requested : (sheetNames[0] ?? null);
    worksheet = sheetName ? workbook.Sheets[sheetName] : null;

    if (!worksheet) {
      throw new Error(
        requested
          ? `Sheet "${requested}" was not found in this workbook.`
          : 'This workbook contains no readable sheets.',
      );
    }

    ({ grid, width } = sheetToGrid(worksheet));
  }

  const requestedHeader = opts?.headerRowIndex;
  const headerRowIndex =
    requestedHeader !== undefined && requestedHeader >= 0 && requestedHeader < grid.length
      ? requestedHeader
      : detectHeaderRow(grid);

  if (width === 0) {
    width = (grid[headerRowIndex] ?? []).length;
  }

  const headers = buildHeaders(grid[headerRowIndex] ?? [], width);

  // One pass over the grid produces both directions of the mapping:
  //   gridRowToOutputRow  grid row -> `rows` index, so hyperlinks survive
  //                       dropped blank rows;
  //   sourceRowNumbers    `rows` index -> 1-based sheet row number, so callers
  //                       can point a user at the real line in their file.
  // Both paths (Excel and CSV) reach this loop, so `sourceRowNumbers` is always
  // built in lockstep with `rows` and the two can never differ in length.
  const rows: string[][] = [];
  const sourceRowNumbers: number[] = [];
  const gridRowToOutputRow = new Map<number, number>();
  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = normalizeRow(grid[r] ?? [], width);
    if (isBlankRow(row)) continue;
    gridRowToOutputRow.set(r, rows.length);
    // 1-based, matching Excel's own row gutter: grid row 0 is sheet row 1.
    sourceRowNumbers.push(r + 1);
    rows.push(row);
  }

  const hyperlinks = new Map<string, string>();
  if (worksheet && worksheet['!ref']) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
      const outputRow = gridRowToOutputRow.get(r);
      if (outputRow === undefined) continue;
      for (let c = 0; c < width; c++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r, c })] as
          | XLSX.CellObject
          | undefined;
        // SheetJS exposes the hyperlink layer on `cell.l.Target`; `sheet_to_json`
        // never surfaces it, which is why we walk the cells separately.
        const target = cell?.l?.Target;
        if (target) hyperlinks.set(`${outputRow},${c}`, target);
      }
    }
  }

  return {
    sheetNames,
    sheetName,
    headers,
    rows,
    hyperlinks,
    headerRowIndex,
    sourceRowNumbers,
    totalRows: rows.length,
  };
}

/** `www.foo` -> `https://www.foo`; anything else is returned untouched. */
function normalizeUrl(value: string): string {
  return /^www\./i.test(value) ? `https://${value}` : value;
}

/**
 * The effective URL of a cell: the hyperlink target wins, otherwise the cell
 * text but only when it actually looks like a URL. Returns null when neither
 * applies.
 *
 * `rowIndex` is 0-based relative to `table.rows` (i.e. after the header row and
 * any blank rows have been removed), matching the `hyperlinks` map keys.
 */
export function cellUrl(
  table: ParsedTable,
  rowIndex: number,
  colIndex: number,
): string | null {
  const target = (table.hyperlinks.get(`${rowIndex},${colIndex}`) ?? '').trim();
  if (target) return normalizeUrl(target);

  const text = (table.rows[rowIndex]?.[colIndex] ?? '').trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (/^www\./i.test(text)) return normalizeUrl(text);

  return null;
}

interface AliasCandidate {
  col: number;
  exact: boolean;
}

/** Candidate columns for one field, in column order, exact matches flagged. */
function candidatesFor(field: AssetField, normalized: string[]): AliasCandidate[] {
  const aliases = HEADER_ALIASES[field] ?? [];
  const candidates: AliasCandidate[] = [];

  for (let col = 0; col < normalized.length; col++) {
    const header = normalized[col];
    if (!header) continue;

    if (aliases.includes(header)) {
      candidates.push({ col, exact: true });
      continue;
    }
    const substring = aliases.some(
      alias => alias.length >= MIN_SUBSTRING_ALIAS && header.includes(alias),
    );
    if (substring) candidates.push({ col, exact: false });
  }

  return candidates;
}

/**
 * Guess which column holds each asset field.
 *
 * Exact alias matches are assigned before substring matches, so a contested
 * column goes to the field that matches it exactly. Each column is claimed by
 * at most one field.
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(h => normalizeHeader(h ?? ''));
  const mapping = { specifications: null, installationInstructions: null, productImage: null } as ColumnMapping;

  const candidates = new Map<AssetField, AliasCandidate[]>(
    ASSET_FIELDS.map(field => [field, candidatesFor(field, normalized)]),
  );
  const claimed = new Set<number>();

  // Pass 1: exact matches win any contested column.
  for (const field of ASSET_FIELDS) {
    const hit = candidates.get(field).find(c => c.exact && !claimed.has(c.col));
    if (hit) {
      mapping[field] = hit.col;
      claimed.add(hit.col);
    }
  }

  // Pass 2: substring matches fill in the rest.
  for (const field of ASSET_FIELDS) {
    if (mapping[field] !== null) continue;
    const hit = candidates.get(field).find(c => !claimed.has(c.col));
    if (hit) {
      mapping[field] = hit.col;
      claimed.add(hit.col);
    }
  }

  return mapping;
}
