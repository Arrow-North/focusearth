import type { CatalogueImportRow } from '@/types/catalogue-import';

export interface AssetCandidate {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string;
}
export interface LinkReview {
  candidates: AssetCandidate[];
  selectedId?: string;
  error?: string;
  discovered: boolean;
  sourceType?: 'file' | 'folder';
}
export interface DuplicateMatch {
  id: number;
  updatedAt: string | null;
  details: Record<string, unknown>;
}
export interface RowReview {
  row: CatalogueImportRow;
  matches: DuplicateMatch[];
  decision: 'create' | 'update' | 'skip' | 'unresolved';
  existingProductId?: number;
  links: Record<string, LinkReview>;
  manualImage?: File;
  outcome?: 'created' | 'updated' | 'skipped';
  error?: string;
}

export function rowIdentity(row: CatalogueImportRow): string {
  return `${row.category}:${row.orderCode.trim().toLowerCase()}`;
}

export function rowBlockers(review: RowReview, all: RowReview[]): string[] {
  if (review.outcome || review.decision === 'skip') return [];
  const issues = [...review.row.errors];
  if (review.decision === 'unresolved') issues.push('Choose how to handle the existing catalogue record.');
  if (review.decision === 'update' && !review.existingProductId) issues.push('Choose the existing product to update.');
  if (all.some(other => other !== review && other.decision !== 'skip' && rowIdentity(other.row) === rowIdentity(review.row))) {
    issues.push('This upload repeats this order code in the same category. Keep one row and skip the others.');
  }
  const imageLinks = review.row.links.filter(link => link.kind === 'image');
  if (!review.manualImage && !imageLinks.some(link => review.links[link.id]?.selectedId)) {
    issues.push('Product image is not available for import. Select an eligible image or upload one manually.');
  }
  for (const link of review.row.links) {
    if (link.kind === 'image' && review.manualImage) continue;
    const state = review.links[link.id];
    if (!state?.discovered) issues.push(`${link.header}: discover the linked files first.`);
    else if (state.error) issues.push(`${link.header}: ${state.error}`);
    else if (!state.selectedId) issues.push(`${link.header}: select a file before importing.`);
  }
  return [...new Set(issues)];
}

export function validateManualImage(file: Pick<File, 'type' | 'size'>): string | undefined {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return 'Choose a JPEG, PNG, WebP, or GIF image.';
  if (file.size === 0 || file.size > 10 * 1024 * 1024) return 'Image must be nonempty and no larger than 10 MB.';
}
