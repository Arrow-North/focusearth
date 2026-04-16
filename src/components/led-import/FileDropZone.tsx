import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  selectedFile?: File | null;
  onClear?: () => void;
}

export function FileDropZone({
  onFileSelect,
  isLoading = false,
  selectedFile = null,
  onClear,
}: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const xlsFile = files.find(
        f =>
          f.name.endsWith('.xlsm') ||
          f.name.endsWith('.xlsx') ||
          f.name.endsWith('.xls')
      );

      if (xlsFile) {
        onFileSelect(xlsFile);
      }
    },
    [onFileSelect]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [onFileSelect]
  );

  if (selectedFile) {
    return (
      <div className="border-2 border-dashed border-[#7BA23F] rounded-lg p-8 bg-[#7BA23F]/5">
        <div className="flex items-center justify-center gap-4">
          <FileSpreadsheet className="h-12 w-12 text-[#7BA23F]" />
          <div className="flex-1">
            <p className="font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              disabled={isLoading}
            >
              <X className="h-5 w-5 text-muted-foreground hover:text-destructive" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-16 text-center transition-colors',
        dragOver ? 'border-primary bg-primary/5' : 'border-border',
        isLoading && 'opacity-50 pointer-events-none'
      )}
      onDragOver={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <Upload className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
      <p className="text-lg font-medium text-foreground mb-2">
        Drop your XLSM file here
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        or click to browse for a file
      </p>
      <label>
        <input
          type="file"
          accept=".xlsm,.xlsx,.xls"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isLoading}
        />
        <Button
          type="button"
          className="bg-[#3B4A6B] hover:bg-[#4B5A7B] text-white"
          disabled={isLoading}
          asChild
        >
          <span>Browse Files</span>
        </Button>
      </label>
    </div>
  );
}
