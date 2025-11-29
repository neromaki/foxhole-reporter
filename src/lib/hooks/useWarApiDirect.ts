import { useQuery } from '@tanstack/react-query';
import { fetchMapList, fetchDynamicMap, DynamicMapItem } from '../warApi';

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
}

function ownerMap(teamId: string): 'Colonial' | 'Warden' | 'Neutral' {
  switch (teamId) {
    case 'COLONIALS': return 'Colonial';
    case 'WARDENS': return 'Warden';
    default: return 'Neutral';
  }
}

export function useWarApiDirect() {
  return useQuery<WarApiSnapshot>({
    queryKey: ['warApiDirect'],
    queryFn: async () => {
      console.log('[useWarApiDirect] Fetching map list...');
      const mapList = await fetchMapList();
      const validMaps = mapList.filter(m => !m.startsWith('HomeRegion'));
      console.log('[useWarApiDirect] Valid maps:', validMaps);

      const territories: TerritoryItem[] = [];

      for (const mapName of validMaps) {
        try {
          console.log(`[useWarApiDirect] Fetching ${mapName}...`);
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
          console.log(`[useWarApiDirect] ${mapName}: ${mapData.mapItems.length} items`);
        } catch (e) {
          console.error(`[useWarApiDirect] Failed to fetch ${mapName}:`, e);
        }
      }

      console.log('[useWarApiDirect] Total territories:', territories.length);
      return { territories };
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000 // 5 minutes
  });
}
