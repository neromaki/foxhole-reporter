# Foxhole Reporter — Rebuild TODO

Verbose task list for each phase. Check off items as they are completed.
Reference `REBUILD_PLAN.md` for context on each item.

**Last updated:** 2026-03-15 — added tasks for: `user_profiles`, `war_summaries`, `discord_subscriptions` tables; `cleanup-on-war-end` + `public-api` edge functions; `react-i18next` setup; `userStore`; PWA install prompt; F-30 auto-refresh (moved to Phase 1); F-32 cross-war analytics; F-33 search; F-34 faction perspective; F-35 war end flow; F-36 shard comparison; F-37 streaming overlay; F-38 public API; localisation (Phase 5).

---

## Phase 1 — Foundation

Goal: Clean architecture, shard support everywhere, all P0 features preserved in new structure.

### 1.1 Database migrations

- [ ] **Migration: add `shard` to `snapshots`**
  - Add column `shard text NOT NULL DEFAULT 'able'`
  - Add index `(shard, war_number, created_at DESC)`
  - Verify existing rows backfilled to 'able'

- [ ] **Migration: add `shard` to `territory_diffs`**
  - Add column `shard text NOT NULL DEFAULT 'able'`
  - Drop and re-add `period` CHECK constraint to include all valid values
  - Add index `(shard, period, generated_at DESC)`

- [ ] **Migration: add `shard` to `wars`**
  - Add column `shard text NOT NULL DEFAULT 'able'`

- [ ] **Migration: add `shard` + `is_victory_base` to `territory_ownership_hourly`**
  - Add `shard text NOT NULL DEFAULT 'able'`
  - Add `is_victory_base boolean DEFAULT false`
  - Drop old UNIQUE constraint on `(territory_id, hour_start)`
  - Add new UNIQUE constraint on `(shard, territory_id, hour_start)`

- [ ] **Migration: add `shard` to `casualty_hourly`**
  - Add `shard text NOT NULL DEFAULT 'able'`
  - Drop old UNIQUE constraint on `(region, hour_start)`
  - Add new UNIQUE constraint on `(shard, region, hour_start)`
  - Add index `(shard, war_number, hour_start DESC)`

- [ ] **Migration: add `shard` to `territory_lifecycle`**
  - Add `shard text NOT NULL DEFAULT 'able'`
  - Add index `(shard, war_number, changed_at DESC)`

- [ ] **Migration: create `war_events` table**
  - All columns per schema: `id`, `shard`, `war_number`, `event_type`, `territory_id`, `hex_region`, `icon_type`, `previous_owner`, `new_owner`, `previous_flags`, `new_flags`, `x`, `y`, `day_of_war`, `detected_at`, `created_at`
  - Add CHECK on `event_type IN ('capture','build','upgrade','destroy','scorch')`
  - Create 3 indexes: feed, hex, type
  - Enable RLS; add public SELECT + authenticated INSERT policies

- [ ] **Migration: create `player_counts` table**
  - Columns: `id`, `recorded_at`, `total_players`, `source`, `created_at`
  - Add index on `recorded_at DESC`
  - Enable RLS; add public SELECT + authenticated INSERT policies

- [ ] **Migration: create `annotations` table**
  - Columns: `id` (uuid), `shard`, `war_number`, `created_at`, `expires_at`, `data` (jsonb)
  - Add `user_id uuid` foreign key to `user_profiles`
  - Add partial index on `expires_at WHERE expires_at IS NOT NULL`
  - Enable RLS; add public SELECT + public INSERT policies

- [ ] **Migration: create `user_profiles` table**
  - Columns: `id` (uuid), `sigil_id` (text, unique, nullable), `created_at`, `last_seen_at`
  - Add partial index on `sigil_id WHERE sigil_id IS NOT NULL`
  - Enable RLS; public SELECT + INSERT; owner UPDATE only

- [ ] **Migration: create `war_summaries` table**
  - Columns: `id`, `shard`, `war_number`, `winner`, `started_at`, `ended_at`, `duration_hours`, `peak_colonial_territories`, `peak_warden_territories`, `final_colonial_territories`, `final_warden_territories`, `total_colonial_casualties`, `total_warden_casualties`, `total_captures`, `created_at`
  - UNIQUE constraint on `(shard, war_number)`
  - Enable RLS; public SELECT; authenticated INSERT

- [ ] **Migration: create `discord_subscriptions` table**
  - Columns: `id`, `guild_id`, `channel_id`, `shard`, `event_types` (text[]), `hex_filter` (text[], nullable), `created_at`
  - UNIQUE constraint on `(channel_id, shard)`
  - Enable RLS; public SELECT; authenticated INSERT
  - **No bot or cron to wire up yet** — table reserved only

