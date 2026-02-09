// Supabase Edge Function: poll-warapi
// Fetches Foxhole WarAPI snapshot and stores territories in snapshots table.

// Workspace TypeScript may not have Deno types; declare to satisfy editor.
declare const Deno: any;

// ============================================================================
// Supabase Client
// ============================================================================

function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return {
    from: (table: string) => ({
      insert: async (data: any) => {
        const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const text = await response.text();
          return { error: new Error(`Insert failed: ${response.status} ${text}`) };
        }
        return { error: null, data: await response.json() };
      },
    }),
  };
}

// ============================================================================
// WarAPI Types
// ============================================================================

export interface WarState {
  warId: string;
  warNumber: number;
  winner: string;
  conquestStartTime: number;
  conquestEndTime: number | null;
  requiredVictoryTowns: number;
  shortRequiredVictoryTowns: number;
}

export interface DynamicMapItem {
  teamId: 'NONE' | 'WARDENS' | 'COLONIALS';
  iconType: number;
  x: number; // normalized [0-1]
  y: number; // normalized [0-1]
  flags: number;
}

export interface DynamicMapData {
  regionId: number;
  scorchedVictoryTowns: number;
  mapItems: DynamicMapItem[];
  mapTextItems: any[];
  lastUpdated: number;
  version: number;
}

export interface WarReport {
  region: string;
  totalEnlistments: number;
  colonialCasualties: number;
  wardenCasualties: number;
  dayOfWar: number;
  version: number;
}

// ============================================================================
// WarAPI Fetch Functions
// ============================================================================

enum WarAPIEndpoint {
  Live1 = 'https://war-service-live.foxholeservices.com/api',
  Live2 = 'https://war-service-live-2.foxholeservices.com/api',
  Live3 = 'https://war-service-live-3.foxholeservices.com/api',
  Dev = 'https://war-service-dev.foxholeservices.com/api'
}

export const WAR_API_BASE = WarAPIEndpoint.Live1;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status} ${url}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchWarState(): Promise<WarState> {
  const url = `${WAR_API_BASE}/worldconquest/war`;
  return fetchJson<WarState>(url);
}

export async function fetchMapList(): Promise<string[]> {
  const url = `${WAR_API_BASE}/worldconquest/maps`;
  return fetchJson<string[]>(url);
}

export async function fetchDynamicMap(mapName: string): Promise<DynamicMapData> {
  const url = `${WAR_API_BASE}/worldconquest/maps/${mapName}/dynamic/public`;
  return fetchJson<DynamicMapData>(url);
}

export async function fetchWarReport(mapName: string): Promise<WarReport> {
  const url = `${WAR_API_BASE}/worldconquest/warReport/${mapName}`;
  return fetchJson<WarReport>(url);
}

// ============================================================================
// Owner Mapping
// ============================================================================

function ownerMap(teamId: string): 'Colonial' | 'Warden' | 'Neutral' {
  switch (teamId) {
    case 'COLONIALS': return 'Colonial';
    case 'WARDENS': return 'Warden';
    default: return 'Neutral';
  }
}

// ============================================================================
// Main Edge Function
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const supabase = getServiceClient();
    const war = await fetchWarState();

    // If the current war has ended and we're in Resistance Mode, don't get data.
    if(war.conquestEndTime != null) {
      console.log(`Current war (${war.warNumber}) ended at ${war.conquestEndTime} and is in Resistance Mode.`);
      return new Response(JSON.stringify({ message: 'War in Resistance Mode' }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

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
    const reports: WarReport[] = [];
    let dayOfWar = 0;
    
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

    for(const mapName of validMaps) {
      try {
        const report = await fetchWarReport(mapName);
          reports.push({
            region: mapName,
            totalEnlistments: report.totalEnlistments,
            colonialCasualties: report.colonialCasualties,
            wardenCasualties: report.wardenCasualties,
            dayOfWar: report.dayOfWar,
            version: report.version
          });
          if(dayOfWar == 0) dayOfWar = report.dayOfWar;
      } catch (e) {
        console.error('War report failed', mapName, e);
      }
    }

    const { error } = await supabase.from('snapshots').insert({
      war_number: war.warNumber,
      day_number: dayOfWar, // Not available from /war endpoint; could fetch per-map if needed
      territories,
      reports
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
