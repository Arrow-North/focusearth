/**
 * LED Catalogue Import Types
 */

export type ImportPhase =
  | 'idle'
  | 'parsing'
  | 'previewing'
  | 'importing'
  | 'paused'
  | 'completed'
  | 'error';

export interface ParsedRow {
  orderCode: string;
  specificationsUrl: string | null;
  productImageUrl: string | null;
}

export interface ParsedSheet {
  name: string;
  rowCount: number;
  orderCodes: string[];
  rows: ParsedRow[];
}

export interface ImportError {
  orderCode: string;
  sheet: string;
  type: 'specifications' | 'product-image';
  url: string;
  message: string;
  timestamp: Date;
}

export interface ImportProgress {
  phase: ImportPhase;
  currentSheet: string | null;
  currentOrderCode: string | null;
  sheetsCompleted: number;
  sheetsTotal: number;
  imagesCompleted: number;
  imagesTotal: number;
  errors: ImportError[];
}

export interface ImportConfig {
  concurrency: number;
  batchDelay: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface SheetSelection {
  [sheetName: string]: boolean;
}

export interface ImportResult {
  success: boolean;
  sheetsProcessed: number;
  imagesUploaded: number;
  errors: ImportError[];
  duration: number;
}
