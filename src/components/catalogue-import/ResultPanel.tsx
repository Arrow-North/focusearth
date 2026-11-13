import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { FIELD_LABELS, OUTPUT_COLUMNS, RESOLVED_SUFFIX } from '@/lib/catalogue-import/constants';
import { cn } from '@/lib/utils';
import type { ImportProgressState } from '@/types/catalogue-import';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  FileWarning,
  RefreshCw,
  XCircle,
} from 'lucide-react';

export interface ResultPanelProps {
  progress: ImportProgressState;
  onDownloadCsv: () => void;
  onDownloadErrors: () => void;
  onReset: () => void;
  disambiguateHeaders: boolean;
  onDisambiguateChange: (v: boolean) => void;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold tabular-nums', tone)}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </CardContent>
    </Card>
  );
}

const APPENDED_COLUMNS = [
  OUTPUT_COLUMNS.specifications,
  OUTPUT_COLUMNS.installationInstructions,
  OUTPUT_COLUMNS.productImage,
];

export function ResultPanel({
  progress,
  onDownloadCsv,
  onDownloadErrors,
  onReset,
  disambiguateHeaders,
  onDisambiguateChange,
}: ResultPanelProps) {
  // The run is over by the time this panel mounts; freeze the end time so the
  // duration does not drift while the user reads it.
  const [finishedAt] = useState(() => Date.now());

  const failures = progress?.failures ?? [];
  const failureCount = failures.length;
  const cancelled = progress?.phase === 'cancelled';
  const clean = !cancelled && failureCount === 0;

  const startedAt = progress?.startedAt ?? null;
  const durationMs = startedAt != null ? Math.max(0, finishedAt - startedAt) : null;

  const title = cancelled
    ? 'Import Cancelled'
    : failureCount > 0
      ? 'Import Completed with Failures'
      : 'Import Completed';

  const subtitle = cancelled
    ? `Stopped after ${(progress?.assetsCompleted ?? 0).toLocaleString()} of ${(progress?.assetsTotal ?? 0).toLocaleString()} assets. The CSV below holds everything resolved before the stop.`
    : failureCount > 0
      ? `${(progress?.uploaded ?? 0).toLocaleString()} assets uploaded, ${failureCount.toLocaleString()} could not be resolved.`
      : `${(progress?.uploaded ?? 0).toLocaleString()} assets uploaded across ${(progress?.rowsCompleted ?? 0).toLocaleString()} rows.`;

  return (
    <div className="space-y-6">
      {/* Outcome banner */}
      <Card
        className={cn(
          clean && 'border-[#7BA23F] bg-[#7BA23F]/5',
          !cancelled && failureCount > 0 && 'border-[#F5A623] bg-[#F5A623]/5',
          cancelled && 'border-destructive bg-destructive/5',
        )}
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {clean ? (
              <CheckCircle className="h-10 w-10 shrink-0 text-[#7BA23F]" />
            ) : cancelled ? (
              <XCircle className="h-10 w-10 shrink-0 text-destructive" />
            ) : (
              <AlertTriangle className="h-10 w-10 shrink-0 text-[#F5A623]" />
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Stat label="Rows" value={progress?.rowsCompleted ?? 0} />
        <Stat
          label="Uploaded"
          value={progress?.uploaded ?? 0}
          tone="text-[#7BA23F]"
        />
        <Stat
          label="Collection fields reviewed"
          value={progress?.imageRepos ?? 0}
          tone="text-[#F5A623]"
        />
        <Stat label="Skipped" value={progress?.skipped ?? 0} />
        <Stat
          label="Failed"
          value={failureCount}
          tone={failureCount > 0 ? 'text-destructive' : undefined}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {durationMs != null ? formatDuration(durationMs) : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Output header option */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Output columns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="text-sm font-medium">
                Disambiguate appended headers
              </div>
              <p className="text-sm text-muted-foreground">
                The export appends{' '}
                {APPENDED_COLUMNS.map((name, i) => (
                  <span key={name}>
                    {i > 0 && (i === APPENDED_COLUMNS.length - 1 ? ' and ' : ', ')}
                    <code className="font-mono text-xs">{name}</code>
                  </span>
                ))}{' '}
                after the original columns. Those names collide with the source
                file’s own columns.
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Off</span> — exact
                names as specified. The CSV then carries duplicate headers;
                Excel opens it fine, pandas renames the second one to{' '}
                <code className="font-mono text-xs">
                  {OUTPUT_COLUMNS.productImage}.1
                </code>
                .{' '}
                <span className="font-medium text-foreground">On</span> — append{' '}
                <code className="font-mono text-xs">{RESOLVED_SUFFIX.trim()}</code>{' '}
                so every header is unique (e.g.{' '}
                <code className="font-mono text-xs">
                  {OUTPUT_COLUMNS.productImage}
                  {RESOLVED_SUFFIX}
                </code>
                ).
              </p>
            </div>
            <Switch
              checked={disambiguateHeaders}
              onCheckedChange={onDisambiguateChange}
              aria-label="Disambiguate appended headers"
            />
          </div>
        </CardContent>
      </Card>

      {/* Failures */}
      {failureCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <FileWarning className="h-5 w-5" />
              Unresolved Assets ({failureCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-3">
                {failures.map((failure, index) => (
                  <div
                    key={`${failure.sourceRow}-${failure.field}-${index}`}
                    className="rounded border border-destructive/20 bg-destructive/5 p-3 text-sm"
                  >
                    <div className="font-medium">
                      Row {failure.sourceRow}
                      {failure.productId ? ` · ${failure.productId}` : ''} ·{' '}
                      {FIELD_LABELS[failure.field] ?? failure.field}
                    </div>
                    <div className="text-muted-foreground">
                      {failure.classification}
                      {failure.httpStatus != null
                        ? ` · HTTP ${failure.httpStatus}`
                        : ''}
                      : {failure.message}
                    </div>
                    {failure.originalUrl && (
                      <div className="mt-1 break-all text-xs text-muted-foreground/70">
                        {failure.originalUrl}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={onDownloadCsv}
          className="bg-[#7BA23F] text-white hover:bg-[#6B9235]"
        >
          <Download className="mr-2 h-4 w-4" />
          Download CSV
        </Button>
        {failureCount > 0 && (
          <Button variant="outline" onClick={onDownloadErrors}>
            <FileWarning className="mr-2 h-4 w-4" />
            Download error report
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onReset}
          className="border-[#3B4A6B] text-[#3B4A6B] hover:bg-[#3B4A6B]/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Start another import
        </Button>
      </div>
    </div>
  );
}
