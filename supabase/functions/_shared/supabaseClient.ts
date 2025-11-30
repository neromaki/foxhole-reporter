// Use Deno-compatible import for supabase-js in Edge Functions
import { createClient } from '@supabase/supabase-js'
// Workspace TypeScript may not have Deno types; declare to satisfy editor.
declare const Deno: any;

export function getServiceClient() {
  const url = Deno?.env?.get?.('SUPABASE_URL');
  const key = Deno?.env?.get?.('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}
