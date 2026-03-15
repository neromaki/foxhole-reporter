# Foxhole Reporter — Ground-Up Rebuild Plan

**Purpose:** Master design document for the rebuild. Covers user archetypes, feature scope, frontend architecture, and Supabase DB schema. Intended as the reference for all subsequent implementation plans.

---

## Context

The current app was built incrementally by a free model and has become bloated and hard to maintain. A competitive audit revealed significant feature gaps (no live feed, no hotspots, no multi-shard, no true change reports). The rebuild goal is a clean, extensible foundation that serves all 4 player archetypes well and closes the key gaps vs. FoxholeStats and SigilHQ — with the strategic advantage of being **mobile-first and zero-setup**.

---

## 1. User Archetypes

Four primary archetypes drive every design decision. The current app scores and targets:

| Archetype | Baseline | Target | Primary unmet need |
|-----------|----------|--------|--------------------|
| Casual | 4 / 10 | 8 / 10 | Live feed, hotspots, "what changed?" |
| Logistics | 6 / 10 | 8 / 10 | Distance/travel time tool, per-region drill-down |
| Partisan | 5 / 10 | 7 / 10 | Live construction events, drill-down, range circles |
| Strategist | 5 / 10 | 8 / 10 | True change reports, casualty trend chart, capability balance |

### Key questions each archetype needs answered

**Casual**
1. What is the overall war state right now? ✅ (VictoryBar exists)
2. What happened while I was away? ❌ (no feed, no change report)
3. Where is the fighting and where should I deploy? ❌ (no hotspot)

**Logistics**
1. Where are resource nodes, refineries, and factories relative to each other? ✅
2. How far is A→B and how long by truck/barge? ❌ (no distance tool)
3. Which supply corridors are contested? ⚠️ (zones exist, no threat overlay)

**Partisan**
1. What high-value structures does the enemy have and where? ⚠️ (reports exist, no drill-down)
2. Which enemy structures are newly built (soft targets)? ❌ (no construction events)
3. What's the safest approach route, what ranges to worry about? ❌ (no range vis)

**Strategist**
1. Where are frontline weak points? ⚠️ (FPI exists, no defence density overlay)
2. Is the enemy getting stronger or weaker? ❌ (no trend data)
3. What is the capability balance — air, naval, artillery? ⚠️ (counts only, no trends)

---

## 2. Feature Scope by Priority

### P0 — Preserve (already exists)
- F-01 Territory Hex Map
- F-02 War Status Header
- F-03 Layer System
- F-04 Reports Panel
- F-05 Overview
- F-06 Historical Territory Reports
- F-07 Casualties
- F-08 Capability Reports
- F-09 Resource Reports
- F-10 Logistics Zones
- F-11 Frontline Pressure (FPI)
- F-12 Mobile-Responsive Design

### P1 — Critical gaps (must ship for viability)
- **F-13 Live Activity Feed** — requires new `war_events` DB table + `diff-all-structures` edge function
- **F-14 Hotspot Indicator** — computed from `casualty_hourly`; pure frontend
- **F-15 Global Player Count** — UI slot reserved; data source deferred (note: Steam API may provide this, investigate later)
- **F-16 True "What Changed" Reports** — upgrade F-06 snapshots into genuine diffs using `war_events`
- **F-17 Multi-Shard Support** — `shard` column added to all time-series tables from day 1; 3× polling

### P2 — High value (ship next)
- **F-18 Per-Region Drill-Down** — click hex → bottom sheet with structures, casualties, recent events
- **F-19 Casualty Rate Trend Chart** — line chart from `casualty_hourly`; pure frontend
- **F-20 Distance & Travel Time Tool** — interactive map measurement with vehicle presets; pure frontend
- **F-21 Weapon & Structure Range Visualisation** — range circle overlays with presets; pure frontend
- **F-22 "Returning Player" Summary** — time-windowed catch-up computed from `war_events` + `territory_lifecycle`

