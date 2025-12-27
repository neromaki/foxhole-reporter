import { createClient } from "npm:@supabase/supabase-js@2.31.0";

Deno.serve(async (req: Request) => {
  // Only allow POST when invoked via cron or manual trigger
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed, use POST' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  console.log(`Running rpc('cleanup_territory_diffs')`);
  let { data, error } = await supabase
    .rpc('cleanup_territory_diffs')
  if (error) {
    console.error(`rpc('cleanup_territory_diffs') failed`);
    console.error(error)
    return new Response(JSON.stringify({ error: 'error', note: `rpc('cleanup_territory_diffs') failed`, detail: error }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  } else {
    console.log(`rpc('cleanup_territory_diffs') succeeded`);
    console.log(data)
    return new Response(JSON.stringify({ status: 'ok', note: `rpc('cleanup_territory_diffs') succeeded`, detail: data }), { headers: { 'Content-Type': 'application/json' } });
  }
});
