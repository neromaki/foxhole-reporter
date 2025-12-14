/**
 * Client-side snapshot caching layer
 * Reduces redundant Supabase queries by caching based on server update frequency (15 minutes)
 */

import type { Snapshot } from '../types/war';

/**
 * Supabase snapshot update interval in milliseconds
 * Snapshots are only generated every 15 minutes on the server
 */
export const SNAPSHOT_UPDATE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

interface CachedSnapshot {
  snapshot: Snapshot;
  cachedAt: number; // timestamp when this was cached
  snapshotCreatedAt: string; // ISO timestamp from snapshot.created_at
}

class SnapshotCache {
  private cache: Map<string, CachedSnapshot> = new Map();
  private invalidateListeners: Array<() => void> = [];

  /**
   * Check if a cached snapshot is still valid
   * A snapshot is valid if we're within the update interval from when it was created
   */
  private isValid(cached: CachedSnapshot): boolean {
    const createdTime = new Date(cached.snapshotCreatedAt).getTime();
    const now = Date.now();
    const timeSinceCreation = now - createdTime;

    // If the snapshot is less than 15 minutes old (on server), consider it valid
    return timeSinceCreation < SNAPSHOT_UPDATE_INTERVAL_MS;
  }

  /**
   * Register a listener to be called when cache is invalidated
   * Useful for triggering external updates (e.g., React Query refetch)
   */
  onInvalidate(callback: () => void): () => void {
    this.invalidateListeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.invalidateListeners = this.invalidateListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Get cached latest snapshot if it's still valid
   * Returns null if no cache or cache is stale
   */
  getLatest(): Snapshot | null {
    const cached = this.cache.get('latest');
    if (!cached) return null;

    if (!this.isValid(cached)) {
      this.cache.delete('latest');
      return null;
    }

    return cached.snapshot;
  }

  /**
   * Store a snapshot in cache
   */
  setLatest(snapshot: Snapshot): void {
    this.cache.set('latest', {
      snapshot,
      cachedAt: Date.now(),
      snapshotCreatedAt: snapshot.created_at,
    });
  }

  /**
   * Clear the cache (useful for manual refresh or realtime invalidation)
   * Triggers all registered invalidate listeners
   */
  invalidate(): void {
    this.cache.clear();
    for (const listener of this.invalidateListeners) {
      listener();
    }
  }

  /**
   * Legacy clear method - kept for backwards compatibility
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache metadata for debugging
   */
  getDebugInfo(): {
    hasCached: boolean;
    isValid: boolean;
    cachedSnapshot: Snapshot | null;
    cacheAge: number;
    snapshotAge: number;
  } {
    const cached = this.cache.get('latest');
    if (!cached) {
      return {
        hasCached: false,
        isValid: false,
        cachedSnapshot: null,
        cacheAge: 0,
        snapshotAge: 0,
      };
    }

    const now = Date.now();
    const cacheAge = now - cached.cachedAt;
    const snapshotAge = now - new Date(cached.snapshotCreatedAt).getTime();

    return {
      hasCached: true,
      isValid: this.isValid(cached),
      cachedSnapshot: cached.snapshot,
      cacheAge,
      snapshotAge,
    };
  }
}

// Global singleton instance
export const snapshotCache = new SnapshotCache();

/**
 * Format milliseconds as readable duration
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Log cache status for debugging
 */
export function logCacheStatus(): void {
  const info = snapshotCache.getDebugInfo();
  console.group('💾 Snapshot Cache Status');
  console.log(`Has cached snapshot: ${info.hasCached}`);
  if (info.hasCached) {
    console.log(`Cache is valid: ${info.isValid}`);
    console.log(`Cache age: ${formatDuration(info.cacheAge)}`);
    console.log(`Snapshot age: ${formatDuration(info.snapshotAge)}`);
    console.log(`Update interval: ${formatDuration(SNAPSHOT_UPDATE_INTERVAL_MS)}`);
    if (info.cachedSnapshot) {
      console.log(`Snapshot ID: ${info.cachedSnapshot.id}`);
      console.log(`Territory count: ${info.cachedSnapshot.territories?.length ?? 0}`);
    }
  } else {
    console.log('No cached snapshot available');
  }
  console.groupEnd();
}
