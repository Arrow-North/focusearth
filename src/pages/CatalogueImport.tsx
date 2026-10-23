import { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Columns3, Eye, Loader2, Settings2, Upload } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileDropzone } from '@/components/shared/FileDropzone';
import {
  ColumnMappingStep,
  ImportConfigStep,
  ImportPreviewTable,
  ProcessingPanel,
  ResultPanel,
} from '@/components/catalogue-import';
import { useCatalogueImport } from '@/hooks/use-catalogue-import';
import { ACCEPTED_EXTENSIONS, MAX_INPUT_FILE_SIZE } from '@/lib/catalogue-import/constants';
import { cn } from '@/lib/utils';

type Step = 'configure' | 'upload' | 'map' | 'preview' | 'process';

const STEPS: { key: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'configure', label: 'Configure', icon: Settings2 },
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'map', label: 'Map Columns', icon: Columns3 },
  { key: 'preview', label: 'Preview', icon: Eye },
  { key: 'process', label: 'Process', icon: Loader2 },
];

export default function CatalogueImport() {
  const [step, setStep] = useState<Step>('configure');
  const imp = useCatalogueImport();

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);
  // Only a terminal phase may show results. Without this, the tick between
  // setStep('process') and the hook setting phase='processing' would flash an
  // empty 'completed' panel.
  const isFinished =
    imp.phase === 'completed' || imp.phase === 'cancelled' || imp.phase === 'error';

  const handleFiles = useCallback(
    async (files: File[]) => {
      const next = files[0];
      if (!next) return;
      const ok = await imp.selectFile(next);
      if (ok) setStep('map');
    },
    [imp],
  );

  const sampleRows = useMemo(
    () => imp.table?.rows.slice(0, 10) ?? [],
    [imp.table],
  );

  const mappedAny = useMemo(
    () => Object.values(imp.mapping).some((v) => v != null),
    [imp.mapping],
  );

  return (
    <DashboardLayout title="Catalogues / Import Products" showSearch={false}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center flex-wrap gap-y-2">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isDone = index < currentStepIndex;
            return (
              <div key={s.key} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm',
                    isActive
                      ? 'bg-[#5B6FAF] text-white'
                      : isDone
                        ? 'bg-[#7BA23F] text-white'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isActive && s.key === 'process' && imp.phase === 'processing' && 'animate-spin',
                    )}
                  />
                  <span className="font-medium">{s.label}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn('w-8 h-0.5 mx-1.5', isDone ? 'bg-[#7BA23F]' : 'bg-border')} />
                )}
              </div>
            );
          })}
        </div>

        {step === 'configure' && (
          <div className="space-y-6">
            <ImportConfigStep
              companyId={imp.companyId}
              companyName={imp.companyName}
              luminaireType={imp.luminaireType}
              onCompanyChange={imp.setCompany}
              onLuminaireTypeChange={imp.setLuminaireType}
            />
            <div className="flex justify-end">
              <Button
                onClick={() => setStep('upload')}
                disabled={!imp.companyId || !imp.luminaireType}
                className="bg-[#7BA23F] hover:bg-[#6B9235] text-white"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold mb-2">Upload Product File</h2>
                  <p className="text-muted-foreground">
                    CSV or Excel. Every original column is preserved; four resolved
                    columns are appended to the output.
                  </p>
                </div>
                <FileDropzone
                  onFilesSelected={handleFiles}
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  multiple={false}
                  maxSize={MAX_INPUT_FILE_SIZE}
                  isUploading={imp.phase === 'uploading' && !imp.table}
                />
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('configure')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        )}

        {step === 'map' && imp.table && (
          <div className="space-y-6">
            <ColumnMappingStep
              headers={imp.table.headers}
              mapping={imp.mapping}
              onChange={imp.setMapping}
              sheetNames={imp.sheets.map((s) => s.name)}
              sheetName={imp.table.sheetName}
              onSheetChange={(name) => imp.reparse({ sheetName: name })}
              headerRowIndex={imp.table.headerRowIndex}
              onHeaderRowChange={(i) => imp.reparse({ headerRowIndex: i })}
              sampleRows={sampleRows}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => {
                  imp.goToPreview();
                  setStep('preview');
                }}
                disabled={!mappedAny}
                className="bg-[#7BA23F] hover:bg-[#6B9235] text-white"
              >
                Preview
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && imp.table && (
          <div className="space-y-6">
            <ImportPreviewTable
              headers={imp.table.headers}
              rows={sampleRows}
              mapping={imp.mapping}
              classifications={imp.previewClassifications}
              totalRows={imp.table.totalRows}
              fillRates={imp.fillRates}
              estimatedFetches={imp.estimates.fetches}
              estimatedRepos={imp.estimates.repos}
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('map')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => {
                  setStep('process');
                  void imp.startImport();
                }}
                className="bg-[#7BA23F] hover:bg-[#6B9235] text-white"
              >
                Start Import
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'process' && (
          <>
            {isFinished ? (
              <ResultPanel
                progress={imp.progress}
                onDownloadCsv={imp.downloadOutput}
                onDownloadErrors={imp.downloadErrors}
                onReset={() => {
                  imp.reset();
                  setStep('configure');
                }}
                disambiguateHeaders={imp.disambiguateHeaders}
                onDisambiguateChange={imp.setDisambiguateHeaders}
              />
            ) : (
              <ProcessingPanel
                progress={imp.progress}
                onPause={imp.pauseImport}
                onResume={imp.resumeImport}
                onCancel={imp.cancelImport}
                onDownloadPartial={imp.downloadOutput}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
