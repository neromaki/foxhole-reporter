import { useQuery } from '@tanstack/react-query';
import { fetchMapList, fetchStaticMap, StaticMapData } from '../warApi';

export interface CombinedStaticEntry {
  mapName: string;
  data: StaticMapData;
}

export function useStaticMaps(enabled: boolean) {
  return useQuery<CombinedStaticEntry[]>({
    queryKey: ['staticMaps'],
    enabled,
    queryFn: async () => {
      const maps = await fetchMapList();
      const valid = maps.filter(m => !m.startsWith('HomeRegion'));
      const results: CombinedStaticEntry[] = [];
      for (const name of valid) {
        try {
          const data = await fetchStaticMap(name);
          results.push({ mapName: name, data });
        } catch (e) {
          console.warn('Static map failed', name, e);
        }
      }
      return results;
    },
    staleTime: 1000 * 60 * 30 // static data rarely changes
  });
}
