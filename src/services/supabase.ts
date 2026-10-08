import { createClient } from '@supabase/supabase-js';

// Supabase Connection Credentials (Public Anon/Publishable Key only — No Service Role key)
export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://nqwgxkdpwpgqkezaqsrx.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  'sb_publishable_fxLPfAbQ8EL8HM5-NS_lqQ_0AMzCWCY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Health check helper to test Supabase connection and measure API round-trip latency
 */
export async function checkSupabaseConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  try {
    const { error } = await supabase.from('shops').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);
    if (error) {
      return { ok: false, latencyMs, error: error.message };
    }
    return { ok: true, latencyMs };
  } catch (err: any) {
    return { ok: false, latencyMs: Math.round(performance.now() - start), error: err?.message || 'Unknown network error' };
  }
}