- [ ] **Run all migrations** against local Supabase (`supabase migration up`)
- [ ] **Verify schema** — inspect each table, confirm columns + indexes + RLS policies
- [ ] **Push migrations to remote** Supabase project

### 1.2 Backend — edge function updates

- [ ] **`poll-warapi`: add shard support**
  - Accept `shard` query param (default: `'able'`)
  - Map shard to correct WarAPI base URL:
    - `able` → `war-service-live.foxholeservices.com`
    - `baker` → `war-service-live-2.foxholeservices.com`
    - `charlie` → `war-service-live-3.foxholeservices.com`
  - Pass `shard` value when inserting into `snapshots`
  - After successful snapshot insert, invoke `diff-all-structures` with same shard
  - Update cron to run 3× (one per shard), stagger by 5 min to avoid rate limits

- [ ] **`poll-war`: add shard support**
  - Accept `shard` query param (default: `'able'`)
  - Pass `shard` when inserting into `wars`
  - Update cron for 3× execution

- [ ] **`diff-territory`: add shard support**
  - Accept `shard` query param (default: `'able'`)
  - Filter all snapshot queries by `shard`
  - Include `shard` in all `territory_diffs` inserts
  - Update cron for 3× execution

- [ ] **`aggregate-hourly-summaries`: add shard + is_victory_base**
  - Accept `shard` query param (default: `'able'`)
  - Filter all queries by `shard`
  - When writing `territory_ownership_hourly`, compute `is_victory_base` from `flags & 0x01`
  - Pass `shard` + `is_victory_base` to all inserts
  - Update cron for 3× execution

- [ ] **New: `diff-all-structures` edge function**
  - Create `supabase/functions/diff-all-structures/index.ts`
  - Accept `shard` param
  - Fetch the two most recent snapshots for that shard
  - Deserialize `map_data` JSONB from each snapshot into item maps keyed by `territory_id`
  - Diff logic:
    - Item in new but not old → `event_type = 'build'`
    - `teamId` changed → `event_type = 'capture'`
    - `iconType` changed → `event_type = 'upgrade'`
    - `IsScorched` flag newly set → `event_type = 'scorch'`
    - Item in old but not new → `event_type = 'destroy'`
  - Batch insert all detected events into `war_events`
  - Skip insert if no events detected (idempotent)
  - Handle case where fewer than 2 snapshots exist (first run)

- [ ] **New: `poll-player-counts` stub**
  - Create `supabase/functions/poll-player-counts/index.ts`
  - Return 501 Not Implemented with a note about pending Steam API source
  - Do not wire up cron yet

- [ ] **New: `cleanup-on-war-end` edge function**
  - Create `supabase/functions/cleanup-on-war-end/index.ts`
  - Accept `shard` + `war_number` params
  - Step 1: Compute `war_summaries` row from existing data (winner from `wars`, duration, final territory counts from last `territory_ownership_hourly`, total casualties from `casualty_hourly`, total captures from `war_events WHERE event_type='capture'`)
  - Step 2: INSERT into `war_summaries`
  - Step 3: DELETE `war_events` for `(shard, war_number)`
  - Step 4: DELETE `snapshots` for `(shard, war_number)`
  - Step 5: DELETE `territory_diffs`, `casualty_hourly`, `territory_ownership_hourly`, `territory_lifecycle` for `(shard, war_number)`
  - Triggered by `poll-war` when `conquestEndTime` first detected
  - Idempotent: safe to call multiple times

- [ ] **Deploy all updated edge functions** to remote Supabase
- [ ] **Smoke test** `poll-warapi?shard=able` manually — verify snapshot inserted with `shard='able'`
- [ ] **Smoke test** `diff-all-structures?shard=able` — verify `war_events` rows created

### 1.3 Frontend — new directory structure

- [ ] **Install React Router**
  - `npm install react-router-dom`
  - Verify TypeScript types included

- [ ] **Install and configure `react-i18next`**
  - `npm install react-i18next i18next i18next-browser-languagedetector`
  - Create `src/shared/lib/i18n.ts` — configure i18next with browser language detection
  - Create `src/shared/locales/en/translation.json` as the source of truth
  - Create stub files for: `fr/`, `de/`, `pt/`, `ru/`, `zh-Hans/` (content deferred to Phase 5)
  - Wrap `App.tsx` with `I18nextProvider`
  - Add language selector to settings (shows flag + language name)
  - All strings in components must use `t('key')` — no hardcoded UI text

- [ ] **Create `src/app/` directory structure**
  - `src/app/App.tsx` — providers + layout shell (replaces current `App.tsx`)
  - `src/app/Router.tsx` — React Router config with single route for now
  - `src/app/providers/` — placeholder directory (QueryClientProvider, etc.)

