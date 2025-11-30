// Supabase Edge Function: poll-warapi
// Fetches Foxhole WarAPI snapshot and stores territories in snapshots table.
import { getServiceClient } from '../../../src/lib/supabaseClient.ts';
// Workspace TypeScript may not have Deno types; declare to satisfy editor.
declare const Deno: any;

// Import shared WarAPI helpers to avoid duplication.
import { fetchWarState, fetchMapList, fetchDynamicMap, DynamicMapItem } from '../../../src/lib/warApi.ts';

// Owner mapping from WarAPI teamId to string.
function ownerMap(teamId: string): 'Colonial' | 'Warden' | 'Neutral' {
  switch (teamId) {
    case 'COLONIALS': return 'Colonial';
    case 'WARDENS': return 'Warden';
    default: return 'Neutral';
  }
}


Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const supabase = getServiceClient();
    const war = await fetchWarState();
    const mapList = await fetchMapList();

    // Filter out home regions which don't have public data
    const validMaps = mapList.filter(m => !m.startsWith('HomeRegion'));

    interface TerritoryItem {
      id: string;
      owner: 'Colonial' | 'Warden' | 'Neutral';
      x: number;
      y: number;
      region: string;
      iconType: number;
      flags: number;
    }

    const territories: TerritoryItem[] = [];
    
    for (const mapName of validMaps) {
      try {
        const mapData = await fetchDynamicMap(mapName);
        for (const item of mapData.mapItems as DynamicMapItem[]) {
          territories.push({
            id: `${mapName}-${item.x.toFixed(4)}-${item.y.toFixed(4)}`,
            owner: ownerMap(item.teamId),
            x: item.x,
            y: item.y,
            region: mapName,
            iconType: item.iconType,
            flags: item.flags
          });
        }
      } catch (e) {
        console.error('Map fetch failed', mapName, e);
      }
    }

    const { error } = await supabase.from('snapshots').insert({
      war_number: war.warNumber,
      day_number: 0, // Not available from /war endpoint; could fetch per-map if needed
      territories
    });
    if (error) throw error;

    return new Response(JSON.stringify({ 
      inserted: territories.length,
      maps: validMaps.length,
      warNumber: war.warNumber
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
