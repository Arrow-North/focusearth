import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload, FileIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  isUploading?: boolean;
  uploadProgress?: number;
  className?: string;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = 'image/*,application/pdf';
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function FileDropzone({
  onFilesSelected,
  accept = DEFAULT_ACCEPT,
  multiple = true,
  maxSize = DEFAULT_MAX_SIZE,
  isUploading = false,
  uploadProgress,
  className,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      const acceptedTypes = accept.split(',').map((t) => t.trim());
      const validFiles: File[] = [];

      for (const file of files) {
        // Check file size
        if (file.size > maxSize) {
          setError(`File "${file.name}" exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`);
          continue;
        }

        // Check file type
        const isValidType = acceptedTypes.some((acceptType) => {
          if (acceptType === '*/*') return true;
          if (acceptType.endsWith('/*')) {
            const category = acceptType.replace('/*', '');
            return file.type.startsWith(category);
          }
          return file.type === acceptType;
        });

        if (!isValidType) {
          setError(`File "${file.name}" has an unsupported type`);
          continue;
        }

        validFiles.push(file);
      }

      return validFiles;
    },
    [accept, maxSize]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return;

      setError(null);
      const fileArray = Array.from(files);
      const validFiles = validateFiles(multiple ? fileArray : [fileArray[0]]);

      if (validFiles.length > 0) {
        setSelectedFiles(validFiles);
        onFilesSelected(validFiles);
      }
    },
    [validateFiles, multiple, onFilesSelected, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      setSelectedFiles((prev) => {
        const newFiles = prev.filter((_, i) => i !== index);
        onFilesSelected(newFiles);
        return newFiles;
      });
    },
    [onFilesSelected]
  );

  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
    setError(null);
  }, []);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragging && !disabled && 'border-primary bg-primary/5',
          !isDragging && !disabled && 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Uploading... {uploadProgress !== undefined && `${Math.round(uploadProgress)}%`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {isDragging ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              PDF, images up to {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && !isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFiles}
            >
              Clear all
            </Button>
          </div>
          <div className="space-y-1">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({Math.round(file.size / 1024)}KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