### P3 — Differentiators (build after P2)
- **F-23 Supply Chain Visualisation** — proximity-based directional flow overlay; pure frontend computed from snapshot
- **F-24 Capability Balance Dashboard** — side-by-side faction comparison panel
- **F-25 Map Annotation & Drawing Tools** — requires `annotations` DB table + URL share key
- **F-26 Victory Point Tracking** — `is_victory_base` flag already in data; needs dedicated UI layer
- **F-27 Shareable Deep Links** — URL state encoding; required before F-25 share flows

### P4 — Polish (continuous)
- F-28 Report Panel UX (mobile)
- F-29 Onboarding
- F-30 Data Freshness Indicators
- F-31 Accessibility/Colour-Blind Mode

---

## 3. Frontend Architecture

### Design principles
1. **Feature-first directory structure** — each feature is self-contained
2. **URL as source of truth for shareable state** — enables F-27 deep links at zero cost
3. **Shard-aware from day 1** — all data hooks accept `shard` param
4. **Mobile-first** — bottom sheet pattern for all panels, min 44px touch targets
5. **Data freshness exposed** — every query hook exposes `dataUpdatedAt` for F-30
6. **No bespoke tooltip/modal logic** — shared primitives only

### Directory structure

```
src/
  app/
    App.tsx                  # Providers, layout shell
    Router.tsx               # React Router config (enables deep links)
    providers/               # QueryClient, Supabase, Zustand

  features/
    map/                     # F-01 — base map + interaction
      MapCanvas.tsx          # Leaflet container
      layers/
        HexTileLayer.tsx
        TerritoryLayer.tsx
        IconLayer.tsx
        CasualtyLayer.tsx
        FPILayer.tsx
        VictoryPointLayer.tsx   # F-26
        RangeCircleLayer.tsx    # F-21
        AnnotationLayer.tsx     # F-25
        DistanceMeasureLayer.tsx  # F-20
      hooks/
        useMapInteraction.ts

    war-header/              # F-02, F-15
      WarHeader.tsx          # Shard selector + victory bar + player count slot + war timer

    layers/                  # F-03
      LayerPanel.tsx
      LayerTree.tsx

    reports/                 # F-04 through F-11
      ReportPanel.tsx        # Panel shell
      ReportGrid.tsx         # Report tile selector
      reports/
        OverviewReport.tsx
        TerritoryChangeReport.tsx   # F-16 upgraded
        CasualtyReport.tsx
        CapabilityReport.tsx
        ResourceReport.tsx
        LogisticsZoneReport.tsx
        FrontlinePressureReport.tsx
        CapabilityDashboard.tsx     # F-24

    feed/                    # F-13
      ActivityFeed.tsx
      FeedCard.tsx
      FeedFilters.tsx        # Filter by region, event type

    hotspots/                # F-14
      HotspotPanel.tsx       # Ranked regions list with map-zoom links

    drill-down/              # F-18
      RegionDetail.tsx       # Click-hex → bottom sheet
      tabs/
        StructuresTab.tsx
        CasualtyTab.tsx
        EventsTab.tsx

    returning-player/        # F-22
      ReturningPlayerModal.tsx   # "How long were you away?" flow

    tools/                   # F-20, F-21
      ToolsPanel.tsx
      DistanceTool.tsx
      RangeTool.tsx

    annotations/             # F-25
      AnnotationToolbar.tsx
      ShareAnnotationModal.tsx

    shard/                   # F-17
      ShardSelector.tsx

  shared/
    ui/                      # Design system primitives
      BottomSheet.tsx        # Draggable sheet (off/third/half/full)
      Panel.tsx
      Chip.tsx
      LineChart.tsx          # Used by casualty trend, FPI detail
      Tooltip.tsx
      Badge.tsx

    hooks/                   # All data-fetching hooks (shard-aware)
      useLatestSnapshot.ts
      useWarState.ts
      useTerritoryDiff.ts
      useActivityFeed.ts
      useHotspots.ts
      useCasualtyTrend.ts
      useFPI.ts
      useRegionDetail.ts
      useAnnotations.ts

    lib/
      projection.ts
      warApi.ts
      supabase.ts
      viewModes.ts
      hexLayout.ts
      icons.ts
      time.ts
      urlState.ts            # URL ↔ store sync for deep links (F-27)

    data/                    # Static data (icons, regions, teams, etc.)

  state/                     # Zustand stores (split by domain)
    shardStore.ts            # activeShard — persisted to localStorage
    mapStore.ts              # viewport: center, zoom, interaction mode
    reportStore.ts           # activeReport, layerState, highlightedSet
    toolsStore.ts            # activeTool, distance points, range state
    uiStore.ts               # panel open/close states, modals
    annotationStore.ts       # annotation drawings — persisted to localStorage

  types/
    war.ts
    events.ts
    annotations.ts
```