- [ ] **Create `src/features/` directory structure**
  - `src/features/map/` with `MapCanvas.tsx`, `layers/`, `hooks/`
  - `src/features/war-header/WarHeader.tsx`
  - `src/features/layers/LayerPanel.tsx`, `LayerTree.tsx`
  - `src/features/reports/ReportPanel.tsx`, `ReportGrid.tsx`, `reports/`
  - `src/features/feed/` (stub files)
  - `src/features/hotspots/` (stub files)
  - `src/features/drill-down/` (stub files)
  - `src/features/returning-player/` (stub files)
  - `src/features/tools/` (stub files)
  - `src/features/annotations/` (stub files)
  - `src/features/shard/ShardSelector.tsx` (stub)

- [ ] **Create `src/shared/` directory structure**
  - `src/shared/ui/BottomSheet.tsx`
  - `src/shared/ui/Panel.tsx`
  - `src/shared/ui/Chip.tsx`
  - `src/shared/ui/LineChart.tsx`
  - `src/shared/ui/Tooltip.tsx`
  - `src/shared/ui/Badge.tsx`
  - `src/shared/hooks/` — move all query hooks here
  - `src/shared/lib/` — move existing lib files here (projection, warApi, etc.)
  - `src/shared/data/` — move static data here

- [ ] **Create `src/types/` directory**
  - `src/types/war.ts` — WarAPI types
  - `src/types/events.ts` — `war_events` row types
  - `src/types/annotations.ts` — annotation data types

### 1.4 Frontend — split Zustand stores

- [ ] **Create `src/state/shardStore.ts`**
  - State: `activeShard: 'able' | 'baker' | 'charlie'`
  - Persist to localStorage key `foxhole-shard`
  - Action: `setActiveShard(shard)`

- [ ] **Create `src/state/mapStore.ts`**
  - State: `viewport` (center, zoom), `interactionMode: 'normal'|'distance'|'range'|'annotate'`
  - Sync with URL param `?hex=` for drill-down zoom target
  - Action: `setViewport`, `setInteractionMode`

- [ ] **Create `src/state/reportStore.ts`**
  - Migrate `activeReport`, `layerState`, `highlightedSet`, `pendingReport` from current `useMapStore`
  - Sync `activeReport` with URL param `?report=`
  - Preserve existing report-switching logic (confirmation dialog flag, auto-open panel)

- [ ] **Create `src/state/toolsStore.ts`**
  - State: `activeTool: null | 'distance' | 'range'`, `distancePoints: [lat,lng][]`, `rangeTarget: {lat,lng,radiusM} | null`
  - No persistence
  - Actions: `setActiveTool`, `addDistancePoint`, `clearDistance`, `setRangeTarget`

- [ ] **Create `src/state/uiStore.ts`**
  - State: panel open/close booleans (`reportsOpen`, `layersOpen`, `feedOpen`, `hotspotsOpen`, `toolsOpen`, `drillDownOpen`, modal states)
  - No persistence
  - Actions: `openPanel(name)`, `closePanel(name)`, `togglePanel(name)`

- [ ] **Create `src/state/annotationStore.ts`**
  - State: `drawings[]`, `labels[]`
  - Persist to localStorage key `foxhole-annotations`
  - Actions: `addDrawing`, `removeDrawing`, `addLabel`, `removeLabel`, `clearAll`

- [ ] **Create `src/state/userStore.ts`**
  - State: `deviceId: string` (UUID), `factionPreference: 'warden' | 'colonial' | null`, `language: string`
  - Persist to localStorage key `foxhole-user`
  - On first load: generate UUID if none present, store it; also upsert a `user_profiles` row
  - Actions: `setFactionPreference`, `setLanguage`
  - `factionPreference` propagates to all UI that labels factions ("your territory" vs faction name)

- [ ] **Delete old `src/state/useMapStore.ts`** after all consumers migrated
- [ ] **Update all component imports** to use new stores

### 1.5 Frontend — URL state

- [ ] **Create `src/shared/lib/urlState.ts`**
  - Export `useUrlState()` hook
  - On mount: read `?shard`, `?report`, `?hex`, `?layers`, `?share` and sync into stores
  - On store change: push updated params to URL via `useSearchParams` (replace, not push)
  - Params to sync: `shard` ↔ `shardStore.activeShard`, `report` ↔ `reportStore.activeReport`, `hex` ↔ `mapStore.drillDownTarget`
  - Param `?share` is read-only on load (triggers annotation fetch)

- [ ] **Wire `useUrlState()` into `App.tsx`** (call once at app root)

