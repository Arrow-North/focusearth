import * as XLSX from 'xlsx';
import type { ParsedSheet, ParsedRow } from '@/types/led-import';
import { COLUMN_INDICES, SHEETS_TO_SKIP } from './constants';

/**
 * Extract hyperlink from a cell
 * Returns the hyperlink target URL if present, otherwise null
 */
function extractHyperlink(cell: XLSX.CellObject | undefined): string | null {
  if (!cell) return null;

  // Check for hyperlink in cell
  if (cell.l?.Target) {
    return cell.l.Target;
  }

  // Some cells may have the URL as the value itself
  if (typeof cell.v === 'string' && cell.v.startsWith('http')) {
    return cell.v;
  }

  return null;
}

/**
 * Get cell value as string
 */
function getCellValue(cell: XLSX.CellObject | undefined): string {
  if (!cell) return '';
  if (cell.v === undefined || cell.v === null) return '';
  return String(cell.v).trim();
}

/**
 * Convert column index to Excel column letter (0-indexed)
 */
function columnIndexToLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Parse an XLSM file and extract sheet data with order codes and URLs
 */
export async function parseXlsmFile(file: File): Promise<ParsedSheet[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { cellStyles: true });

  const parsedSheets: ParsedSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    // Skip introduction and validation sheets
    if (SHEETS_TO_SKIP.some(skip => sheetName.toLowerCase().includes(skip.toLowerCase()))) {
      continue;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const rows: ParsedRow[] = [];
    const orderCodes: string[] = [];

    // Start from row 2 (skip header row, 0-indexed so row 1)
    for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex++) {
      const orderCodeCol = columnIndexToLetter(COLUMN_INDICES.ORDER_CODE);
      const specsCol = columnIndexToLetter(COLUMN_INDICES.SPECIFICATIONS);
      const imageCol = columnIndexToLetter(COLUMN_INDICES.PRODUCT_IMAGE);

      const orderCodeCell = worksheet[`${orderCodeCol}${rowIndex + 1}`];
      const specsCell = worksheet[`${specsCol}${rowIndex + 1}`];
      const imageCell = worksheet[`${imageCol}${rowIndex + 1}`];

      const orderCode = getCellValue(orderCodeCell);

      // Skip rows without order code
      if (!orderCode) continue;

      const specificationsUrl = extractHyperlink(specsCell);
      const productImageUrl = extractHyperlink(imageCell);

      // Only include rows that have at least one URL
      if (specificationsUrl || productImageUrl) {
        rows.push({
          orderCode,
          specificationsUrl,
          productImageUrl,
        });

        if (!orderCodes.includes(orderCode)) {
          orderCodes.push(orderCode);
        }
      }
    }

    // Only include sheets that have data
    if (rows.length > 0) {
      parsedSheets.push({
        name: sheetName,
        rowCount: rows.length,
        orderCodes,
        rows,
      });
    }
  }

  return parsedSheets;
}

/**
 * Validate that the file is an XLSM file
 */
export function validateXlsmFile(file: File): { valid: boolean; error?: string } {
  const validExtensions = ['.xlsm', '.xlsx', '.xls'];
  const fileName = file.name.toLowerCase();

  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload an XLSM, XLSX, or XLS file.',
    };
  }

  // Check file size (100 MB max for Excel files)
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File is too large. Maximum size is 100 MB.',
    };
  }

  return { valid: true };
}
