import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useContactSubmissions } from '@/hooks/use-contact-submissions';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Upload, Database, FileUp, CheckCircle, X, ArrowLeft, Inbox } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { userType } = useAuth();
  const {
    data: contactSubmissions,
    isLoading: contactSubmissionsLoading,
    error: contactSubmissionsError,
  } = useContactSubmissions();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Redirect non-superadmins
  if (userType !== 'SUPERADMIN') {
    navigate('/');
    return null;
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      // Upload file to Supabase storage
      const timestamp = Date.now();
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `admin-uploads/${timestamp}_${safeName}`;

      const { error: storageError } = await supabase.storage
        .from('admin-files')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        // If bucket doesn't exist, try project-images bucket as fallback
        const { error: fallbackError } = await supabase.storage
          .from('project-images')
          .upload(`admin/${storagePath}`, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (fallbackError) {
          throw new Error(fallbackError.message);
        }
      }

      setUploadComplete(true);
      toast.success('File uploaded successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(`Upload failed: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadComplete(false);
  };

  const closeModal = () => {
    setUploadModalOpen(false);
    setSelectedFile(null);
    setUploadComplete(false);
  };

  const headerActions = (
    <Button
      variant="outline"
      onClick={() => navigate('/')}
      className="text-gray-600"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back to Dashboard
    </Button>
  );

  return (
    <DashboardLayout title="Admin Dashboard" showSearch={false} actions={headerActions}>
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Welcome to the Admin Dashboard. Use the tools below to manage system data.
        </p>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Database Upload Card */}
          <div
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => setUploadModalOpen(true)}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                <Database className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Database Upload</h3>
                <p className="text-sm text-muted-foreground">Import data files</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Upload CSV, JSON, or Excel files to import data directly into the database.
            </p>
            <div className="mt-4 flex items-center text-pink-600 text-sm font-medium">
              <Upload className="h-4 w-4 mr-1" />
              Click to upload
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Contact Submissions</h2>
              <p className="text-sm text-muted-foreground">
                Form submissions from real estate and supplier users
              </p>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {contactSubmissions?.total_count ?? 0}
            </div>
          </div>

          {contactSubmissionsLoading && (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          )}

          {contactSubmissionsError && (
            <p className="p-6 text-sm text-destructive">
              Failed to load contact submissions: {(contactSubmissionsError as Error).message}
            </p>
          )}

          {!contactSubmissionsLoading && !contactSubmissionsError && contactSubmissions?.rows.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-muted-foreground">
              <Inbox className="mb-3 h-10 w-10" />
              <p>No contact submissions yet.</p>
            </div>
          )}

          {!contactSubmissionsLoading && !contactSubmissionsError && !!contactSubmissions?.rows.length && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Submitted</th>
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Company</th>
                    <th className="px-6 py-3 font-medium">Subject</th>
                    <th className="px-6 py-3 font-medium">Assigned To</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contactSubmissions.rows.map((submission) => {
                    const submitterType = submission.submitter?.type ?? 'User';
                    const assigneeName = submission.assignee
                      ? [submission.assignee.first_name, submission.assignee.last_name].filter(Boolean).join(' ')
                      : '';

                    return (
                      <tr key={submission.id} className="align-top">
                        <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                          {new Date(submission.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{submission.name}</div>
                          <div className="text-muted-foreground">{submission.email}</div>
                          <div className="text-muted-foreground">{submission.phone}</div>
                          <div className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {submitterType}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {submission.company_name || '-'}
                        </td>
                        <td className="min-w-[16rem] px-6 py-4">
                          <div className="font-medium text-gray-900">{submission.subject}</div>
                          <p className="mt-1 max-w-md whitespace-pre-wrap text-muted-foreground">
                            {submission.message}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {assigneeName || submission.assignee?.email || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-medium capitalize text-amber-700">
                            {submission.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="bg-pink-500 px-6 py-4">
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Upload
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {uploadComplete ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Complete!</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Your file has been uploaded successfully.
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={resetUpload}>
                    Upload Another
                  </Button>
                  <Button onClick={closeModal} className="bg-pink-500 hover:bg-pink-600 text-white">
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Drop your data file below or click to browse. Supported formats: CSV, JSON, Excel (.xlsx).
                </p>

                {/* Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver
                      ? 'border-pink-500 bg-pink-50'
                      : selectedFile
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto">
                        <FileUp className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        className="hidden"
                        accept=".csv,.json,.xlsx,.xls"
                        onChange={handleFileSelect}
                      />
                      <div className="space-y-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto">
                          <Upload className="h-6 w-6 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Drop your file here, or <span className="text-pink-600">browse</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            CSV, JSON, or Excel files up to 10MB
                          </p>
                        </div>
                      </div>
                    </label>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload to Database
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