### 1.6 Frontend — P0 features in new structure

- [ ] **Migrate `HexTileLayer`** → `src/features/map/layers/HexTileLayer.tsx`
- [ ] **Migrate `TerritorySubregionLayer`** → `src/features/map/layers/TerritoryLayer.tsx`
- [ ] **Migrate `StaticIconLayer`** → `src/features/map/layers/IconLayer.tsx`
- [ ] **Migrate `HexCasualties`** → `src/features/map/layers/CasualtyLayer.tsx`
- [ ] **Migrate FPI layer** → `src/features/map/layers/FPILayer.tsx`
- [ ] **Migrate `VictoryBar` + war header** → `src/features/war-header/WarHeader.tsx`
  - Add placeholder `[Able ▼]` shard selector (wired to `shardStore`)
  - Add placeholder player count slot (shows `---` until F-15 implemented)
- [ ] **Migrate `LayerPanel`** → `src/features/layers/LayerPanel.tsx`
- [ ] **Migrate all report components** → `src/features/reports/reports/`
- [ ] **Migrate `InfoSheet` / `ReportInfoSheet`** → `src/features/reports/ReportPanel.tsx`
- [ ] **Migrate `HexInfo`** → stub for drill-down (Phase 3)
- [ ] **Update `MapCanvas`** to compose all migrated layers correctly
- [ ] **Verify all existing P0 features work** after migration:
  - Territory map renders
  - Layer toggles work
  - Reports panel opens and all 7 reports function
  - VictoryBar shows correct war state
  - Mobile layout is intact

### 1.7 Frontend — shared UI primitives

- [ ] **Implement `BottomSheet.tsx`**
  - Drag handle at top
  - States: `off` (hidden), `peek` (small handle), `third` (~33vh), `half` (~50vh), `full` (90vh)
  - Snap-to-state on drag release
  - Desktop: renders as fixed sidebar (left or right, configurable)
  - Accepts `title`, `children`, `onClose`

- [ ] **Implement `Panel.tsx`**
  - Simple titled container with header + scrollable body
  - Used for desktop sidebar variant of BottomSheet content

- [ ] **Implement `Chip.tsx`**
  - Small label/badge for filter chips, faction labels, event type tags

- [ ] **Implement `LineChart.tsx`**
  - Minimal SVG line chart
  - Props: `data: {x: number, y: number}[]`, `color`, `width`, `height`, `label`
  - Used by casualty trend + FPI detail in Phase 3

- [ ] **Implement `Badge.tsx`**
  - Coloured dot/pill — used for event type indicators in feed

### 1.9 F-30 Data Freshness & Auto-Refresh (moved from P4)

- [ ] **Configure automatic polling intervals on all data hooks**
  - `useLatestSnapshot`: refetch every 60s
  - `useActivityFeed`: refetch every 60s
  - `useWarState`: refetch every 120s
  - `useCasualtyTrend`, `useFPI`, `useTerritoryDiff`: refetch every 300s
  - Use React Query `refetchInterval` — no manual `setInterval` calls

- [ ] **Implement pulsing live indicator**
  - A small animated dot in `WarHeader` — green pulse when data is fresh (<2 min old), amber when stale (2–10 min), red when very stale (>10 min)
  - Derives from the most recently updated query's `dataUpdatedAt`

- [ ] **Implement API downtime banner**
  - Show when any critical query has not refreshed for >15 min
  - Banner: "WarAPI unavailable — showing last known state from X ago" + Retry button
  - Dismissible; re-appears if still stale after dismiss

- [ ] **"Last updated" timestamps on reports**
  - Each report panel footer shows "Updated X min ago"
  - Derived from the report's primary query `dataUpdatedAt`

- [ ] **PWA: installable + manifest**
  - Add `manifest.json` with app name, icons, theme colour, `display: standalone`
  - Register service worker (install prompt only; no offline caching)
  - Show "Add to Home Screen" prompt on mobile after 30s of engagement
  - Verify app opens in standalone mode on iOS and Android

### 1.10 Phase 1 verification

- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] All P0 features verified working (see 1.6 checklist)
- [ ] Shard selector changes `shardStore.activeShard`
- [ ] URL param `?shard=baker` loads and persists shard selection
- [ ] DB: `SELECT DISTINCT shard FROM snapshots` returns at least 'able'
- [ ] Map auto-refreshes territory layer without user interaction
- [ ] Stale data banner appears when API mock returns no new data for >15 min
- [ ] App is installable on mobile (Add to Home Screen prompt appears)
- [ ] `user_profiles` row created on first app load; UUID persists in localStorage

---

## Phase 2 — Critical Gaps (P1)

Goal: Close the most important competitive gaps — live feed, hotspots, true change reports.

