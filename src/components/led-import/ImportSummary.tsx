import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Clock,
} from 'lucide-react';
import type { ImportResult } from '@/types/led-import';

interface ImportSummaryProps {
  result: ImportResult;
  onReset: () => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

export function ImportSummary({ result, onReset }: ImportSummaryProps) {
  const hasErrors = result.errors.length > 0;
  const success = result.success && !hasErrors;

  const downloadErrorReport = () => {
    const report = result.errors
      .map(
        e =>
          `${e.timestamp.toISOString()}\t${e.sheet}\t${e.orderCode}\t${e.type}\t${e.message}\t${e.url}`
      )
      .join('\n');

    const header = 'Timestamp\tSheet\tOrder Code\tType\tMessage\tURL\n';
    const blob = new Blob([header + report], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().split('T')[0]}.tsv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card
        className={
          success
            ? 'border-[#7BA23F] bg-[#7BA23F]/5'
            : hasErrors
              ? 'border-[#F5A623] bg-[#F5A623]/5'
              : 'border-destructive bg-destructive/5'
        }
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {success ? (
              <CheckCircle className="h-12 w-12 text-[#7BA23F]" />
            ) : hasErrors ? (
              <AlertTriangle className="h-12 w-12 text-[#F5A623]" />
            ) : (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
            <div>
              <h2 className="text-xl font-semibold">
                {success
                  ? 'Import Completed Successfully'
                  : hasErrors
                    ? 'Import Completed with Errors'
                    : 'Import Cancelled'}
              </h2>
              <p className="text-muted-foreground">
                {result.imagesUploaded} images uploaded to{' '}
                {result.sheetsProcessed} sheets
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sheets Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{result.sheetsProcessed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Images Uploaded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#7BA23F]">
              {result.imagesUploaded}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${hasErrors ? 'text-destructive' : ''}`}
            >
              {result.errors.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(result.duration)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Details */}
      {hasErrors && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Failed Imports ({result.errors.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                <Download className="h-4 w-4 mr-2" />
                Download Error Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {result.errors.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm p-3 bg-destructive/5 rounded border border-destructive/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium">
                          {error.sheet} / {error.orderCode}
                        </div>
                        <div className="text-muted-foreground">
                          {error.type === 'specifications'
                            ? 'Specifications'
                            : 'Product Image'}
                          : {error.message}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                        {error.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center">
        <Button
          onClick={onReset}
          className="bg-[#3B4A6B] hover:bg-[#4B5A7B] text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Import Another File
        </Button>
      </div>
    </div>
  );
}
