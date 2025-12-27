// Supabase Edge Function: diff-territory (patched - adds logging & stronger error handling)
import { getServiceClient } from '../_shared/supabaseClient.ts';
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

    // Log a masked hint about the client key / URL if available on the client object
    try {
      // best-effort extraction - getServiceClient implementation may vary
      // Avoid printing secrets: show only first 6 chars of key if present.
      // @ts-ignore
      const url = supabase?.url ?? process?.env?.SUPABASE_URL;
      // @ts-ignore
      const key = supabase?.key ?? process?.env?.SUPABASE_SERVICE_ROLE_KEY ?? process?.env?.SUPABASE_ANON_KEY;
      const keyHint = key ? `${String(key).slice(0, 6)}...` : 'no-key';
      console.log('[diff-territory] client hint:', { url, keyHint });
    } catch (e) {
      console.log('[diff-territory] client hint extraction failed', String(e));
    }

    // Get latest snapshot
    const { data: latestList, error: latestErr } = await supabase
      .from('snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    if (latestErr) {
      console.error('[diff-territory] latest snapshot query error', latestErr);
      throw latestErr;
    }
    const latest = latestList?.[0] as SnapshotRow | undefined;
    console.log('[diff-territory] latest snapshot count', latestList?.length ?? 0, 'id', latest?.id);

    if (!latest) return new Response(JSON.stringify({ message: 'No snapshots' }), { status: 200 });

    // Daily: snapshot roughly 24h ago
    const dayCut = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: dayList, error: dayErr } = await supabase
      .from('snapshots')
      .select('*')
      .lt('created_at', dayCut)
      .order('created_at', { ascending: false })
      .limit(1);
    if (dayErr) {
      console.error('[diff-territory] day snapshot query error', dayErr);
      throw dayErr;
    }
    const daySnap = dayList?.[0] as SnapshotRow | undefined;
    console.log('[diff-territory] day snapshot count', dayList?.length ?? 0, 'id', daySnap?.id, 'cut', dayCut);

    // 3 day: snapshot roughly 3 days ago
    const threeDayCut = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    const { data: threeDayList, error: threeDayCutErr } = await supabase
      .from('snapshots')
      .select('*')
      .lt('created_at', threeDayCut)
      .order('created_at', { ascending: false })
      .limit(1);
    if (threeDayCutErr) {
      console.error('[diff-territory] 3 day snapshot query error', threeDayCutErr);
      throw threeDayCutErr;
    }
    const threeDaySnap = threeDayList?.[0] as SnapshotRow | undefined;
    console.log('[diff-territory] 3 day snapshot count', threeDayList?.length ?? 0, 'id', threeDaySnap?.id, 'cut', threeDayCut);

    // Weekly: snapshot roughly 7d ago
    const weekCut = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: weekList, error: weekErr } = await supabase
      .from('snapshots')
      .select('*')
      .lt('created_at', weekCut)
      .order('created_at', { ascending: false })
      .limit(1);
    if (weekErr) {
      console.error('[diff-territory] week snapshot query error', weekErr);
      throw weekErr;
    }
    const weekSnap = weekList?.[0] as SnapshotRow | undefined;
    console.log('[diff-territory] week snapshot count', weekList?.length ?? 0, 'id', weekSnap?.id, 'cut', weekCut);

    const inserts: any[] = [];

    if (daySnap) {
      const changes = diffSnapshots(daySnap, latest);
      console.log('[diff-territory] daily changes count', changes.length);
      if (changes.length) inserts.push({ period: 'daily', changes });
    } else {
      console.log('[diff-territory] no daily snapshot to diff against');
    }

    if (threeDaySnap) {
      const changes = diffSnapshots(threeDaySnap, latest);
      console.log('[diff-territory] 3 day changes count', changes.length);
      if (changes.length) inserts.push({ period: 'threeDay', changes });
    } else {
      console.log('[diff-territory] no 3 day snapshot to diff against');
    }

    if (weekSnap) {
      const changes = diffSnapshots(weekSnap, latest);
      console.log('[diff-territory] weekly changes count', changes.length);
      if (changes.length) inserts.push({ period: 'weekly', changes });
    } else {
      console.log('[diff-territory] no weekly snapshot to diff against');
    }

    console.log('[diff-territory] inserts candidate count', inserts.length);
    if (inserts.length) {
      console.log('[diff-territory] inserts payload', JSON.stringify(inserts).slice(0, 2000)); // cap log size
      const insertRes = await supabase.from('territory_diffs').insert(inserts).select('*');
      // Log full result for diagnosis
      console.log('[diff-territory] insert result', JSON.stringify(insertRes).slice(0, 4000));
      if (insertRes.error) {
        console.error('[diff-territory] insert error', insertRes.error);
        // Fail loudly so workflows can see the error
        return new Response(JSON.stringify({ error: insertRes.error.message }), { status: 500 });
      }
      // If no data returned, treat as suspicious and fail
      if (!insertRes.data || (Array.isArray(insertRes.data) && insertRes.data.length === 0)) {
        console.error('[diff-territory] insert returned no data - suspicious', insertRes);
        return new Response(JSON.stringify({ error: 'Insert returned no data' }), { status: 500 });
      }
    } else {
      console.log('[diff-territory] nothing to insert');
    }

    return new Response(JSON.stringify({ generated: inserts.map(i => i.period) }), { status: 200 });
  } catch (err) {
    console.error('[diff-territory] uncaught error', err);
    return new Response(JSON.stringify({ error: (err as Error).message ?? String(err) }), { status: 500 });
  }
});