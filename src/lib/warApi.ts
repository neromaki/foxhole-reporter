// Shared WarAPI helpers used by both client and Supabase Edge Functions.
// Keep this lightweight (only fetch + typing) so it can be imported in Deno runtime.
export const WAR_API_BASE = 'https://war-service-live.foxholeservices.com/api';

// Simple in-memory cache with ETag support and request de-duplication
type CacheEntry<T> = { etag?: string; expiresAt?: number; data?: T };
const responseCache = new Map<string, CacheEntry<any>>();
const inflight = new Map<string, Promise<any>>();

function cacheKey(url: string) {
  return url;
}

// Browser storage helpers for persistence across reloads
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function storageKey(key: string): string {
  return `warapi:${key}`;
}

function readFromStorage<T>(key: string): CacheEntry<T> | undefined {
  if (!isBrowser()) return undefined;
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeToStorage<T>(key: string, entry: CacheEntry<T>): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Ignore quota or serialization errors
  }
}

function parseMaxAge(cacheControl: string | null): number | undefined {
  if (!cacheControl) return undefined;
  const m = /max-age=(\d+)/i.exec(cacheControl);
  if (m) return parseInt(m[1], 10);
  return undefined;
}

async function fetchJsonWithCache<T>(url: string): Promise<T> {
  const key = cacheKey(url);
  let cached = responseCache.get(key) as CacheEntry<T> | undefined;
  if (!cached) {
    const stored = readFromStorage<T>(key);
    if (stored) {
      cached = stored;
      responseCache.set(key, stored);
    }
  }

  // If cache is fresh, return it without a request
  if (cached?.data !== undefined && cached.expiresAt && Date.now() < cached.expiresAt) {
    return cached.data as T;
  }

  if (inflight.has(key)) {
    return inflight.get(key)!;
  }

  const headers: Record<string, string> = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  const p = (async () => {
    const res = await fetch(url, { headers });

    if (res.status === 304) {
      if (cached?.data !== undefined) return cached.data as T;
      throw new Error(`304 received but no cached data for ${url}`);
    }

    if (!res.ok) {
      // On failure, return cached data if available as a soft fallback
      if (cached?.data !== undefined) return cached.data as T;
      throw new Error(`Request failed ${res.status} for ${url}`);
    }

    const etag = res.headers.get('ETag') || res.headers.get('etag') || undefined;
    const cc = res.headers.get('Cache-Control');
    const maxAge = parseMaxAge(cc);
    const data = (await res.json()) as T;

    const updated: CacheEntry<T> = {
      etag,
      data,
      expiresAt: typeof maxAge === 'number' ? Date.now() + maxAge * 1000 : undefined,
    };
    responseCache.set(key, updated);
    writeToStorage<T>(key, updated);
    return data;
  })()
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

// War state (global) endpoint.
export interface WarState {
  warId: string;
  warNumber: number;
  winner: string;
  conquestStartTime: number | null;
  conquestEndTime: number | null;
  requiredVictoryTowns?: number;
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

export interface WarReport {
  region: string;
  totalEnlistments: number;
  colonialCasualties: number;
  wardenCasualties: number;
  dayOfWar: number;
  version: number;
}

export async function fetchWarState(): Promise<WarState> {
  const url = `${WAR_API_BASE}/worldconquest/war`;
  return fetchJsonWithCache<WarState>(url);
}

export async function fetchMapList(): Promise<string[]> {
  const url = `${WAR_API_BASE}/worldconquest/maps`;
  return fetchJsonWithCache<string[]>(url);
}

export async function fetchDynamicMap(mapName: string): Promise<DynamicMapData> {
  const url = `${WAR_API_BASE}/worldconquest/maps/${mapName}/dynamic/public`;
  return fetchJsonWithCache<DynamicMapData>(url);
}

export async function fetchStaticMap(mapName: string): Promise<StaticMapData> {
  const url = `${WAR_API_BASE}/worldconquest/maps/${mapName}/static`;
  return fetchJsonWithCache<StaticMapData>(url);
}

export async function fetchWarReport(mapName: string): Promise<WarReport> {
  const url = `${WAR_API_BASE}/worldconquest/warReport/${mapName}`;
  return fetchJsonWithCache<WarReport>(url);
}