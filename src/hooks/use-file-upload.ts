import { useMutation } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';
import { handleSupabaseError } from '@/lib/error';

type EntityType = 'project' | 'company' | 'invoice' | 'receipt';

interface UploadResult {
  uploadId: number;
  path: string;
}

/**
 * Hook that returns an `upload` mutation and an `isUploading` flag.
 *
 * Upload flow:
 * 1. Upload the file to Supabase Storage bucket "uploads".
 * 2. Call the `fn_create_upload` RPC to persist a record in the uploads table.
 * 3. Call `fn_associate_upload_to_<entityType>` RPC to link the upload to its parent.
 */
export function useFileUpload() {
  const supabase = useSupabase();
  const { user } = useAuth();

  const mutation = useMutation<
    UploadResult,
    Error,
    { file: File; entityType: EntityType; entityId: number }
  >({
    mutationFn: async ({ file, entityType, entityId }) => {
      if (!user) throw new Error('You must be signed in to upload files');

      // Build a unique storage path
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${entityType}/${entityId}/${timestamp}_${safeName}`;

      // 1. Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('uploads')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        throw new Error(handleSupabaseError(storageError));
      }

      // 2. Create the upload record via RPC
      const { data: uploadData, error: createError } = await supabase.rpc(
        'fn_create_upload',
        {
          p_user_id: user.id,
          p_files: storagePath,
          p_name: file.name,
          p_file_type: getFileTypeCode(file.type),
        },
      );

      if (createError) {
        throw new Error(handleSupabaseError(createError));
      }

      const uploadId = (uploadData as { id: number })?.id ?? (uploadData as number);

      // 3. Associate the upload to the entity
      const rpcName = `fn_associate_upload_to_${entityType}` as string;
      const { error: assocError } = await supabase.rpc(rpcName, {
        p_upload_id: uploadId,
        p_entity_id: entityId,
      });

      if (assocError) {
        throw new Error(handleSupabaseError(assocError));
      }

      return { uploadId: Number(uploadId), path: storagePath };
    },
  });

  return {
    upload: mutation.mutateAsync,
    isUploading: mutation.isPending,
  };
}

/**
 * Map a MIME type to a simple numeric code for the `file_type` column.
 */
function getFileTypeCode(mimeType: string): number {
  if (mimeType.startsWith('image/')) return 1;
  if (mimeType === 'application/pdf') return 2;
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType === 'text/csv'
  )
    return 3;
  if (mimeType.includes('word') || mimeType.includes('document')) return 4;
  return 0; // unknown / other
}
