import type { AssetField } from '@/types/catalogue-import';
import type { AssetCandidate } from '@/lib/led-import/import-review';

/** Each source row and hyperlink has an independent choice, even for a reused URL. */
export function repositoryKey(rowIndex: number, field: AssetField): string {
  return `${rowIndex}:${field}`;
}

export interface RepositoryLink {
  key: string;
  rowIndex: number;
  sourceRow: number;
  field: AssetField;
  url: string;
}

export interface RepositoryReview {
  discovered: boolean;
  candidates: AssetCandidate[];
  selectedId?: string;
  declined?: boolean;
  error?: string;
}

export function repositoryNeedsChoice(review?: RepositoryReview): boolean {
  return !review?.declined && !review?.candidates.some(candidate => candidate.id === review.selectedId);
}