### State management

Replace the current monolithic `useMapStore` with domain-separated Zustand stores:

| Store | Persisted | Key state |
|-------|-----------|-----------|
| `shardStore` | localStorage | `activeShard: 'able'|'baker'|'charlie'` |
| `mapStore` | URL param | `viewport`, `interactionMode: 'normal'|'distance'|'range'|'annotate'` |
| `reportStore` | URL param | `activeReport`, `layerState`, `highlightedSet`, `pendingReport` |
| `toolsStore` | no | `activeTool`, `distancePoints[]`, `rangeTarget` |
| `uiStore` | no | panel states, modal states |
| `annotationStore` | localStorage + server on share | `drawings[]`, `labels[]` |

### URL state / deep links (F-27)

`urlState.ts` syncs a subset of store state to URL search params on change, and reads URL params on load. The URL encodes:

```
?shard=able
&report=territory-daily
&hex=FarranacCoast          # zooms + opens drill-down
&layers=structures.bases,territories
&share=<uuid>               # opens a saved annotation set
```

React Router handles routing. `useUrlState()` hook wraps `useSearchParams` and syncs with `mapStore` + `reportStore` on mount and on change.

### Navigation model

```
┌─────────────────────────────────────────────────────┐
│ WarHeader: [Able ▼] [W 142 / C 138 ─────●────── 155] [Day 14 · 3d 2h] [●●● players] │
├─────────────────────────────────────────────────────┤
│                                                     │
│                   MAP (full bleed)                  │
│                                                     │
│  [⊞ Layers]  [📋 Reports]  [🔥 Hotspots]           │
│  [📡 Feed]   [📐 Tools]                             │
│                                                     │
│             ↑ Bottom Sheet (all panels)             │
└─────────────────────────────────────────────────────┘
```

All panels (Reports, Layers, Feed, Hotspots, Drill-Down, Returning Player) use the shared `BottomSheet` component. Desktop: sheets become a persistent left/right sidebar. Map is always partially visible on mobile.

---

## 4. Supabase DB Schema

### Guiding principles
- Every time-series table has a `shard` column (`'able' | 'baker' | 'charlie'`)
- All tables have RLS: public SELECT, authenticated INSERT
- Indexes cover the primary access patterns (shard + war_number + time DESC)
- `war_events` is the new canonical event log (replacing the limited `territory_lifecycle` pattern)

---

### Modified existing tables

#### `snapshots` — add shard
```sql
ALTER TABLE snapshots ADD COLUMN shard text NOT NULL DEFAULT 'able';
CREATE INDEX snapshots_shard_idx ON snapshots (shard, war_number, created_at DESC);
```

#### `territory_diffs` — add shard + fix period constraint
```sql
ALTER TABLE territory_diffs ADD COLUMN shard text NOT NULL DEFAULT 'able';
ALTER TABLE territory_diffs DROP CONSTRAINT IF EXISTS territory_diffs_period_check;
ALTER TABLE territory_diffs ADD CONSTRAINT territory_diffs_period_check
  CHECK (period IN ('daily', 'threeDay', 'weekly', 'allTime'));
CREATE INDEX territory_diffs_shard_idx ON territory_diffs (shard, period, generated_at DESC);
```

