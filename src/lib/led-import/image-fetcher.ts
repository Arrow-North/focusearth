import { supabase } from '@/lib/supabase';
import { LED_BUCKET, getExtensionFromUrl, DEFAULT_IMPORT_CONFIG } from './constants';
import type { ImportError } from '@/types/led-import';

interface FetchResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

/**
 * Fetch an external image with retry logic
 */
export async function fetchExternalImage(
  url: string,
  retryAttempts = DEFAULT_IMPORT_CONFIG.retryAttempts,
  retryDelay = DEFAULT_IMPORT_CONFIG.retryDelay
): Promise<FetchResult> {
  let lastError: string = 'Unknown error';

  for (let attempt = 0; attempt < retryAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      });

      if (response.status === 429) {
        // Rate limited - exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      if (response.status === 404 || response.status === 403) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      if (!response.ok) {
        lastError = `HTTP ${response.status}: ${response.statusText}`;
        if (attempt < retryAttempts - 1) {
          await sleep(retryDelay);
          continue;
        }
        return { success: false, error: lastError };
      }

      const blob = await response.blob();
      return { success: true, blob };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('CORS')) {
        return {
          success: false,
          error: 'CORS blocked - external URL not accessible',
        };
      }

      lastError = error instanceof Error ? error.message : 'Network error';

      // Retry on network timeout
      if (attempt < retryAttempts - 1) {
        await sleep(retryDelay);
        continue;
      }
    }
  }

  return { success: false, error: lastError };
}

/**
 * Upload a blob to Supabase Storage
 */
export async function uploadToStorage(
  blob: Blob,
  path: string,
  contentType?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { error: uploadError } = await supabase.storage
      .from(LED_BUCKET)
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType || blob.type,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from(LED_BUCKET)
      .getPublicUrl(path);

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Fetch and upload an image from a URL
 */
export async function fetchAndUploadImage(
  url: string,
  storagePath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  // Fetch the image
  const fetchResult = await fetchExternalImage(url);

  if (!fetchResult.success || !fetchResult.blob) {
    return { success: false, error: fetchResult.error };
  }

  // Upload to storage
  return uploadToStorage(fetchResult.blob, storagePath);
}

/**
 * Build the storage path for an image
 */
export function buildStoragePath(
  userId: string,
  sheetName: string,
  orderCode: string,
  imageType: 'specifications' | 'product-image',
  url: string
): string {
  const ext = getExtensionFromUrl(url);
  const safeOrderCode = orderCode.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeSheetName = sheetName.replace(/[^a-zA-Z0-9._-]/g, '_');

  return `${userId}/${safeSheetName}/${safeOrderCode}/${imageType}${ext}`;
}

/**
 * Create an import error object
 */
export function createImportError(
  orderCode: string,
  sheet: string,
  type: 'specifications' | 'product-image',
  url: string,
  message: string
): ImportError {
  return {
    orderCode,
    sheet,
    type,
    url,
    message,
    timestamp: new Date(),
  };
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process a batch of images with concurrency control
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  let completed = 0;

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    completed += batch.length;
    onProgress?.(completed, items.length);
  }

  return results;
}