### 2.1 F-13 Live Activity Feed

- [ ] **Create `src/shared/hooks/useActivityFeed.ts`**
  - Query `war_events` ordered by `detected_at DESC`
  - Accept `shard`, `hexRegion?`, `eventTypes?`, `limit` params
  - Expose `dataUpdatedAt` for freshness indicator
  - Poll on a 60-second interval (not realtime subscription initially)

- [ ] **Create `src/features/feed/FeedCard.tsx`**
  - Display single event: icon, event type label (capture/build/upgrade/destroy/scorch), hex name, timestamp
  - Use `Badge` for event type
  - Faction colour coding for `previous_owner` / `new_owner`

- [ ] **Create `src/features/feed/FeedFilters.tsx`**
  - Filter chips for event type (capture, build, upgrade, destroy, scorch)
  - Filter dropdown for hex region
  - Controlled by local component state (not URL — too volatile)

- [ ] **Create `src/features/feed/ActivityFeed.tsx`**
  - Compose `FeedFilters` + infinite scroll / paginated list of `FeedCard`
  - Empty state when no events
  - Loading skeleton
  - Wrap in `BottomSheet` (or `Panel` on desktop)

- [ ] **Add Feed button to map FABs**
  - `[📡 Feed]` button toggles `uiStore.feedOpen`
  - BottomSheet wraps ActivityFeed

- [ ] **Verify** events appear within ~15 min of a real capture

### 2.2 F-14 Hotspot Indicator

- [ ] **Create `src/shared/hooks/useHotspots.ts`**
  - Query `casualty_hourly` for the last 3 hours, grouped by `region`
  - Sum `colonial_casualties + warden_casualties` per region
  - Return top N regions sorted by total casualties DESC
  - Accept `shard` param

- [ ] **Create `src/features/hotspots/HotspotPanel.tsx`**
  - Ranked list of top 5–10 regions with:
    - Region name
    - Casualty rate bar/number
    - "Zoom to" button (sets `mapStore.viewport` to region center)
  - Wrap in `BottomSheet`

- [ ] **Add Hotspots button to map FABs**
  - `[🔥 Hotspots]` button toggles `uiStore.hotspotsOpen`

- [ ] **Optionally: hotspot overlay on map**
  - Pulse or glow effect on top hotspot hexes (can defer to Phase 3)

- [ ] **Verify** top regions correspond to visually active areas on map

### 2.3 F-16 True "What Changed" Reports

- [ ] **Upgrade `TerritoryChangeReport`**
  - Replace static snapshot-diff with query to `war_events WHERE event_type='capture'`
  - Show a timeline of captures for the selected period
  - Each capture: territory name, hex, from→to owner, timestamp
  - Highlight corresponding hex on map when row hovered

- [ ] **Add `event_type='build'` section**
  - Show newly constructed structures (IsBuildSite cleared) for the period
  - Filter by `iconType` to show only notable structures (relic bases, factories, etc.)

- [ ] **Verify** change report matches actual captures visible in feed

### 2.4 F-15 Player Count UI Slot

- [ ] **Add player count slot to `WarHeader`**
  - Shows `--- players` placeholder text
  - Slot is visible but clearly marked as "coming soon" or simply empty
  - No backend work needed yet

---

## Phase 3 — High Value (P2)

Goal: Unlock the logistics and strategist archetype improvements.

### 3.1 F-18 Per-Region Drill-Down

- [ ] **Create `src/shared/hooks/useRegionDetail.ts`**
  - Accept `hexRegion` + `shard`
  - Query 1: latest snapshot filtered to `hex_region` — returns all structures with icon data
  - Query 2: `casualty_hourly` last 24h for this region
  - Query 3: `war_events` last 24h for this region

- [ ] **Create `src/features/drill-down/tabs/StructuresTab.tsx`**
  - Table/list of all structures in region
  - Columns: icon, name (from `iconTypes` lookup), owner, flags (IsScorched, IsBuildSite)
  - Sort by iconType or owner

- [ ] **Create `src/features/drill-down/tabs/CasualtyTab.tsx`**
  - 24h casualty rate chart using `LineChart`
  - Colonial vs Warden lines

- [ ] **Create `src/features/drill-down/tabs/EventsTab.tsx`**
  - Recent events for this region (reuse FeedCard)
  - Default to last 24h

- [ ] **Create `src/features/drill-down/RegionDetail.tsx`**
  - Tab bar: Structures | Casualties | Events
  - Compose three tab components
  - Wrap in `BottomSheet` (opens from bottom on mobile, side panel on desktop)
  - Header: region name + current territory ownership summary

