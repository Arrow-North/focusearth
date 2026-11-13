import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FIELD_LABELS } from '@/lib/catalogue-import/constants';
import { cn } from '@/lib/utils';
import {
  ASSET_FIELDS,
  type AssetField,
  type Classification,
  type ColumnMapping,
  type LinkClass,
} from '@/types/catalogue-import';
import { CloudDownload, FolderOpen, Rows3, TableProperties } from 'lucide-react';

export interface ImportPreviewTableProps {
  headers: string[];
  rows: string[][];
  mapping: ColumnMapping;
  classifications: Array<Partial<Record<AssetField, Classification | null>>>;
  totalRows: number;
  fillRates: Record<AssetField, number>;
  estimatedFetches: number;
  estimatedRepos: number;
}

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

const CLASS_STYLES: Record<LinkClass, string> = {
  IMAGE: 'border-[#7BA23F] bg-[#7BA23F]/10 text-[#5F7F2F]',
  FILE: 'border-[#3B4A6B] bg-[#3B4A6B]/10 text-[#3B4A6B]',
  IMAGE_REPO: 'border-[#F5A623] bg-[#F5A623]/10 text-[#A87110]',
  UNKNOWN: 'border-border bg-muted text-muted-foreground',
};

const CLASS_LABELS: Record<LinkClass, string> = {
  IMAGE: 'Image',
  FILE: 'File',
  IMAGE_REPO: 'Image repo',
  UNKNOWN: 'Unknown',
};

function percent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0%';
  return `${Math.round(Math.min(1, value) * 100)}%`;
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: typeof Rows3;
  tone?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold tabular-nums', tone)}>
          {value}
        </div>
        {hint && (
          <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function ImportPreviewTable({
  headers,
  rows,
  mapping,
  classifications,
  totalRows,
  fillRates,
  estimatedFetches,
  estimatedRepos,
}: ImportPreviewTableProps) {
  const safeHeaders = headers ?? [];
  const safeRows = rows ?? [];
  const safeClassifications = classifications ?? [];

  const mappedFields = ASSET_FIELDS.filter(field => mapping?.[field] != null);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Rows in file"
            value={(totalRows ?? 0).toLocaleString()}
            hint={
              safeRows.length > 0
                ? `Previewing the first ${safeRows.length}`
                : 'Nothing to preview'
            }
            icon={Rows3}
          />
          <StatTile
            label="Will be fetched"
            value={(estimatedFetches ?? 0).toLocaleString()}
            hint="Images and files mirrored to Storage"
            icon={CloudDownload}
            tone="text-[#7BA23F]"
          />
          <StatTile
            label="Collection fields to review"
            value={(estimatedRepos ?? 0).toLocaleString()}
            hint="Choose one file or None for each hyperlink"
            icon={FolderOpen}
            tone="text-[#F5A623]"
          />
          <StatTile
            label="Mapped columns"
            value={`${mappedFields.length} / ${ASSET_FIELDS.length}`}
            hint={
              mappedFields.length === ASSET_FIELDS.length
                ? 'All link fields mapped'
                : 'Unmapped fields export empty'
            }
            icon={TableProperties}
          />
        </div>

        {/* Per-field fill rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Column fill rate</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {ASSET_FIELDS.map(field => {
              const index = mapping?.[field] ?? null;
              const rate = fillRates?.[field] ?? 0;
              const filled =
                totalRows > 0 ? Math.round(rate * totalRows) : 0;
              return (
                <div key={field} className="min-w-0 rounded-lg border p-3">
                  <div className="truncate text-sm font-medium">
                    {FIELD_LABELS[field]}
                  </div>
                  {index == null ? (
                    <div className="mt-1 text-xs text-[#F5A623]">
                      Not mapped — exports empty
                    </div>
                  ) : (
                    <>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-xl font-semibold tabular-nums">
                          {percent(rate)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {filled.toLocaleString()} of{' '}
                          {(totalRows ?? 0).toLocaleString()} rows
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[#7BA23F]"
                          style={{
                            width: percent(rate),
                          }}
                        />
                      </div>
                      <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                        Column {columnLetter(index)}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Sample rows */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Sample rows{safeRows.length > 0 ? ` (${safeRows.length})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeRows.length === 0 || safeHeaders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No rows to preview.
              </p>
            ) : (
              <div className="w-full overflow-x-auto rounded-md border">
                <Table className="w-max min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 whitespace-nowrap">#</TableHead>
                      {safeHeaders.map((header, index) => {
                        const field = ASSET_FIELDS.find(
                          f => mapping?.[f] === index,
                        );
                        return (
                          <TableHead
                            key={index}
                            className={cn(
                              'whitespace-nowrap',
                              field && 'bg-[#5B6FAF]/5 text-[#3B4A6B]',
                            )}
                          >
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {columnLetter(index)}
                            </span>{' '}
                            {header || '(unnamed)'}
                            {field && (
                              <span className="ml-1 text-[11px] font-normal text-[#5B6FAF]">
                                → {FIELD_LABELS[field]}
                              </span>
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeRows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {rowIndex + 1}
                        </TableCell>
                        {safeHeaders.map((_header, colIndex) => {
                          const value = row?.[colIndex] ?? '';
                          const field = ASSET_FIELDS.find(
                            f => mapping?.[f] === colIndex,
                          );
                          const classification = field
                            ? safeClassifications[rowIndex]?.[field] ?? null
                            : null;

                          if (!field) {
                            return (
                              <TableCell
                                key={colIndex}
                                className="max-w-[14rem] truncate text-sm"
                                title={value}
                              >
                                {value}
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell
                              key={colIndex}
                              className="max-w-[18rem] bg-[#5B6FAF]/5 align-top"
                            >
                              {!value ? (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              ) : classification ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="min-w-0 cursor-help space-y-1">
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'font-medium',
                                          CLASS_STYLES[classification.kind] ??
                                            CLASS_STYLES.UNKNOWN,
                                        )}
                                      >
                                        {CLASS_LABELS[classification.kind] ??
                                          classification.kind}
                                      </Badge>
                                      <div className="truncate text-xs text-muted-foreground">
                                        {value}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p className="font-medium">
                                      {CLASS_LABELS[classification.kind] ??
                                        classification.kind}
                                      {classification.via
                                        ? ` · via ${classification.via}`
                                        : ''}
                                    </p>
                                    <p className="mt-1 text-xs opacity-90">
                                      {classification.reason ||
                                        'No reason recorded.'}
                                    </p>
                                    {classification.fetchUrl &&
                                      classification.fetchUrl !== value && (
                                        <p className="mt-1 break-all text-xs opacity-75">
                                          Fetches: {classification.fetchUrl}
                                        </p>
                                      )}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="min-w-0 space-y-1">
                                  <Badge
                                    variant="outline"
                                    className={CLASS_STYLES.UNKNOWN}
                                  >
                                    Not classified
                                  </Badge>
                                  <div className="truncate text-xs text-muted-foreground">
                                    {value}
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              This file is {safeHeaders.length} columns wide — scroll the table
              sideways to check the mapped columns in context.
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
