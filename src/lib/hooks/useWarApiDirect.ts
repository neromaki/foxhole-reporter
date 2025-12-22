import { useQuery } from '@tanstack/react-query';
import { fetchMapList, fetchDynamicMap, fetchWarReport, DynamicMapItem, WarReport } from '../warApi';
import { DEBUG_MODE } from '../appConfig';

interface TerritoryItem {
  id: string;
  owner: 'Colonial' | 'Warden' | 'Neutral';
  x: number;
  y: number;
  region: string;
  iconType: number;
  flags: number;
}

interface WarApiSnapshot {
  territories: TerritoryItem[];
  reports: WarReport[];
  fetchedAt: number;
}

function ownerMap(teamId: string): 'Colonial' | 'Warden' | 'Neutral' {
  switch (teamId) {
    case 'COLONIALS': return 'Colonial';
    case 'WARDENS': return 'Warden';
    default: return 'Neutral';
  }
}

export function useWarApiDirect(options?: { enabled?: boolean }) {
  return useQuery<WarApiSnapshot>({
    queryKey: ['warApiDirect'],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      DEBUG_MODE ?? console.log('[useWarApiDirect] Fetching map list...');
      const mapList = await fetchMapList();
      const validMaps = mapList.filter(m => !m.startsWith('HomeRegion'));
      DEBUG_MODE ?? console.log('[useWarApiDirect] Valid maps:', validMaps);

      const territories: TerritoryItem[] = [];
  const reports: WarReport[] = [];
  const fetchedAt = Date.now();

      for (const mapName of validMaps) {
        try {
          DEBUG_MODE ?? console.log(`[useWarApiDirect] Fetching ${mapName}...`);
          const mapData = await fetchDynamicMap(mapName);
          const report = await fetchWarReport(mapName);
          reports.push({ ...report, region: mapName });
          
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
          DEBUG_MODE ?? console.log(`[useWarApiDirect] ${mapName}: ${mapData.mapItems.length} items`);
        } catch (e) {
          console.error(`[useWarApiDirect] Failed to fetch ${mapName}:`, e);
        }
      }

      DEBUG_MODE ?? console.log('[useWarApiDirect] Total territories:', territories.length);
      DEBUG_MODE ?? console.log('[useWarApiDirect] Total reports:', reports.length);
      return { territories, reports, fetchedAt };
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000 // 5 minutes
  });
}
