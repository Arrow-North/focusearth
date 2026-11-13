import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FIELD_LABELS } from '@/lib/catalogue-import/constants';
import { cn } from '@/lib/utils';
import type { ImportProgressState } from '@/types/catalogue-import';
import {
  AlertCircle,
  Clock,
  Download,
  Loader2,
  Pause,
  Play,
  Timer,
  XCircle,
} from 'lucide-react';

export interface ProcessingPanelProps {
  progress: ImportProgressState;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDownloadPartial: () => void;
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

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-xl font-semibold tabular-nums', tone)}>
        {(value ?? 0).toLocaleString()}
      </div>
    </div>
  );
}

export function ProcessingPanel({
  progress,
  onPause,
  onResume,
  onCancel,
  onDownloadPartial,
}: ProcessingPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const phase = progress?.phase;
  const isPaused = phase === 'paused';
  const isRunning = phase === 'processing';
  const startedAt = progress?.startedAt ?? null;

  // Tick the elapsed clock only while the job is actually moving.
  useEffect(() => {
    if (!isRunning || startedAt == null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isRunning, startedAt]);

  const assetsTotal = progress?.assetsTotal ?? 0;
  const assetsCompleted = progress?.assetsCompleted ?? 0;
  const rowsTotal = progress?.rowsTotal ?? 0;
  const rowsCompleted = progress?.rowsCompleted ?? 0;
  const failures = progress?.failures ?? [];

  const assetPercent =
    assetsTotal > 0
      ? Math.min(100, (assetsCompleted / assetsTotal) * 100)
      : 0;

  const elapsedMs = startedAt != null ? Math.max(0, now - startedAt) : 0;
  const throughput =
    elapsedMs > 0 && assetsCompleted > 0
      ? assetsCompleted / (elapsedMs / 1000)
      : 0;
  const remaining = Math.max(0, assetsTotal - assetsCompleted);
  const etaMs =
    throughput > 0 && remaining > 0 ? (remaining / throughput) * 1000 : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {isPaused ? (
              <Pause className="h-5 w-5 text-[#F5A623]" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-[#7BA23F]" />
            )}
            {isPaused ? 'Import Paused' : 'Resolving Assets…'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="min-h-5 text-sm text-muted-foreground">
            {progress?.currentLabel || (isPaused ? 'Waiting to resume.' : 'Working…')}
          </p>

          <div>
            <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Assets</span>
              <span className="font-medium tabular-nums">
                {assetsCompleted.toLocaleString()} /{' '}
                {assetsTotal.toLocaleString()} ({Math.round(assetPercent)}%)
              </span>
            </div>
            <Progress value={assetPercent} className="h-3" />
            <div className="mt-1 text-xs text-muted-foreground tabular-nums">
              Rows {rowsCompleted.toLocaleString()} /{' '}
              {rowsTotal.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Counter
              label="Uploaded"
              value={progress?.uploaded ?? 0}
              tone="text-[#7BA23F]"
            />
            <Counter
              label="Collection fields reviewed"
              value={progress?.imageRepos ?? 0}
              tone="text-[#F5A623]"
            />
            <Counter label="Skipped" value={progress?.skipped ?? 0} />
            <Counter
              label="Failed"
              value={progress?.failed ?? 0}
              tone={(progress?.failed ?? 0) > 0 ? 'text-destructive' : undefined}
            />
            <Counter
              label="Cache hits"
              value={progress?.cacheHits ?? 0}
              tone="text-[#3B4A6B]"
            />
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              Elapsed{' '}
              <span className="font-medium text-foreground tabular-nums">
                {startedAt != null ? formatDuration(elapsedMs) : '—'}
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Timer className="h-4 w-4" />
              ETA{' '}
              <span className="font-medium text-foreground tabular-nums">
                {etaMs != null ? `~${formatDuration(etaMs)}` : '—'}
              </span>
            </span>
            {throughput > 0 && (
              <span className="text-muted-foreground tabular-nums">
                {throughput.toFixed(1)} assets/s
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {isPaused ? (
              <Button
                onClick={onResume}
                className="bg-[#7BA23F] text-white hover:bg-[#6B9235]"
              >
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            ) : (
              <Button
                onClick={onPause}
                variant="outline"
                className="border-[#F5A623] text-[#F5A623] hover:bg-[#F5A623]/10"
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}
            <Button variant="outline" onClick={onDownloadPartial}>
              <Download className="mr-2 h-4 w-4" />
              Download partial CSV
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Everything resolved so far is already in the partial CSV — you can
            download it at any point without stopping the run.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle
            className={cn(
              'flex items-center gap-2 text-base',
              failures.length > 0 && 'text-destructive',
            )}
          >
            <AlertCircle className="h-5 w-5" />
            Failures ({failures.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {failures.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No failures so far.
            </p>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-3">
                {failures.map((failure, index) => (
                  <div
                    key={`${failure.sourceRow}-${failure.field}-${index}`}
                    className="rounded border border-destructive/20 bg-destructive/5 p-2 text-sm"
                  >
                    <div className="font-medium text-destructive">
                      Row {failure.sourceRow} ·{' '}
                      {FIELD_LABELS[failure.field] ?? failure.field}
                    </div>
                    <div className="break-words text-muted-foreground">
                      {failure.message}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancel this import?"
        description="Processing stops where it is. Assets already uploaded stay in Storage, and you can still download the partial CSV for the rows completed so far."
        confirmLabel="Cancel import"
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          onCancel();
        }}
      />
    </div>
  );
}
