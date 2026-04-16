import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateProduct } from '@/hooks/use-products';
import { toast } from 'sonner';
import type { ProductDetails } from '@/types/database';

const BUCKET = 'product-images';

/**
 * Hook to upload a product image to Supabase Storage and persist
 * the public URL into the product's `details.productImage` field.
 */
export function useProductImageUpload() {
  const { user } = useAuth();
  const updateProduct = useUpdateProduct();
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (
    file: File,
    productId: number,
    currentDetails: ProductDetails
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
      // Build a unique path: userId/productId/timestamp_filename
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${user.id}/${productId}/${timestamp}_${safeName}`;

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

      // Update the product's details.productImage
      await updateProduct.mutateAsync({
        productId,
        fields: {
          details: {
            ...currentDetails,
            productImage: publicUrl,
          },
        },
      });

      toast.success('Product image uploaded');
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