#### `wars` — add shard
```sql
ALTER TABLE wars ADD COLUMN shard text NOT NULL DEFAULT 'able';
```

#### `territory_ownership_hourly` — add shard + is_victory_base
```sql
ALTER TABLE territory_ownership_hourly ADD COLUMN shard text NOT NULL DEFAULT 'able';
ALTER TABLE territory_ownership_hourly ADD COLUMN is_victory_base boolean DEFAULT false;
ALTER TABLE territory_ownership_hourly DROP CONSTRAINT IF EXISTS territory_ownership_hourly_territory_id_hour_start_key;
ALTER TABLE territory_ownership_hourly ADD CONSTRAINT territory_ownership_hourly_shard_territory_hour_key
  UNIQUE (shard, territory_id, hour_start);
```

#### `casualty_hourly` — add shard
```sql
ALTER TABLE casualty_hourly ADD COLUMN shard text NOT NULL DEFAULT 'able';
ALTER TABLE casualty_hourly DROP CONSTRAINT IF EXISTS casualty_hourly_region_hour_start_key;
ALTER TABLE casualty_hourly ADD CONSTRAINT casualty_hourly_shard_region_hour_key
  UNIQUE (shard, region, hour_start);
CREATE INDEX casualty_hourly_shard_idx ON casualty_hourly (shard, war_number, hour_start DESC);
```

#### `territory_lifecycle` — add shard
```sql
ALTER TABLE territory_lifecycle ADD COLUMN shard text NOT NULL DEFAULT 'able';
CREATE INDEX idx_shard_lifecycle ON territory_lifecycle (shard, war_number, changed_at DESC);
```

---

### New tables

#### `war_events` — live activity feed (F-13, F-16)

The canonical log of all discrete structure changes detected between polls. Tracks all icon types (not just major flags).

```sql
CREATE TABLE war_events (
  id              bigserial PRIMARY KEY,
  shard           text NOT NULL,
  war_number      int NOT NULL,
  event_type      text NOT NULL,
    -- 'capture'   : structure changed owner
    -- 'build'     : IsBuildSite flag cleared (construction complete)
    -- 'upgrade'   : iconType changed (T1→T2, T2→T3, etc.)
    -- 'destroy'   : structure disappeared from snapshot
    -- 'scorch'    : IsScorched flag set
  territory_id    text,
  hex_region      text NOT NULL,
  icon_type       int NOT NULL,
  previous_owner  text,          -- 'Colonial' | 'Warden' | 'Neutral' | null
  new_owner       text,          -- 'Colonial' | 'Warden' | 'Neutral' | null
  previous_flags  int,
  new_flags       int,
  x               float,         -- normalized [0,1] for map positioning
  y               float,
  day_of_war      int,
  detected_at     timestamptz NOT NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_war_events_feed
  ON war_events (shard, war_number, detected_at DESC);
CREATE INDEX idx_war_events_hex
  ON war_events (shard, hex_region, detected_at DESC);
CREATE INDEX idx_war_events_type
  ON war_events (shard, war_number, event_type, detected_at DESC);

ALTER TABLE war_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read access for all" ON war_events FOR SELECT TO public USING (true);
CREATE POLICY "Insert only for authenticated" ON war_events FOR INSERT TO authenticated WITH CHECK (true);
```

**Note:** `war_events` supersedes the function of `territory_lifecycle` for the activity feed. `territory_lifecycle` is kept as-is for FPI backward-compat. Long-term, FPI can be migrated to query `war_events WHERE event_type='capture'`.

---

#### `player_counts` — global player count (F-15, reserved)

```sql
CREATE TABLE player_counts (
  id           bigserial PRIMARY KEY,
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  total_players int,
  source       text DEFAULT 'steam',
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_player_counts_time ON player_counts (recorded_at DESC);

ALTER TABLE player_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read access for all" ON player_counts FOR SELECT TO public USING (true);
CREATE POLICY "Insert only for authenticated" ON player_counts FOR INSERT TO authenticated WITH CHECK (true);
```

