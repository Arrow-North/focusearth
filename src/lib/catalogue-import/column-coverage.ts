import { ASSET_FIELDS, type AssetField, type ColumnMapping, type ParsedTable } from '@/types/catalogue-import';
import { cellUrl } from './tabular-parser';

export interface ColumnCoverage {
  total: number;
  filled: number;
  linked: number;
}

/** Source coverage counts every data row, regardless of deduplication or review choices. */
export function calculateColumnCoverage(table: ParsedTable | null, mapping: ColumnMapping): Record<AssetField, ColumnCoverage> {
  const coverage = {} as Record<AssetField, ColumnCoverage>;
  for (const field of ASSET_FIELDS) {
    const counts = { total: table?.rows.length ?? 0, filled: 0, linked: 0 };
    coverage[field] = counts;
    const column = mapping[field];
    if (!table || column == null) continue;
    table.rows.forEach((row, index) => {
      const text = (row[column] ?? '').trim();
      const target = (table.hyperlinks.get(`${index},${column}`) ?? '').trim();
      if (text || target) counts.filled++;
      if (cellUrl(table, index, column)) counts.linked++;
    });
  }
  return coverage;
}
