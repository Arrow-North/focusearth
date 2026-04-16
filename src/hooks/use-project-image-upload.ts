import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateProject } from '@/hooks/use-projects';
import { toast } from 'sonner';

const BUCKET = 'project-images';

/**
 * Hook to upload a project image to Supabase Storage and persist
 * the public URL into the project's `image` column.
 */
export function useProjectImageUpload() {
  const { user } = useAuth();
  const updateProject = useUpdateProject();
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (
    file: File,
    projectId: number
  ): Promise<string | null> => {
    if (!user) {
      toast.error('You must be signed in to upload images');
      return null;
    }

    // Validate file type client-side
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and GIF images are allowed');
      return null;
    }

    // Validate file size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10 MB');
      return null;
    }

    setIsUploading(true);

    try {
      // Build a unique path: userId/projectId/timestamp_filename
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${projectId}/${timestamp}_${safeName}`;

      // Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        throw new Error(storageError.message);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // Update the project's image column
      await updateProject.mutateAsync({
        projectId,
        fields: { image: publicUrl },
      });

      toast.success('Project image uploaded');
      return publicUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(`Image upload failed: ${message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
}
