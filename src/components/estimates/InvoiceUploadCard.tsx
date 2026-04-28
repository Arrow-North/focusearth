import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileDropzone } from '@/components/shared/FileDropzone';
import { FileText, Download, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useInvoiceFiles, useDeleteInvoiceFile } from '@/hooks/use-estimates';
import { useFileUpload } from '@/hooks/use-file-upload';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface InvoiceUploadCardProps {
  estimateId: number;
  canUpload?: boolean;
}

interface InvoiceFile {
  id: number;
  files: string;
  name: string;
  created_at: string | null;
}

export function InvoiceUploadCard({ estimateId, canUpload = true }: InvoiceUploadCardProps) {
  const { data: files, isLoading, refetch } = useInvoiceFiles(estimateId);
  const deleteMutation = useDeleteInvoiceFile();
  const { upload, isUploading } = useFileUpload();
  const [deleteTarget, setDeleteTarget] = useState<InvoiceFile | null>(null);

  const handleFilesSelected = async (selectedFiles: File[]) => {
    for (const file of selectedFiles) {
      try {
        await upload({ file, entityType: 'invoice', entityId: estimateId });
        refetch();
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync({
        fileId: deleteTarget.id,
        storagePath: deleteTarget.files,
      });
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
    setDeleteTarget(null);
  };

  const handleDownload = async (file: InvoiceFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('uploads')
        .download(file.files);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const invoiceFiles = (files as InvoiceFile[] | undefined) ?? [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoice Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : invoiceFiles.length > 0 ? (
            <div className="space-y-2">
              {invoiceFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-md border border-border bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      {file.created_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canUpload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(file)}
                        disabled={deleteMutation.isPending}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No invoice files uploaded yet.
            </p>
          )}

          {/* Upload area */}
          {canUpload && (
            <FileDropzone
              onFilesSelected={handleFilesSelected}
              accept="application/pdf,image/*"
              isUploading={isUploading}
              disabled={isUploading}
            />
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