**Note:** No shard column — Steam API provides global count across all shards. UI slot reserved in `WarHeader`. Edge function `poll-player-counts` to be implemented when Steam API source is confirmed.

---

#### `annotations` — shareable map annotations (F-25, F-27)

```sql
CREATE TABLE annotations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shard       text NOT NULL,
  war_number  int,
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz,    -- null = no expiry; set to war_end+7d on creation
  data        jsonb NOT NULL
    -- {
    --   viewport: { center: [lat,lng], zoom: number },
    --   layers: { [layerKey]: boolean },
    --   report: string | null,
    --   drawings: [{ type, points, color, label }],
    --   labels: [{ x, y, text }]
    -- }
);

CREATE INDEX idx_annotations_expires ON annotations (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read by id" ON annotations FOR SELECT TO public USING (true);
CREATE POLICY "Public insert" ON annotations FOR INSERT TO public WITH CHECK (true);
```

**Note:** No auth required for insert — the UUID is the access key. Client-side annotations are stored in `annotationStore` (localStorage). Sharing triggers an INSERT and returns the UUID for URL construction: `?share=<uuid>`.

---

### New edge functions

#### `diff-all-structures`

New function that runs after each `poll-warapi` (or triggered by it). Compares the latest two snapshots for a given shard and writes discrete events to `war_events`.

**Logic:**
1. Fetch the two most recent snapshots for `shard`
2. Build a map of `territory_id → item` for each snapshot
3. For each item in the new snapshot:
   - If not in old: `event_type = 'build'` (appeared)
   - If owner changed: `event_type = 'capture'`
   - If iconType changed (e.g. 56→57): `event_type = 'upgrade'`
   - If IsScorched newly set: `event_type = 'scorch'`
4. For each item in old snapshot not in new: `event_type = 'destroy'`
5. Batch-insert into `war_events`

**Trigger:** Called by `poll-warapi` after snapshot insert, or by separate cron.

#### `poll-player-counts` (future)

Reserved. Will poll Steam API for Foxhole player counts and insert into `player_counts`.

---

### Modified edge functions

#### `poll-warapi` — add shard support

Accept `shard` param (`able`|`baker`|`charlie`). Map to appropriate base URL:
```
able    → war-service-live.foxholeservices.com
baker   → war-service-live-2.foxholeservices.com
charlie → war-service-live-3.foxholeservices.com
```

Pass `shard` when inserting into `snapshots`. After insert, invoke `diff-all-structures` for the same shard.

**Cron:** Run independently for each shard (3 cron jobs, 15-min intervals).

#### `poll-war` — add shard support

Same pattern: accept `shard`, store in `wars`.

#### `diff-territory` — add shard support

Accept `shard`, filter all queries by shard.

#### `aggregate-hourly-summaries` — add shard + is_victory_base

- Accept `shard` param
- When writing `territory_ownership_hourly`, include `is_victory_base` from the `flags & 0x01` bitmask
- Filter all queries by shard

---

### Complete table inventory (post-rebuild)

| Table | Purpose | Key new columns |
|-------|---------|-----------------|
| `snapshots` | Raw WarAPI snapshots | `shard` |
| `territory_diffs` | Pre-computed ownership diffs | `shard` + period constraint fix |
| `wars` | War metadata | `shard` |
| `territory_ownership_hourly` | Hourly ownership per territory | `shard`, `is_victory_base` |
| `casualty_hourly` | Hourly casualty rates per region | `shard` |
| `territory_lifecycle` | Capture event log (major flags) | `shard` |
| `realtime_messages` | Realtime broadcast | unchanged |
| **`war_events`** | All-structures event log (new) | new table |
| **`player_counts`** | Steam player count (reserved) | new table |
| **`annotations`** | Shareable map annotations | new table |

---