- [ ] **Wire map click → drill-down**
  - Click on hex tile opens `RegionDetail` for that hex
  - Sets URL param `?hex=HexName`
  - On load, `?hex=` param opens drill-down and zooms to that hex

### 3.2 F-19 Casualty Rate Trend Chart

- [ ] **Create `src/shared/hooks/useCasualtyTrend.ts`**
  - Query `casualty_hourly` for the last N hours, grouped by `hour_start`
  - Return `{ hour: Date, colonial: number, warden: number }[]`
  - Accept `shard`, `region?` (if provided, filter by region)

- [ ] **Add Casualty Trend chart to `CasualtyReport`**
  - Global casualty rate over time (all regions summed)
  - Two lines: Colonial, Warden
  - Time axis: last 24h, 3d, 7d selector

- [ ] **Expose trend from drill-down CasualtyTab** (already covered by 3.1)

### 3.3 F-20 Distance & Travel Time Tool

- [ ] **Create `src/features/tools/DistanceTool.tsx`**
  - Activate via `toolsStore.setActiveTool('distance')`
  - Click on map adds waypoints (min 2)
  - Draw dashed polyline between waypoints on map (`DistanceMeasureLayer`)
  - Compute Euclidean distance in in-game units (calibrate against known distances)
  - Display travel time estimate for each vehicle preset:
    - Truck: ~80 km/h in-game
    - Barge: ~40 km/h in-game
    - Motorcycle: ~100 km/h in-game
  - "Clear" button resets waypoints

- [ ] **Create `src/features/map/layers/DistanceMeasureLayer.tsx`**
  - Renders `Polyline` for distance tool waypoints
  - Shows distance label at midpoint

- [ ] **Create `src/features/tools/ToolsPanel.tsx`**
  - Houses Distance Tool + Range Tool (F-21)
  - Wrap in `BottomSheet`

- [ ] **Add Tools button to map FABs**
  - `[📐 Tools]` button toggles `uiStore.toolsOpen`

### 3.4 F-21 Weapon & Structure Range Visualisation

- [ ] **Define range presets** in `src/shared/data/ranges.ts`
  - Field artillery: 50m (in-game units)
  - Howitzer: 100m
  - Mortar: 60m
  - AT gun: 30m
  - (Calibrate all values against actual in-game data)

- [ ] **Create `src/features/tools/RangeTool.tsx`**
  - Activate via `toolsStore.setActiveTool('range')`
  - Click on map to place range center (`toolsStore.setRangeTarget`)
  - Dropdown to select weapon/structure type
  - Renders `RangeCircleLayer` on map

- [ ] **Create `src/features/map/layers/RangeCircleLayer.tsx`**
  - Renders `Circle` overlay for range visualization
  - Colour-coded by weapon type
  - Shows label with weapon name and radius

### 3.5 F-22 "Returning Player" Summary

- [ ] **Create `src/features/returning-player/ReturningPlayerModal.tsx`**
  - Step 1: "How long were you away?" → time selector (1h, 6h, 12h, 1d, 3d, 1w)
  - Step 2: Compute summary from `war_events` + `territory_lifecycle` for that window:
    - Territories captured (count + list)
    - Notable structures built/destroyed
    - Hottest hex (most events)
    - War score change (from `wars` table, if available)
  - Step 3: Show summary with "Jump to map" links per item

- [ ] **Auto-trigger on load** if `localStorage` has a `lastVisit` timestamp > 1 hour ago
  - Store `lastVisit = now()` in localStorage on every app load
  - On load: if `now() - lastVisit > 1h`, offer "You were away for X — see what changed?"

- [ ] **Add manual trigger** in header or nav (e.g., clock/history icon)

### 3.6 F-32 Cross-War Analytics

- [ ] **Create `src/shared/hooks/useWarHistory.ts`**
  - Query `war_summaries` ordered by `war_number DESC`
  - Accept `shard` param
  - Return list of wars with winner, duration, final territory counts, casualty totals

- [ ] **Create cross-war analytics report/dashboard**
  - Faction win rate (W/L/draw counts, percentage)
  - Average war duration in hours
  - Longest and shortest wars
  - Territory count at war end (trend chart across last N wars)
  - Total casualties per faction across all wars
  - Accessible from the Reports panel

### 3.7 F-33 Hex & Location Search

- [ ] **Build search index from static data**
  - Index all 43 hex region names from `src/shared/data/regions`
  - Index all named locations (towns, bases, facilities) from icon data
  - Each entry: `{ name, type, hexRegion, lat, lng }`

- [ ] **Create `src/features/search/SearchBar.tsx`**
  - Type-ahead input with debounce (200ms)
  - Filters index client-side (no backend needed)
  - Results grouped: Hex Regions | Locations
  - Selecting a result: fly map to location, optionally open drill-down if hex

