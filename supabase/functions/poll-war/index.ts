// Supabase Edge Function: poll-war
// Fetches the current war state from WarAPI and upserts it into the public.wars table.
interface WarApiResponse {
  warId: string;
  warNumber: number;
  winner?: string | null;
  conquestStartTime: number | null;
  conquestEndTime: number | null;
  resistanceStartTime?: number | null;
  scheduledConquestEndTime?: number | null;
  requiredVictoryTowns?: number | null;
  shortRequiredVictoryTowns?: number | null;
}

interface Env {
  supabaseUrl: string;
  serviceKey: string;
}

function requireEnv(): Env {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return { supabaseUrl, serviceKey };
}

async function fetchWarState(): Promise<WarApiResponse> {
  const res = await fetch('https://war-service-live.foxholeservices.com/api/worldconquest/war');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WarAPI request failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<WarApiResponse>;
}

function toIso(timestamp: number | null | undefined): string | null {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) return null;

  // WarAPI timestamps are epoch values; cast to UTC ISO string for timestamptz columns.
  // Accept both second- and millisecond-precision epochs.
  const millis = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  return new Date(millis).toISOString();
}

function buildWarRow(api: WarApiResponse) {
  return {
    warId: api.warId,
    warNumber: api.warNumber ?? null,
    winner: api.winner ?? null,
    conquestStartTime: toIso(api.conquestStartTime),
    conquestEndTime: toIso(api.conquestEndTime),
    resistanceStartTime: toIso(api.resistanceStartTime),
    scheduledConquestEndTime: toIso(api.scheduledConquestEndTime),
    requiredVictoryTowns: api.requiredVictoryTowns ?? 0,
    shortRequiredVictoryTowns: api.shortRequiredVictoryTowns ?? 0,
  };
}

async function upsertWarRow(row: ReturnType<typeof buildWarRow>, env: Env) {
  const url = `${env.supabaseUrl}/rest/v1/wars?on_conflict=warId`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.serviceKey,
      Authorization: `Bearer ${env.serviceKey}`,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([row]),
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(`Supabase upsert failed: ${res.status} ${text}`);
  }

  return Array.isArray(body) ? body[0] : body;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const env = requireEnv();
    const war = await fetchWarState();
    const row = buildWarRow(war);
    const saved = await upsertWarRow(row, env);

    return new Response(JSON.stringify({ upsertedWarId: row.warId, data: saved }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
