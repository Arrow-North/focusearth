import { supabase } from '@/lib/supabase';

export async function catalogueRequest<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('catalogue-import', { body });
  if (error) {
    if (error.name === 'FunctionsFetchError') {
      throw new Error('Could not reach the catalogue-import backend. Check your connection and ask an administrator to verify that the Edge Function is deployed to this app’s Supabase project and allows browser requests (CORS), then retry.');
    }
    let message = error.message;
    if ('context' in error && error.context instanceof Response) {
      try {
        const payload = await error.context.json();
        message = payload.error || payload.message || message;
      } catch { /* Preserve the transport error for non-JSON responses. */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}
