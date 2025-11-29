import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import type { Snapshot, TerritoryDiff } from '../types/war';

export function useLatestSnapshot() {
  return useQuery<Snapshot | null>({
    queryKey: ['latestSnapshot'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Snapshot | null;
    }
  });
}

export function useTerritoryDiff(period: 'daily' | 'weekly') {
  return useQuery<TerritoryDiff | null>({
    queryKey: ['territoryDiff', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('territory_diffs')
        .select('*')
        .eq('period', period)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TerritoryDiff | null;
    }
  });
}
