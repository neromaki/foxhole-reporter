// Use Deno-compatible import for supabase-js in Edge Functions
import { createClient } from 'npm:@supabase/supabase-js'
// Workspace TypeScript may not have Deno types; declare to satisfy editor.
declare const Deno: any;

export function getServiceClient() {
  const url = Deno?.env?.get?.('SUPABASE_URL');
  const key = Deno?.env?.get?.('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { 
    auth: { persistSession: false },
    global: {
      // intercept every outgoing fetch used by the client
      fetch: async (input: RequestInfo, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.url;
        console.log('Supabase request URL:', url);
        if (init?.method) console.log('Method:', init.method);
        if (init?.body) {
          try { console.log('Request body:', JSON.parse(init.body as string)); }
          catch { console.log('Request body (raw):', init.body); }
        }
        // forward to the real fetch
        return fetch(input, init);
      }
    }
   });
}
