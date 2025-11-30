// Supabase Edge Function: diff-territory
// Computes territory ownership changes daily & weekly.
import { getServiceClient } from '../../../src/lib/supabaseClient.ts';
// Workspace TypeScript may not have Deno types; declare to satisfy editor.
declare const Deno: any;

interface SnapshotRow {
  id: string;
  created_at: string;
  territories: { id: string; owner: string; x: number; y: number; region: string }[];
}

function diffSnapshots(a: SnapshotRow, b: SnapshotRow) {
  const mapA = new Map(a.territories.map(t => [t.id, t]));
  const mapB = new Map(b.territories.map(t => [t.id, t]));
  const changes: any[] = [];
  for (const [id, tileB] of mapB.entries()) {
    const prev = mapA.get(id);
    if (prev && prev.owner !== tileB.owner) {
      changes.push({ id, previousOwner: prev.owner, newOwner: tileB.owner, changed_at_snapshot: b.id });
    }
  }
  return changes;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const supabase = getServiceClient();

    // Get latest snapshot
    const { data: latestList, error: latestErr } = await supabase
      .from('snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    if (latestErr) throw latestErr;
    const latest = latestList?.[0] as SnapshotRow | undefined;
    if (!latest) return new Response(JSON.stringify({ message: 'No snapshots' }), { status: 200 });

    // Daily: snapshot roughly 24h ago
    const { data: dayList, error: dayErr } = await supabase
      .from('snapshots')
      .select('*')
      .lt('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    if (dayErr) throw dayErr;
    const daySnap = dayList?.[0] as SnapshotRow | undefined;

    // Weekly: snapshot roughly 7d ago
    const { data: weekList, error: weekErr } = await supabase
      .from('snapshots')
      .select('*')
      .lt('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    if (weekErr) throw weekErr;
    const weekSnap = weekList?.[0] as SnapshotRow | undefined;

    const inserts: any[] = [];

    if (daySnap) {
      const changes = diffSnapshots(daySnap, latest);
      if (changes.length) inserts.push({ period: 'daily', changes });
    }
    if (weekSnap) {
      const changes = diffSnapshots(weekSnap, latest);
      if (changes.length) inserts.push({ period: 'weekly', changes });
    }

    if (inserts.length) {
      const { error: insErr } = await supabase.from('territory_diffs').insert(inserts);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ generated: inserts.map(i => i.period) }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
