import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import { fetchWarState } from './warApi';
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

export interface ResolvedWarState {
  warNumber: number | null;
  requiredVictoryTowns: number | null;
  source: 'supabase' | 'warapi';
}

export function useWarState(options?: { enabled?: boolean }) {
  return useQuery<ResolvedWarState | null>({
    queryKey: ['warState'],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      // 1) Supabase wars table (preferred)
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('wars')
            .select('*')
            .order('war_start_time', { ascending: false, nullsLast: true })
            .order('war_number', { ascending: false, nullsLast: true })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error('[Queries] War state fetch error (supabase):', error);
          } else if (data && data.required_victory_towns != null) {
            return {
              warNumber: (data as War).war_number ?? null,
              requiredVictoryTowns: Number((data as War).required_victory_towns),
              source: 'supabase' as const,
            } satisfies ResolvedWarState;
          }
        } catch (e) {
          console.error('[Queries] Exception during war fetch (supabase):', e);
        }
      }

      // 2) WarAPI fallback
      try {
        const warApi = await fetchWarState();
        return {
          warNumber: warApi?.warNumber ?? null,
          requiredVictoryTowns: warApi?.requiredVictoryTowns ?? null,
          source: 'warapi' as const,
        } satisfies ResolvedWarState;
      } catch (e) {
        console.error('[Queries] War state fetch error (warapi):', e);
      }

      return null;
    }
  });
}