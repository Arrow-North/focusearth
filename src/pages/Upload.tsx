import { useState, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Search, CloudDownload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';

interface UploadedFile {
  id: string;
  name: string;
  date: string;
  objectUrl: string;
}

export default function Upload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const today = formatDate(new Date().toISOString());
    const next: UploadedFile[] = Array.from(incoming).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      date: today,
      objectUrl: URL.createObjectURL(f),
    }));
    setFiles((prev) => [...prev, ...next]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDownload = (file: UploadedFile) => {
    const a = document.createElement('a');
    a.href = file.objectUrl;
    a.download = file.name;
    a.click();
  };

  return (
    <DashboardLayout title="Upload" showSearch={false} mainClassName="bg-[#f5f5f5] py-[2rem] px-[4rem] border-x border-[#DBDADA]">
      <div>
        {/* Header row */}
        <div className="flex items-center justify-between gap-6">
          <p className="text-m text-muted-foreground max-w-lg">
            Upload pertinent project files by dragging them into the designated area (below) or browse
            your device (blue button). Whether it's a reflected ceiling plan or insurance requirements
            - more information allows us to make more accurate recommendations.
          </p>
          <Button
            className="shrink-0 bg-[#2C628D] hover:bg-[#245278] text-white gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <Search className="h-4 w-4" />
            Browse Files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 mt-[4rem] border-dashed rounded-lg flex flex-col items-center justify-center py-14 cursor-pointer transition-colors",
            dragging
              ? "border-[#2C628D] bg-blue-50"
              : "border-muted-foreground/30 bg-white hover:border-[#2C628D]"
          )}
        >
          <svg className="h-10 w-10 text-muted-foreground mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v14M6 8l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="4" y1="16" x2="20" y2="16" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">Drag + Drop</span> Files to Upload
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div>
            <div className="grid grid-cols-[1fr_160px_140px] px-4 pb-2 text-sm font-semibold text-foreground">
              <span>Uploaded Files</span>
              <span>Date</span>
              <span />
            </div>
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="grid grid-cols-[1fr_160px_140px] items-center bg-white rounded-xl shadow-sm px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground select-none text-xs leading-none">⠿</span>
                    <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{file.date}</span>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="bg-[#2C628D] hover:bg-[#245278] text-white gap-2"
                      onClick={() => handleDownload(file)}
                    >
                      <CloudDownload className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

