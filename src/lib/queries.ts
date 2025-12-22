import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import { fetchWarState } from './warApi';
import type { Snapshot, TerritoryDiff, War } from '../types/war';
import { DEBUG_MODE } from './appConfig';
import { quantizeSnapshot, logPayloadAnalysis } from './snapshotOptimization';
import { snapshotCache, logCacheStatus } from './snapshotCache';
import { useRealtimeSnapshot } from './hooks/useRealtimeSnapshot';
import { useMapStore } from '../state/useMapStore';

export const REALTIME_SNAPSHOTS_ENABLED = true; // Feature flag for realtime snapshots

export function useLatestSnapshot(options?: { enabled?: boolean }) {
  DEBUG_MODE ?? console.log('[Queries] useLatestSnapshot called with options:', options);
  
  const setRealtimeStatus = useMapStore((s) => s.setRealtimeStatus);

  // Realtime subscription (runs in background to listen for updates)
  const realtimeOptions = {
    enabled: (options?.enabled ?? true) && REALTIME_SNAPSHOTS_ENABLED,
    onStatusChange: (status: string) => {
      setRealtimeStatus(status as any);
      if (status === 'connected') {
        DEBUG_MODE ?? console.log('[Queries] Realtime snapshot subscription connected');
      }
    },
  };
  useRealtimeSnapshot(realtimeOptions);

  return useQuery<Snapshot | null>({
    queryKey: ['latestSnapshot'],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      if (!supabase) {
        console.warn('[Queries] Supabase client not initialized');
        return null;
      }

      // Check cache first - if valid, return cached snapshot
      const cached = snapshotCache.getLatest();
      if (cached) {
        DEBUG_MODE ?? console.log('[Queries] Returning cached snapshot (within 15-min update interval)');
        DEBUG_MODE ?? logCacheStatus();
        return cached;
      }

      DEBUG_MODE ?? console.log('[Queries] Fetching latest snapshot from supabase (cache miss or stale)');
      try {
        const war = await fetchWarState();
        const currentWarNumber = war?.warNumber ?? null;
        
        const { data, error } = await supabase
          .from('snapshots')
          .select('*')
          .eq('war_number', currentWarNumber != null ? currentWarNumber : 0)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) {
          console.error('[Queries] Snapshot fetch error:', error);
          throw error;
        }
        DEBUG_MODE ?? console.log('[Queries] Latest snapshot fetched:', data);
        if (data) {
          const snapshot = data as unknown as Snapshot;
          // Apply coordinate quantization to reduce memory and network payload
          const quantized = quantizeSnapshot(snapshot);
          // Cache the quantized snapshot for future queries
          snapshotCache.setLatest(quantized);
          return quantized;
        }
        return null;
      } catch (e) {
        console.error('[Queries] Exception during snapshot fetch:', e);
        return null;
      }
    },
    // Stale time: 15 minutes (Supabase update interval)
    // Realtime invalidates cache on new events, triggering refetch much faster
    // If realtime is unavailable, falls back to polling every 15 minutes
    staleTime: REALTIME_SNAPSHOTS_ENABLED ? 10 * 60 * 1000 : 15 * 60 * 1000, // 10 or 15 minutes
  });
}

export function useTerritoryDiff(period: 'daily' | 'weekly') {
  DEBUG_MODE ?? console.log('[Queries] useTerritoryDiff called with period:', period);
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
        DEBUG_MODE ?? console.log('[Queries] Territory diff fetched for period', period, ':', data);
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
            .order('warNumber', { ascending: false, nullsLast: true })
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

export function useSnapshotsSince(hours: number, options?: { enabled?: boolean }) {
  return useQuery<Snapshot[]>({
    queryKey: ['snapshotsSince', hours],
    enabled: (options?.enabled ?? true) && !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      try {
        const { data, error } = await supabase
          .from('snapshots')
          .select('*')
          .gte('created_at', since)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('[Queries] snapshotsSince error:', error);
          throw error;
        }
        // Apply coordinate quantization to reduce memory payload
        return ((data ?? []) as unknown as Snapshot[]).map(snapshot => quantizeSnapshot(snapshot));
      } catch (e) {
        console.error('[Queries] Exception during snapshotsSince fetch:', e);
        return [];
      }
    },
    staleTime: 60_000,
  });
}

// Fetch the latest N snapshots (ordered newest-first) for cases where a previous snapshot is needed
export function useLatestSnapshots(count: number, options?: { enabled?: boolean }) {
  return useQuery<Snapshot[]>({
    queryKey: ['latestSnapshots', count],
    enabled: (options?.enabled ?? true) && !!supabase,
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(count);
      if (error) {
        console.error('[Queries] latestSnapshots error:', error);
        throw error;
      }
      return ((data ?? []) as unknown as Snapshot[]).map(snapshot => quantizeSnapshot(snapshot));
    },
    staleTime: 60_000,
  });
}