- [ ] **Place search** in `WarHeader` (desktop: inline; mobile: icon → full-screen overlay)

### 3.8 F-34 Faction Perspective

- [ ] **Add faction preference to settings panel**
  - Warden / Colonial / No preference (default)
  - Stored in `userStore.factionPreference`

- [ ] **Propagate faction perspective through UI**
  - Report labels: "Your territories" / "Enemy territories" when preference set
  - Map highlights: slightly emphasise your faction's territory
  - Feed: "You captured X" / "Enemy captured X" framing
  - Capability reports: "Your capabilities" / "Enemy capabilities"
  - All strings go through i18n keys so faction framing is translatable

---

## Phase 4 — Differentiators (P3)

Goal: Features that set Foxhole Reporter apart from competitors.

### 4.1 F-27 Shareable Deep Links

- [ ] **Finalise `urlState.ts`** (partially done in Phase 1)
  - Ensure all relevant state is encoded: `shard`, `report`, `hex`, `layers`, `share`
  - Test: open URL → correct state restored
  - Test: change state → URL updates without page reload

- [ ] **Add "Copy Link" button** to header or share icon
  - Copies current URL to clipboard
  - Brief "Copied!" toast

- [ ] **E2E test**: copy URL, open in incognito, verify state loads

### 4.2 F-26 Victory Point Tracking

- [ ] **Create `src/features/map/layers/VictoryPointLayer.tsx`**
  - Query `territory_ownership_hourly WHERE is_victory_base = true`
  - Render distinctive icon overlay for each victory base
  - Colour by current owner (Colonial / Warden / Neutral)
  - Tooltip on hover: territory name, current owner, last captured

- [ ] **Add VP count to `WarHeader`**
  - Show `Warden VPs: 12 / Colonial VPs: 8` or similar
  - Update from `territory_ownership_hourly` query

- [ ] **Add VP layer toggle** to `LayerPanel`

### 4.3 F-24 Capability Balance Dashboard

- [ ] **Create `src/features/reports/reports/CapabilityDashboard.tsx`**
  - Side-by-side faction comparison
  - Categories: Air (rotary + fixed wing), Naval (LST, sub, frigate, etc.), Artillery, Tank, AT, Infantry support
  - Count per faction for each category
  - Trend arrow: `↑` / `↓` / `→` based on last 24h delta (from `war_events` build/destroy events)
  - Source: latest snapshot `iconType` counts

- [ ] **Add to report registry** in `reportStore`

### 4.4 F-25 Map Annotation & Drawing Tools

- [ ] **Create `src/features/annotations/AnnotationToolbar.tsx`**
  - Tools: draw line, draw polygon, place text label, select/delete
  - Colour picker
  - Activated by `mapStore.setInteractionMode('annotate')`

- [ ] **Create `src/features/map/layers/AnnotationLayer.tsx`**
  - Render `drawings[]` + `labels[]` from `annotationStore`
  - Editable when `interactionMode === 'annotate'`

- [ ] **Create `src/features/annotations/ShareAnnotationModal.tsx`**
  - "Share" button → INSERT into `annotations` table with current:
    - `shard`, `war_number`, `viewport`, `layers`, `report`, `drawings`, `labels`
    - `expires_at = war_end + 7 days` (or null if war end unknown)
  - On success: show URL with `?share=<uuid>`, copy to clipboard

- [ ] **On load with `?share=<uuid>`**
  - Fetch annotation by ID from `annotations` table
  - Restore viewport, layers, report, drawings, labels

### 4.5 F-23 Supply Chain Visualisation

- [ ] **Design supply chain heuristic**
  - For each resource node (iconType = refinery, resource extractor), find nearest friendly depot/seaport within N in-game units
  - Draw directed arrow from node → depot
  - Colour by contested status (any enemy structure within X units = orange/red)

- [ ] **Create supply chain overlay**
  - New layer toggle in `LayerPanel`
  - Renders as `Polyline` arrows using Leaflet
  - Highlight contested corridors in warning colour

### 4.6 F-35 War End Flow

- [ ] **Detect war end in `poll-war`**
  - When `conquestEndTime` first appears: set a `war_ended` flag, trigger `cleanup-on-war-end`

- [ ] **Create `src/features/war-end/VictoryScreen.tsx`**
  - Full-screen overlay showing winner (faction banner + colour)
  - Final stats from `war_summaries`: duration, territory counts, total casualties, total captures
  - "War History" link opens cross-war analytics
  - Dismiss button → app returns to frozen map state

