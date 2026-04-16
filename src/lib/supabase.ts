import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

// Use a global singleton to prevent duplicate clients during HMR/StrictMode.
const globalKey = '__supabase_client__';

function makeClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Bypass the Web Locks API which can deadlock in dev (Vite HMR)
      // and in some browsers, causing getSession/onAuthStateChange to hang.
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => fn(),
    },
  });
}

export const supabase: ReturnType<typeof createClient<Database>> =
  (globalThis as Record<string, unknown>)[globalKey] as ReturnType<typeof createClient<Database>> ??
  ((globalThis as Record<string, unknown>)[globalKey] = makeClient());
