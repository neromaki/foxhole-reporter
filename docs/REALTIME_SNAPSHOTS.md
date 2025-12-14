# Supabase Realtime Snapshots Integration

## Overview

The Foxhole Reporter app now includes Supabase Realtime integration for live snapshot updates. Instead of polling every 15 minutes, the app automatically receives snapshot updates in near real-time (< 5 seconds) via WebSocket.

## How It Works

### Architecture

```
Supabase Realtime (WebSocket)
    ↓
useRealtimeSnapshot() [hook]
    ↓
Invalidates snapshotCache
    ↓
React Query refetch triggered
    ↓
MapView re-renders with new data
```

### Event Flow

1. **Connection**: `useRealtimeSnapshot()` hook subscribes to `snapshots` table
2. **Broadcast**: Supabase sends INSERT/UPDATE events via WebSocket
3. **Rate Limiting**: Events are deduplicated (max 1 invalidation per 5 seconds)
4. **Cache Invalidation**: Cache is cleared, triggering React Query refetch
5. **Reconnection**: Automatic exponential backoff on disconnects (2s → 30s)

## Configuration

### Enable/Disable Realtime

```typescript
// src/lib/queries.ts
export const REALTIME_SNAPSHOTS_ENABLED = true; // Set to false to disable
```

**Default**: Enabled

**When to disable:**
- Bandwidth-constrained environments
- Debugging/testing
- Using non-Supabase data source (WarAPI)

### Rate Limiting

Maximum 1 cache invalidation per 5 seconds (hardcoded in `useRealtimeSnapshot.ts`):
```typescript
const RATE_LIMIT_MS = 5000; // 5 seconds
```

This prevents React component thrashing if multiple INSERTs arrive in rapid succession.

### Stale Time

- **With Realtime**: 10 minutes (realtime events invalidate cache much faster)
- **Without Realtime**: 15 minutes (traditional polling interval)

## Usage

### Automatic Integration

Realtime is automatically active when:
- `useLatestSnapshot()` is called
- `REALTIME_SNAPSHOTS_ENABLED = true`
- Supabase is initialized
- User has permission to subscribe to `snapshots` table

**No changes needed in components** - they consume snapshots exactly as before.

### Monitoring Connection Status

Connection status is tracked in `useMapStore`:

```typescript
import { useMapStore } from 'src/state/useMapStore';

function MyComponent() {
  const realtimeStatus = useMapStore(s => s.realtimeStatus);
  // realtimeStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  
  return (
    <div>
      Realtime: {realtimeStatus}
    </div>
  );
}
```

### Debug Console

Check realtime status in browser console:

```typescript
// Check if realtime is connected
window.__snapshotCache?.getDebugInfo()
```

## Features

### ✅ Implemented

- [x] Supabase Realtime channel subscription
- [x] INSERT/UPDATE event handling
- [x] Rate limiting (max 1 fetch per 5 seconds)
- [x] Automatic reconnection with exponential backoff
- [x] Connection status tracking in Zustand store
- [x] Cache invalidation on events
- [x] React Query integration
- [x] Debug logging
- [x] Fallback to polling if realtime unavailable

### 🔄 Event Handling

| Event | Behavior |
|-------|----------|
| INSERT | Invalidate cache, refetch latest snapshot |
| UPDATE | Invalidate cache, refetch latest snapshot |
| DELETE | Ignored (should not occur for snapshots) |
| DISCONNECT | Exponential backoff reconnection (2s → 30s) |
| RECONNECT | Reset reconnection counter, start listening |

### 🛡️ Resilience

- Automatic reconnection on WebSocket disconnect
- Exponential backoff prevents server spam (max delay 30s)
- Falls back to polling if realtime unavailable
- Error logging for debugging
- Graceful degradation (app works without realtime)

## Performance

### Latency

- **Polling**: 15 minutes (before update is visible)
- **Realtime**: < 5 seconds (typical)

### Network

- **Polling**: 1 request every 15 minutes (always, even if no changes)
- **Realtime**: 1 WebSocket connection + event messages (only when changes occur)

**Cost**: Supabase Realtime adds WebSocket cost. For Foxhole (1 snapshot per 15 min), savings are minimal but UX improvement is significant.

## Troubleshooting

### Realtime Not Connecting

**Check in browser console:**

```typescript
// Enable debug logging
import { DEBUG_MODE } from 'src/lib/appConfig';
// Then refresh and check console for [Realtime] logs
```

**Common issues:**
1. Supabase not initialized - Check `supabaseClient.ts`
2. Realtime not enabled in Supabase project - Enable in Supabase dashboard → Realtime
3. Table not in realtime whitelist - Add `snapshots` to realtime configuration
4. Row-level security (RLS) blocking reads - Ensure RLS policies allow reads

### Fallback to Polling

If realtime fails to connect, the app automatically falls back to React Query polling (staleTime: 10 minutes). This is transparent to the user.

**To force polling**, disable realtime:
```typescript
export const REALTIME_SNAPSHOTS_ENABLED = false;
```

## Files Modified

- `src/lib/hooks/useRealtimeSnapshot.ts` - **NEW** Realtime subscription hook
- `src/lib/snapshotCache.ts` - Added `invalidate()` method and listener registration
- `src/lib/queries.ts` - Integrated realtime into `useLatestSnapshot()`
- `src/state/useMapStore.ts` - Track realtime connection status

## Next Steps (Phase 2)

Future enhancements:

1. **Visual Feedback** - Show connection indicator in UI (green/red dot)
2. **Update Animations** - Brief CSS transition when territories change
3. **History Caching** - Cache historical snapshots in IndexedDB for faster daily reports
4. **Territory Diff Realtime** - Consider realtime for territory diffs (currently polling)

## See Also

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Snapshot Caching](./PERFORMANCE.md#snapshot-caching)
- [Snapshot Payload Optimization](./PERFORMANCE.md#snapshot-payload-optimization)
