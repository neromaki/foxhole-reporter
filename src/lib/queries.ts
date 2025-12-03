import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import type { Snapshot, TerritoryDiff, War } from '../types/war';

export function useLatestSnapshot(options?: { enabled?: boolean }) {
  console.log('[Queries] useLatestSnapshot called with options:', options);
  return useQuery<Snapshot | null>({
    queryKey: ['latestSnapshot'],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      if (!supabase) {
        console.warn('[Queries] Supabase client not initialized');
        return null;
      }
      console.log('[Queries] Fetching latest snapshot from supabase');
      try {
        const { data, error } = await supabase
          .from('snapshots')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) {
          console.error('[Queries] Snapshot fetch error:', error);
          throw error;
        }
        console.log('[Queries] Latest snapshot fetched:', data);
        return data as unknown as Snapshot | null;
      } catch (e) {
        console.error('[Queries] Exception during snapshot fetch:', e);
        return null;
      }
    }
  });
}

export function useTerritoryDiff(period: 'daily' | 'weekly') {
  console.log('[Queries] useTerritoryDiff called with period:', period);
  return useQuery<TerritoryDiff | null>({
    queryKey: ['territoryDiff', period],
    queryFn: async () => {
      if (!supabase) {
        console.warn('[Queries] Supabase client not initialized (territory diffs)');
        return null;
      }
      try {
        const { data, error } = await supabase
          .from('territory_diffs')
          .select('*')
          .eq('period', period)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) {
          console.error('[Queries] Territory diff fetch error:', error);
          throw error;
        }
        console.log('[Queries] Territory diff fetched for period', period, ':', data);
        return data as unknown as TerritoryDiff | null;
      } catch (e) {
        console.error('[Queries] Exception during territory diff fetch:', e);
        return null;
      }
    }
  });
}