## 5. Implementation Phases

### Phase 1 — Foundation (P0 preserve + multi-shard + feed)
1. DB migrations: add `shard` to all existing tables, create `war_events`, `player_counts`, `annotations`
2. Edge functions: update all to accept shard param; build `diff-all-structures`
3. Frontend: new directory structure, split Zustand stores, `ShardSelector`, `urlState.ts`, `WarHeader` redesign
4. Carry forward all P0 features with clean component structure

### Phase 2 — Critical gaps (P1)
5. F-13 Live Activity Feed (`war_events` → `ActivityFeed`)
6. F-14 Hotspot Indicator (from `casualty_hourly`)
7. F-16 True Change Reports (upgrade territory reports using `war_events`)
8. F-15 Player count UI slot (empty until Steam source confirmed)

### Phase 3 — High value (P2)
9. F-18 Per-Region Drill-Down
10. F-19 Casualty Rate Trend Chart
11. F-20 Distance & Travel Time Tool
12. F-21 Weapon & Structure Range Vis
13. F-22 Returning Player Summary

### Phase 4 — Differentiators (P3)
14. F-27 Shareable Deep Links (urlState.ts + test)
15. F-26 Victory Point Tracking
16. F-24 Capability Balance Dashboard
17. F-25 Map Annotation & Drawing Tools
18. F-23 Supply Chain Visualisation

### Phase 5 — Polish (P4, continuous)
- F-28 Mobile report UX
- F-29 Onboarding
- F-30 Data Freshness Indicators
- F-31 Accessibility

---

## 6. Key Files to Create / Modify

**New files (frontend):**
- `src/app/Router.tsx` — React Router setup
- `src/shared/lib/urlState.ts` — URL ↔ store sync
- `src/state/shardStore.ts` — shard selection
- `src/features/feed/ActivityFeed.tsx` — live event feed
- `src/features/hotspots/HotspotPanel.tsx`
- `src/features/drill-down/RegionDetail.tsx`
- `src/features/tools/DistanceTool.tsx`
- `src/features/tools/RangeTool.tsx`
- `src/features/returning-player/ReturningPlayerModal.tsx`

**Modified files (frontend):**
- `src/state/useMapStore.ts` → split into domain stores
- `src/components/VictoryBar.tsx` → moved into `features/war-header/`
- `src/lib/queries.ts` → all hooks accept `shard` param

**New files (backend):**
- `supabase/functions/diff-all-structures/index.ts`
- `supabase/functions/poll-player-counts/index.ts` (stub)
- `supabase/migrations/YYYYMMDD_add_shard_support.sql`
- `supabase/migrations/YYYYMMDD_add_war_events.sql`
- `supabase/migrations/YYYYMMDD_add_player_counts_annotations.sql`

**Modified files (backend):**
- All existing edge functions: add `shard` param

---

## 7. Verification Criteria

### After Phase 1
- DB: `SELECT DISTINCT shard FROM snapshots` returns 'able', 'baker', 'charlie'
- Frontend: shard selector switches all data to correct shard
- URL: `?shard=baker&report=territory-daily` loads correctly on fresh open

### After Phase 2
- ActivityFeed shows events within 15 min of a structure capture
- Hotspot list correctly ranks top 5 regions by casualty rate
- Territory change reports highlight changed hexes (not static snapshot)

### After Phase 4
- Copy a `?share=<uuid>` URL, open in incognito → annotations and view state load correctly
- VP layer shows victory bases with correct per-faction counts

---

## 8. Archetype Score Targets (post-rebuild)

| Phase complete | Casual | Logistics | Partisan | Strategist |
|----------------|--------|-----------|----------|------------|
| Phase 1 (foundation) | 4 | 6 | 5 | 5 |
| Phase 2 (P1 gaps) | 7 | 6 | 6 | 6 |
| Phase 3 (P2) | 7 | 8 | 7 | 8 |
| Phase 4 (P3) | 8 | 9 | 8 | 8 |
