// Shared WarAPI helpers used by both client and Supabase Edge Functions.
// Keep this lightweight (only fetch + typing) so it can be imported in Deno runtime.
export const WAR_API_BASE = 'https://war-service-live.foxholeservices.com/api';

// War state (global) endpoint.
export interface WarState {
  warId: string;
  warNumber: number;
  winner: string;
  conquestStartTime: number | null;
  conquestEndTime: number | null;
}

// Dynamic map items (bases / structures with ownership info)
export interface DynamicMapItem {
  teamId: 'NONE' | 'WARDENS' | 'COLONIALS';
  iconType: number;
  x: number; // normalized [0-1]
  y: number; // normalized [0-1]
  flags: number;
}

export interface DynamicMapTextItem {
  text: string;
  x: number;
  y: number;
  mapMarkerType: string;
}

export interface DynamicMapData {
  regionId: number;
  scorchedVictoryTowns: number;
  mapItems: DynamicMapItem[];
  mapTextItems: DynamicMapTextItem[];
  lastUpdated: number;
  version: number;
}

// Static map data (resource nodes, labels, facilities without ownership changes)
export interface StaticMapItem {
  teamId?: 'NONE' | 'WARDENS' | 'COLONIALS';
  iconType?: number;
  x: number;
  y: number;
  flags?: number;
}

export interface StaticMapTextItem {
  text: string;
  x: number;
  y: number;
  mapMarkerType: 'Major' | 'Minor';
}

export interface StaticMapData {
  regionId: number;
  scorchedVictoryTowns: number;
  mapItems: StaticMapItem[];
  mapTextItems: StaticMapTextItem[];
  lastUpdated: number;
  version: number;
}

export async function fetchWarState(): Promise<WarState> {
  const res = await fetch(`${WAR_API_BASE}/worldconquest/war`);
  if (!res.ok) throw new Error('War state fetch failed');
  return res.json();
}

export async function fetchMapList(): Promise<string[]> {
  const res = await fetch(`${WAR_API_BASE}/worldconquest/maps`);
  if (!res.ok) throw new Error('Map list fetch failed');
  return res.json();
}

export async function fetchDynamicMap(mapName: string): Promise<DynamicMapData> {
  const res = await fetch(`${WAR_API_BASE}/worldconquest/maps/${mapName}/dynamic/public`);
  if (!res.ok) throw new Error(`Dynamic map fetch failed for ${mapName}`);
  return res.json();
}

export async function fetchStaticMap(mapName: string): Promise<StaticMapData> {
  const res = await fetch(`${WAR_API_BASE}/worldconquest/maps/${mapName}/static`);
  if (!res.ok) throw new Error(`Static map fetch failed for ${mapName}`);
  return res.json();
}
