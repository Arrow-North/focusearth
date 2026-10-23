import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FIELD_LABELS } from '@/lib/catalogue-import/constants';
import { cn } from '@/lib/utils';
import {
  ASSET_FIELDS,
  type AssetField,
  type ColumnMapping,
} from '@/types/catalogue-import';
import {
  AlertTriangle,
  Columns3,
  Info,
  Minus,
  Plus,
  Sheet as SheetIcon,
} from 'lucide-react';

export interface ColumnMappingStepProps {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (m: ColumnMapping) => void;
  sheetNames: string[];
  sheetName: string | null;
  onSheetChange: (name: string) => void;
  headerRowIndex: number;
  onHeaderRowChange: (i: number) => void;
  sampleRows: string[][];
}

const NONE_VALUE = '__none__';

/** 0 -> A, 25 -> Z, 26 -> AA, 39 -> AN. */
function columnLetter(index: number): string {
  if (index == null || index < 0) return '';
  let n = index;
  let out = '';
  while (n >= 0) {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  }
  return out;
}

export function ColumnMappingStep({
  headers,
  mapping,
  onChange,
  sheetNames,
  sheetName,
  onSheetChange,
  headerRowIndex,
  onHeaderRowChange,
  sampleRows,
}: ColumnMappingStepProps) {
  const safeHeaders = headers ?? [];
  const safeSamples = sampleRows ?? [];

  const setField = (field: AssetField, value: string) => {
    const next: ColumnMapping = {
      ...mapping,
      [field]: value === NONE_VALUE ? null : Number(value),
    };
    onChange(next);
  };

  /** First non-empty sample value for a column, as a sanity check. */
  const sampleFor = (index: number | null): string | null => {
    if (index == null) return null;
    for (const row of safeSamples) {
      const value = row?.[index];
      if (value && value.trim()) return value.trim();
    }
    return null;
  };

  const unmapped = ASSET_FIELDS.filter(field => mapping?.[field] == null);

  // A column mapped to more than one field.
  const usage = new Map<number, AssetField[]>();
  ASSET_FIELDS.forEach(field => {
    const index = mapping?.[field];
    if (index == null) return;
    usage.set(index, [...(usage.get(index) ?? []), field]);
  });
  const collisions = Array.from(usage.entries()).filter(
    ([, fields]) => fields.length > 1,
  );

  const hasHeaders = safeHeaders.length > 0;

  return (
    <div className="space-y-6">
      {/* Source: sheet + header row */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <SheetIcon className="h-5 w-5 text-[#3B4A6B]" />
            Source
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sheetNames && sheetNames.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Sheet</label>
              <Select
                value={sheetName ?? undefined}
                onValueChange={onSheetChange}
              >
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Select a sheet" />
                </SelectTrigger>
                <SelectContent>
                  {sheetNames.map(name => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This workbook has {sheetNames.length} sheets. Only the selected
                one is imported.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Header row</label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous header row"
                disabled={headerRowIndex <= 0}
                onClick={() => onHeaderRowChange(Math.max(0, headerRowIndex - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="min-w-[4.5rem] rounded-md border px-3 py-1.5 text-center text-sm font-medium tabular-nums">
                Row {(headerRowIndex ?? 0) + 1}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next header row"
                onClick={() => onHeaderRowChange((headerRowIndex ?? 0) + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {hasHeaders
                  ? `${safeHeaders.length} columns detected (A–${columnLetter(safeHeaders.length - 1)})`
                  : 'No columns detected on this row'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Catalogue exports often carry a title or legend above the real
              header. Step until the column names below look right.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Field mapping */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Columns3 className="h-5 w-5 text-[#3B4A6B]" />
            Link Columns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasHeaders ? (
            <p className="text-sm text-muted-foreground">
              No columns to map yet. Adjust the header row above.
            </p>
          ) : (
            ASSET_FIELDS.map((field, i) => {
              const value = mapping?.[field];
              const duplicated =
                value != null && (usage.get(value)?.length ?? 0) > 1;
              const sample = sampleFor(value ?? null);

              return (
                <div key={field}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-start sm:gap-4">
                    <div className="pt-1.5">
                      <div className="text-sm font-medium">
                        {FIELD_LABELS[field]}
                      </div>
                      {value == null && (
                        <div className="text-xs text-[#F5A623]">
                          Not mapped — output column will be empty
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <Select
                        value={value == null ? NONE_VALUE : String(value)}
                        onValueChange={next => setField(field, next)}
                      >
                        <SelectTrigger
                          className={cn(
                            'w-full',
                            duplicated && 'border-[#F5A623] ring-1 ring-[#F5A623]',
                          )}
                        >
                          <SelectValue placeholder="— Not present —" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value={NONE_VALUE}>
                            — Not present —
                          </SelectItem>
                          {safeHeaders.map((header, index) => (
                            <SelectItem key={index} value={String(index)}>
                              <span className="font-mono text-xs text-muted-foreground">
                                {columnLetter(index)}
                              </span>
                              <span className="mx-2 text-muted-foreground/50">
                                ·
                              </span>
                              {header || `(unnamed column ${columnLetter(index)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {value != null && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="font-mono">
                            Column {columnLetter(value)}
                          </Badge>
                          {sample ? (
                            <span className="min-w-0 truncate">
                              e.g. {sample}
                            </span>
                          ) : (
                            <span>No sample values in the preview rows</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {collisions.length > 0 && (
        <Alert className="border-[#F5A623] bg-[#F5A623]/5">
          <AlertTriangle className="h-4 w-4 !text-[#F5A623]" />
          <AlertTitle className="text-[#F5A623]">
            One column feeds more than one field
          </AlertTitle>
          <AlertDescription className="text-foreground/80">
            {collisions.map(([index, fields]) => (
              <div key={index}>
                Column {columnLetter(index)} (
                {safeHeaders[index] || 'unnamed'}) is mapped to{' '}
                {fields.map(f => FIELD_LABELS[f]).join(' and ')}. The same link
                will be resolved and written into each of those output columns.
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {unmapped.length > 0 && hasHeaders && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>
            {unmapped.length} of {ASSET_FIELDS.length} fields unmapped
          </AlertTitle>
          <AlertDescription>
            {unmapped.map(f => FIELD_LABELS[f]).join(', ')}{' '}
            {unmapped.length === 1 ? 'has' : 'have'} no source column. Nothing
            is fetched for {unmapped.length === 1 ? 'it' : 'them'}, and the
            matching output column is written empty for every row.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
