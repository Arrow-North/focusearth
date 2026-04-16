import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileDropZone,
  ImportPreview,
  SheetSelector,
  ImportProgress,
  ImportSummary,
} from '@/components/led-import';
import { useLedCatalogueImport } from '@/hooks/use-led-catalogue-import';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Eye,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'upload' | 'preview' | 'import';

const STEPS: { key: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'preview', label: 'Preview', icon: Eye },
  { key: 'import', label: 'Import', icon: Loader2 },
];

export default function LEDCatalogueImport() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    phase,
    parsedSheets,
    sheetSelection,
    progress,
    result,
    parseFile,
    toggleSheet,
    selectAllSheets,
    deselectAllSheets,
    startImport,
    pauseImport,
    resumeImport,
    cancelImport,
    reset,
  } = useLedCatalogueImport();

  const handleFileSelect = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      const success = await parseFile(file);
      if (success) {
        setStep('preview');
      }
    },
    [parseFile]
  );

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    reset();
    setStep('upload');
  }, [reset]);

  const handleStartImport = useCallback(async () => {
    setStep('import');
    await startImport();
  }, [startImport]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    reset();
    setStep('upload');
  }, [reset]);

  const canProceedToImport =
    Object.values(sheetSelection).some(Boolean) && phase === 'previewing';

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <DashboardLayout title="Catalogues / Import LED Catalogue" showSearch={false}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isCompleted = index < currentStepIndex;
            const isPast =
              (step === 'import' && s.key === 'upload') ||
              (step === 'import' && s.key === 'preview');

            return (
              <div key={s.key} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-[#5B6FAF] text-white'
                      : isCompleted || isPast
                        ? 'bg-[#7BA23F] text-white'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isActive &&
                        s.key === 'import' &&
                        phase === 'importing' &&
                        'animate-spin'
                    )}
                  />
                  <span className="font-medium">{s.label}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-12 h-0.5 mx-2',
                      index < currentStepIndex ? 'bg-[#7BA23F]' : 'bg-border'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        {step === 'upload' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold mb-2">
                  Upload LED Catalogue File
                </h2>
                <p className="text-muted-foreground">
                  Drop your XLSM file containing LED product data. The system
                  will extract product images and specifications and organize
                  them into a folder structure.
                </p>
              </div>
              <FileDropZone
                onFileSelect={handleFileSelect}
                isLoading={phase === 'parsing'}
                selectedFile={selectedFile}
                onClear={handleClearFile}
              />
              {phase === 'parsing' && (
                <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing file...
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 'preview' && user && (
          <div className="space-y-6">
            <ImportPreview sheets={parsedSheets} userId={user.id} />
            <SheetSelector
              sheets={parsedSheets}
              selection={sheetSelection}
              onToggle={toggleSheet}
              onSelectAll={selectAllSheets}
              onDeselectAll={deselectAllSheets}
            />
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleClearFile}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleStartImport}
                disabled={!canProceedToImport}
                className="bg-[#7BA23F] hover:bg-[#6B9235] text-white"
              >
                Start Import
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'import' && (
          <>
            {phase === 'completed' && result ? (
              <ImportSummary result={result} onReset={handleReset} />
            ) : (
              <ImportProgress
                progress={progress}
                onPause={pauseImport}
                onResume={resumeImport}
                onCancel={() => {
                  cancelImport();
                  handleReset();
                }}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
