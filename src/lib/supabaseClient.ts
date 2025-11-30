import { createClient } from '@supabase/supabase-js'
// Type declarations for cross-environment compatibility
declare const Deno: any;

// Detect runtime environment (browser vs Edge Function)
const isDeno = typeof Deno !== 'undefined';

let supabaseUrl: string | undefined;
let supabaseAnonKey: string | undefined;

if (!isDeno) {
  // Vite exposes env vars via import.meta.env
  supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
}

export const supabase = (!isDeno && supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

export function getServiceClient() {
  if (!isDeno) throw new Error('getServiceClient must run in Edge Function (Deno) environment');
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function env');
  return createClient(url, key, { auth: { persistSession: false } });
}
