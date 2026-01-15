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

export function useTerritoryDiff(period: 'territory_daily' | 'territory_threeDay' | 'territory_weekly' | 'territory_allTime') {
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
  warNumber: number;
  warStart: Date;
  requiredVictoryTowns: number;
  scheduledConquestEndTime?: Date | null;
  shortRequiredVictoryTowns: number;
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
              warNumber: (data as War).war_number,
              warStart: (data as War).war_start_time,
              requiredVictoryTowns: Number((data as War).required_victory_towns),
              scheduledConquestEndTime: (data as War).scheduled_conquest_end_time,
              shortRequiredVictoryTowns: Number((data as War).short_required_victory_towns),
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
        if (!warApi) return null;
        return {
          warNumber: warApi.warNumber,
          warStart: new Date(warApi.conquestStartTime),
          requiredVictoryTowns: warApi.requiredVictoryTowns,
          shortRequiredVictoryTowns: warApi.shortRequiredVictoryTowns,
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

// ===========================
// Hourly Aggregates Queries
// ===========================

/**
 * Fetch hourly territory ownership data for a selected territory.
 * Filters by current war number to ensure data consistency across war boundaries.
 * Returns data points suitable for pie charts and ownership timelines.
 */
export async function fetchTerritoryOwnershipHistory(
  territoryId: string,
  hoursBack: number = 24 * 7 // Default: last 7 days (for filtering within current war)
) {
  try {
    // Get current war number to ensure we only get data from the active war
    const war = await fetchWarState();
    const currentWarNumber = war?.warNumber ?? null;

    if (currentWarNumber === null) {
      console.warn('[Queries] Could not determine current war number for ownership history');
      return [];
    }

    const { data, error } = await supabase
      .from("territory_ownership_hourly")
      .select("hour_start, owner, owner_changed_during_hour")
      .eq("territory_id", territoryId)
      .eq("war_number", currentWarNumber)
      .order("hour_start", { ascending: true });

    if (error) {
      console.error(`Failed to fetch territory ownership history: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('Error fetching territory ownership history:', e);
    return [];
  }
}

/**
 * Compute pie chart data from ownership history.
 * Returns: { Colonial: 0.45, Warden: 0.55, Neutral: 0.0 }
 */
export function computeOwnershipPieChart(
  ownershipHistory: Array<{ hour_start: string; owner: string }>
) {
  const counts = { Colonial: 0, Warden: 0, Neutral: 0 } as Record<string, number>;
  for (const entry of ownershipHistory) {
    counts[entry.owner]++;
  }

  const total = ownershipHistory.length;
  return {
    Colonial: total > 0 ? counts.Colonial / total : 0,
    Warden: total > 0 ? counts.Warden / total : 0,
    Neutral: total > 0 ? counts.Neutral / total : 0,
  };
}

/**
 * Fetch casualty rates for a region over time.
 * Returns hourly casualty deltas and computed rates.
 */
export async function fetchRegionCasualtyTrend(
  region: string,
  hoursBack: number = 24 * 7
) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("casualty_hourly")
    .select("hour_start, warden_rate_per_hour, colonial_rate_per_hour, warden_casualties_delta, colonial_casualties_delta")
    .eq("region", region)
    .gte("hour_start", since)
    .order("hour_start", { ascending: true });

  if (error) {
    console.error(`Failed to fetch casualty trend: ${error.message}`);
    return [];
  }

  return data || [];
}

/**
 * Fetch ownership events (capture/loss) for a territory.
 * Returns precise timestamps of ownership transitions.
 */
export async function fetchTerritoryLifecycle(territoryId: string) {
  const { data, error } = await supabase
    .from("territory_lifecycle")
    .select("changed_at, previous_owner, new_owner")
    .eq("territory_id", territoryId)
    .order("changed_at", { ascending: false });

  if (error) {
    console.error(`Failed to fetch territory lifecycle: ${error.message}`);
    return [];
  }

  return data || [];
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