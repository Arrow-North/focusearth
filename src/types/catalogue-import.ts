import type { ProductCategory, ProductDetails } from './database';

/** A link is reviewed independently before its selected file is downloaded. */
export interface ImportLink {
  id: string;
  header: string;
  detailKey: string;
  url: string;
  kind: 'image' | 'document';
}

export interface CatalogueImportRow {
  id: string;
  rowNumber: number;
  category: ProductCategory;
  orderCode: string;
  details: ProductDetails & Record<string, unknown>;
  /** Original column labels and unmodified cell values, including unmapped fields. */
  sourceValues: Record<string, string>;
  links: ImportLink[];
  /** Data errors which cannot be fixed by selecting/uploading an image. */
  errors: string[];
  /** Missing/unsupported image source; a manual image upload can resolve this. */
  imageIssue?: string;
}

export interface ParsedCatalogueFile {
  name: string;
  category: ProductCategory;
  rows: CatalogueImportRow[];
}