- [ ] **Create inter-war waiting state**
  - After VictoryScreen dismissed: map shows last known state with "War Ended" overlay
  - Header shows "Awaiting War [N+1]..." with elapsed time since war end
  - Polls `poll-war` every 60s for new war start
  - Auto-transitions (removes overlay, reloads data) when new war detected

### 4.7 F-36 Shard Comparison Panel

- [ ] **Create `src/features/shard/ShardComparisonPanel.tsx`**
  - Triggered from shard selector dropdown ("Compare all shards")
  - Shows 3-column grid: Able | Baker | Charlie
  - Each column: war number, day of war, territory balance (W vs C), player count (if available)
  - Tap a column to switch to that shard

### 4.8 F-37 Streaming Overlay

- [ ] **Create `/overlay` route in React Router**
  - Minimal shell: no nav, no panels, no FABs
  - Transparent background (`body { background: transparent }`)
  - Intended for OBS browser source

- [ ] **Create `src/features/overlay/StreamOverlay.tsx`**
  - War status bar: shard name, territory balance progress bar, war day + timer
  - Territory map (read-only, no interaction, auto-refreshing)
  - All text large enough to be legible at 1280×720 in a corner overlay
  - URL params: `?shard=able&opacity=0.8&map=true&status=true`

### 4.9 F-38 Public API

- [ ] **Create `supabase/functions/public-api/index.ts`**
  - Route: `GET /v1/wars/current?shard=`
  - Route: `GET /v1/events?shard=&limit=&after=` (paginated, max 500/request)
  - Route: `GET /v1/casualties?shard=&region=&hours=`
  - Route: `GET /v1/territory?shard=&period=`
  - Route: `GET /v1/wars?shard=` (list of `war_summaries`)
  - Route: `GET /v1/wars/:war_number/summary?shard=`
  - Route: `GET /v1/openapi.json` (static OpenAPI spec)

- [ ] **Rate limiting**
  - 60 req/min per IP unauthenticated
  - Return `429 Too Many Requests` with `Retry-After` header
  - Log abuse patterns (don't block legitimate heavy use)

- [ ] **Write OpenAPI spec** (`supabase/functions/public-api/openapi.json`)
  - All endpoints documented with params, response shapes, examples

- [ ] **Add API docs link** to app footer or About page

---

## Phase 5 — Polish (P4, continuous)

### 5.1 F-28 Report Panel UX (mobile)

- [ ] Ensure `BottomSheet` snap states work smoothly on iOS Safari and Android Chrome
- [ ] Test all reports in half-screen mode — no content cut off
- [ ] Minimum touch target 44px on all interactive elements

### 5.2 F-29 Onboarding

- [ ] First-visit overlay or tooltip sequence (max 3 steps)
- [ ] "What is this?" help icon on complex features (FPI, feed, drill-down)
- [ ] Skip/dismiss mechanism stored in localStorage

### 5.3 F-31 Accessibility / Colour-Blind Mode

- [ ] Audit all faction colours for WCAG AA contrast
- [ ] Provide alternative colour scheme for deuteranopia (green/red → blue/orange)
- [ ] Toggle in settings or auto-detect via `prefers-color-scheme` / CSS media query
- [ ] All interactive elements have `aria-label`
- [ ] Keyboard navigation for panels and report grid

### 5.4 Localisation — additional languages

- [ ] **Translate `en/translation.json` → French (`fr/`)**
- [ ] **Translate `en/translation.json` → German (`de/`)**
- [ ] **Translate `en/translation.json` → Portuguese PT (`pt/`)**
- [ ] **Translate `en/translation.json` → Russian (`ru/`)**
- [ ] **Translate `en/translation.json` → Chinese Simplified (`zh-Hans/`)**
- [ ] **RTL check** — Russian and Chinese are LTR; no RTL work needed for this language set
- [ ] **Verify** number/date formatting via `i18next` locale settings (date formats, decimal separators)
- [ ] **In-app language switcher** — verify all 6 languages render correctly on mobile

---

## Cross-Cutting Concerns (all phases)

- [ ] **Every data hook accepts `shard` param** — enforce this as a code review criterion
- [ ] **Every hook exposes `dataUpdatedAt`** — required for freshness indicators
- [ ] **No hardcoded colours** — all faction/event colours come from a central constants file
- [ ] **No hardcoded UI strings** — all text via `t('key')` from i18next
- [ ] **Faction perspective respected** — any label naming a faction checks `userStore.factionPreference`
- [ ] **No bespoke tooltip logic** — all tooltips use `shared/ui/Tooltip.tsx`
- [ ] **No DOM/Node APIs in `src/lib/`** — keep Edge Function compatibility
- [ ] **`npm run lint` must pass** before every commit
- [ ] **`npm run build` must pass** before every commit
