/**
 * Supabase Realtime subscription hook for live snapshot updates
 * Listens for INSERT/UPDATE events on snapshots table
 * Automatically invalidates cache and triggers React Query refetch
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { snapshotCache } from '../snapshotCache';
import { useMapStore } from '../../state/useMapStore';
import { DEBUG_MODE } from '../appConfig';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type RealtimeConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseRealtimeSnapshotOptions {
  enabled?: boolean;
  onStatusChange?: (status: RealtimeConnectionStatus) => void;
}

/**
 * Exponential backoff for reconnection attempts
 */
function getBackoffDelay(attempt: number): number {
  const baseDelay = 2000; // 2 seconds
  const maxDelay = 30000; // 30 seconds
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Hook that subscribes to Supabase Realtime snapshots channel
 * Manages connection lifecycle and handles reconnection
 */
export function useRealtimeSnapshot(options: UseRealtimeSnapshotOptions = {}) {
  const { enabled = true, onStatusChange } = options;
  const queryClient = useQueryClient();
  const setRealtimeStatus = useMapStore((s) => s.setRealtimeStatus);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventTimeRef = useRef(0);
  const statusRef = useRef<RealtimeConnectionStatus>('disconnected');

  // Rate limiting: max 1 invalidation per 5 seconds
  const RATE_LIMIT_MS = 5000;

  const updateStatus = useCallback(
    (status: RealtimeConnectionStatus) => {
      if (statusRef.current !== status) {
        statusRef.current = status;
        setRealtimeStatus(status);
        onStatusChange?.(status);
        DEBUG_MODE ?? console.log('[Realtime] Connection status:', status);
      }
    },
    [onStatusChange, setRealtimeStatus]
  );

  const invalidateSnapshot = useCallback(() => {
    const now = Date.now();
    if (now - lastEventTimeRef.current < RATE_LIMIT_MS) {
      DEBUG_MODE ?? console.log('[Realtime] Rate limited - skipping invalidation');
      return;
    }

    lastEventTimeRef.current = now;
    DEBUG_MODE ?? console.log('[Realtime] Invalidating snapshot cache');
    snapshotCache.invalidate();
    queryClient.invalidateQueries({ queryKey: ['latestSnapshot'] });
  }, [queryClient]);

  const setupChannel = useCallback(() => {
    if (!supabase || !enabled) return;

    DEBUG_MODE ?? console.log('[Realtime] Setting up snapshot channel');
    updateStatus('connecting');

    const channel = supabase.channel('snapshots', {
      config: { broadcast: { ack: false } },
    });

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'snapshots' },
        (payload: any) => {
          DEBUG_MODE ?? console.log('[Realtime] INSERT event received:', payload);
          invalidateSnapshot();
          reconnectAttemptRef.current = 0; // Reset reconnect counter on successful event
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'snapshots' },
        (payload: any) => {
          DEBUG_MODE ?? console.log('[Realtime] UPDATE event received:', payload);
          invalidateSnapshot();
          reconnectAttemptRef.current = 0;
        }
      )
      .subscribe((status: string) => {
        DEBUG_MODE ?? console.log('[Realtime] Channel status:', status);

        if (status === 'SUBSCRIBED') {
          updateStatus('connected');
          reconnectAttemptRef.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          updateStatus('error');
          attemptReconnect();
        } else if (status === 'CLOSED') {
          updateStatus('disconnected');
        }
      });

    channelRef.current = channel;
  }, [enabled, updateStatus, invalidateSnapshot]);

  const attemptReconnect = useCallback(() => {
    if (!enabled) return;

    const delay = getBackoffDelay(reconnectAttemptRef.current);
    DEBUG_MODE ?? console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptRef.current++;
      setupChannel();
    }, delay);
  }, [enabled, setupChannel]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      DEBUG_MODE ?? console.log('[Realtime] Unsubscribing from channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    updateStatus('disconnected');
  }, [updateStatus]);

  // Setup channel on mount
  useEffect(() => {
    setupChannel();

    return () => {
      disconnect();
    };
  }, [setupChannel, disconnect]);

  return {
    status: statusRef.current,
    disconnect,
    invalidateSnapshot,
  };
}
