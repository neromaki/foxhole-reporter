# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (port 5173, LAN accessible)
npm run build        # Bundle territories + icons, then vite build
npm run deploy       # Same as build (targets GitHub Pages output in dist/)
npm run lint         # ESLint TypeScript linting
npm run preview      # Serve built assets locally

# Asset pipelines (run automatically during build, but can run manually):
npm run bundle:territories   # Pack map/subregion SVGs → src/data/territory-paths.ts
npm run build:sprite         # Build icon sprite atlas → src/data/icon-sprite.ts
```

**Supabase CLI (for backend work):**
```bash
supabase migration up
supabase functions deploy poll-warapi
supabase functions deploy diff-territory
```

**Environment (`.env` file required for frontend):**
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Architecture

### Data Flow

1. **Edge Functions** (Deno, `supabase/functions/`) poll the Foxhole WarAPI on a schedule:
   - `poll-warapi`: Fetches territory state → inserts into `snapshots` table (skips when `conquestEndTime` is set)
   - `poll-war`: Fetches war metadata → `wars` table
   - `diff-territory`: Computes ownership changes for major flags only (iconTypes 56,57,58,45,27,29) → `territory_diffs` table for 'daily', 'threeDay', 'weekly', 'allTime' periods
   - `aggregate-hourly-summaries`: Creates hourly aggregates in `territory_ownership_hourly`, `casualty_hourly`, `territory_lifecycle`

2. **Frontend** (React, `src/`) fetches from Supabase via hooks in `src/lib/queries.ts`:
   - `useLatestSnapshot()` — 15-min stale cache + optional realtime (feature flag `REALTIME_SNAPSHOTS_ENABLED`)
   - `useTerritoryDiff(period)` — ownership diff for a given period
   - `useWarState()` — war metadata for the victory bar

3. **State** is managed by Zustand in `src/state/useMapStore.ts` — layers, active report, selected location, panel open states. Toggling a report mode auto-opens the report panel and changes layer defaults; don't duplicate this logic.

### Map Rendering

The map uses Leaflet with `CRS.Simple` (no real geography). Coordinate system:
- WarAPI: normalized [0,1] per hex region
- `projectRegionPoint()` in `src/lib/projection.ts`: maps to Leaflet lat/lng within hex tile bounds
- Hex grid: 13 rows in a diamond pattern; layout defined in `src/data/regions.tsx`

Layer Z-order (bottom to top):
1. `HexTileLayer` — 43 WebP hex region tiles as `ImageOverlay`
2. `HexCasualties` — colored overlay for casualty rates
3. `TerritorySubregionLayer` — SVG polygons for territory ownership (pre-bundled paths)
4. `StaticIconLayer` / `StaticLabelLayer` — icons and labels using sprite atlas
5. `HexNameLabels` — region names (zoom-dependent)

### Key Conventions

**Shared tooltip**: Use `src/lib/sharedTooltip.tsx` context for all hover/sticky tooltip behavior — never build bespoke tooltip logic in components.

**Config constants**: `src/lib/mapConfig.ts` controls zoom thresholds, opacity, layer defaults, and the `DATA_SOURCE` flag (`'supabase'` | `'warapi'` | `'disabled'`). `src/lib/appConfig.ts` holds `DEBUG_MODE` and `ICON_SIZE`. Don't hardcode these values.

**Static data**: `src/data/` holds teams, icons, territories, regions, and SVG paths. Keep additions consistent with existing sources and update bundling scripts when asset files change.

**Reports**: `src/state/reports.ts` defines the `ReportSpec` interface and built-in report registry. Each report specifies `mapIconTags`, `viewMode`, `highlightType`, `defaultLayers`, and `reportContextGroup`. Report context switching may trigger a confirmation dialog (`REPORT_SWITCH_DIALOG` flag).

**Asset pipeline**: When adding icons, place PNGs in `src/map/icons/` and run `npm run build:sprite`. When adding territory SVGs, place in `src/map/subregions/` and run `npm run bundle:territories`. Both run automatically on `npm run build`.

### Browser/Deno Compatibility

Files under `src/lib/` are shared by Edge Functions — keep them free of DOM/Node APIs. `src/lib/warApi.ts` wraps WarAPI with ETag caching; don't break `fetchJsonWithCache` semantics. For Deno files under `supabase/functions/`, use extension-suffixed imports (`.ts`) and avoid Node globals.

### Performance

Leaflet can lag with many markers/polygons. Use `useMemo`, `useCallback`, and ref caching (e.g., `markerRefs`) to minimize re-renders. Batch state updates in `useMapStore` where possible.

### Deployment

Static frontend deploys via GitHub Pages (`.github/workflows/pages.yml`). Supabase Edge Functions run on a cron schedule. Build output goes to `dist/`.
