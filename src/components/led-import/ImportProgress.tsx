import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  Pause,
  Play,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import type { ImportProgress as ImportProgressType } from '@/types/led-import';

interface ImportProgressProps {
  progress: ImportProgressType;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function ImportProgress({
  progress,
  onPause,
  onResume,
  onCancel,
}: ImportProgressProps) {
  const isPaused = progress.phase === 'paused';
  const isImporting = progress.phase === 'importing';

  const imageProgress =
    progress.imagesTotal > 0
      ? (progress.imagesCompleted / progress.imagesTotal) * 100
      : 0;

  const sheetProgress =
    progress.sheetsTotal > 0
      ? (progress.sheetsCompleted / progress.sheetsTotal) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Current Operation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {isImporting ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#7BA23F]" />
            ) : isPaused ? (
              <Pause className="h-5 w-5 text-[#F5A623]" />
            ) : (
              <FileSpreadsheet className="h-5 w-5" />
            )}
            {isPaused ? 'Import Paused' : 'Importing...'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="text-sm">
            {progress.currentSheet && (
              <p className="text-muted-foreground">
                Sheet:{' '}
                <span className="text-foreground font-medium">
                  {progress.currentSheet}
                </span>
              </p>
            )}
            {progress.currentOrderCode && (
              <p className="text-muted-foreground">
                Order Code:{' '}
                <span className="text-foreground font-medium">
                  {progress.currentOrderCode}
                </span>
              </p>
            )}
          </div>

          {/* Sheet Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Sheets</span>
              <span className="font-medium">
                {progress.sheetsCompleted} / {progress.sheetsTotal}
              </span>
            </div>
            <Progress value={sheetProgress} className="h-2" />
          </div>

          {/* Image Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Images</span>
              <span className="font-medium">
                {progress.imagesCompleted} / {progress.imagesTotal}
              </span>
            </div>
            <Progress value={imageProgress} className="h-3" />
          </div>

          {/* Controls */}
          <div className="flex gap-3 pt-2">
            {isPaused ? (
              <Button
                onClick={onResume}
                className="bg-[#7BA23F] hover:bg-[#6B9235] text-white"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            ) : (
              <Button
                onClick={onPause}
                variant="outline"
                className="border-[#F5A623] text-[#F5A623] hover:bg-[#F5A623]/10"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Log */}
      {progress.errors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="h-5 w-5" />
              Errors ({progress.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {progress.errors.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm p-2 bg-destructive/5 rounded border border-destructive/20"
                  >
                    <div className="font-medium text-destructive">
                      {error.sheet} / {error.orderCode}
                    </div>
                    <div className="text-muted-foreground">
                      {error.type}: {error.message}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
