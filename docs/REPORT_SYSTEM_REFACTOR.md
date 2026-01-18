# Report System Refactor Plan

**Status:** Ready for Implementation  
**Last Updated:** January 18, 2026 (all questions resolved)  
**Scope:** Generalize report modes, merge JobViews into Reports, introduce Threats report, enable user-extensible reporting system

---

## Overview

Currently, the app has two separate but parallel systems:

1. **ReportMode** (`territory_daily`, `territory_threeDay`, `territory_weekly`, `territory_allTime`, `threats`): Territory ownership change tracking with diff-based highlighting
2. **JobViews** (Resource Mining, Logistics, Production, etc.): MapIcon filtering by tag with layer snapshot/restore

These systems overlap in functionality and visual behavior but are implemented independently. The goal is to **unify them into a single, extensible Report system** that:

- Supports built-in reports (converted JobViews + Territory diffs + Threats)
- Allows user-created, persistent reports (localStorage in future phases)
- Decouples visual "view modes" (territory dimming, minimal, none) from business logic
- Enables future complex reports (stacked overlays, data union, custom analytics)
- Snapshots/restores user layer preferences when entering/exiting reports

**Key Architecture Decisions:**
- **Territory Diff Periods**: Backend stores periods as `daily`, `threeDay`, `weekly`, `allTime` in the `territory_diffs` table. Frontend uses `territory_daily`, `territory_threeDay`, `territory_weekly`, `territory_allTime` for clarity (distinguishing from other potential time-based metrics like casualty trends)
- **MapIcon Filtering**: Supports both `ANY` (any tag match) and `ALL` (all tags must match) modes, preserving existing JobView semantics
- **Threats Highlighting**: Storm Cannons/Rockets highlight territories containing those structures (computed from icon locations when report is active)
- **UI Structure**: JobViewPanel and ReportModes will merge into a single Reports panel with categorized navigation
- **Minimal ViewModes**: Start with core opacity/visibility rules; expand styling incrementally as needed
- **Query Pattern**: Use `useActiveReportDiff()` hook (Option A) for clean separation of diff fetching logic

---

## Architecture Changes

### Current State

```
ReportMode (enum: hardcoded strings)
  ├─ activeReportMode: string | null
  └─ Effects: layer visibility, icon filtering, territory opacity/color, icon dimming, label visibility

JobViews (static spec array)
  ├─ activeJobViewId: string | null
  ├─ previousLayersSnapshot: LayerState | null (snapshot/restore)
  └─ Effects: mapIcon filtering by tag, label hiding

Separate concerns in TerritorySubregionLayer, MapView, LocationsLayer
```

### Target State

```
Reports (registry: built-in + user)
  ├─ ReportSpec[] (id, name, mapIconTags, viewMode, defaultLayers, metadata, source)
  ├─ activeReport: ReportSpec | null
  ├─ reportLayersSnapshot: LayerState | null (snapshot/restore)
  └─ reportHighlightedSet: Set<string> | null (territory IDs for non-diff highlights)

ViewMode type enum ('territoryDimming' | 'minimal' | 'none')
  ├─ ViewModeRenderer utility (centralized styling/interaction rules)
  └─ Used by TerritorySubregionLayer, MapView, LocationsLayer

User Reports (localStorage)
  ├─ loadUserReports(): ReportSpec[]
  ├─ saveUserReport(spec: ReportSpec): void
  ├─ deleteUserReport(id: string): void
```

---

## Step-by-Step Implementation

### Phase 1: Core Report Infrastructure

#### Step 1.1: Create `ReportSpec` Configuration Schema

**File:** `src/state/reports.ts` (new)

Create the foundation for configurable reports:

```typescript
// Type definitions for reports
export type ViewMode = 'territoryDimming' | 'minimal' | 'none';
export type ReportSource = 'builtin' | 'user';
export type FilterMode = 'ANY' | 'ALL';

export interface ReportSpec {
  id: string;                    // Unique identifier (e.g., 'logistics-frontline', 'threats-storm')
  name: string;                  // Display name (e.g., 'Logistics (Frontline)', 'Storm Cannons')
  category: string;              // Primary category (e.g., 'Territory', 'Threats', 'Jobs')
  subcategory?: string;          // Optional secondary grouping (e.g., 'Resource Mining', 'Logistics')
  mapIconTags: MapIconTag[];     // MapIcon tags to filter/show (empty = show no icons)
  filterMode?: FilterMode;       // 'ANY' (default): any tag matches; 'ALL': all tags must match
  viewMode: ViewMode;            // Visual presentation mode
  defaultLayers: LayerState;     // Complete desired layer state when report activates
  reportContextGroup?: string;   // Group for context-aware report switching (e.g., 'territory', 'threats', 'jobs-mining')
  metadata?: {                   // Optional extensible metadata for future features
    stackComparisonIcons?: MapIcon[];  // For threats reports: which icons to show in VictoryBar
    [key: string]: any;           // Allow arbitrary future metadata
  };
  source: ReportSource;          // 'builtin' (immutable) or 'user' (from localStorage)
}
```

**Built-in Reports Registry:**

```typescript
export const BUILTIN_REPORTS: Record<string, ReportSpec> = {
  // Territory Reports (map to territory_diffs table periods: daily, threeDay, weekly, allTime)
  'territory-daily': {
    id: 'territory-daily',
    name: '1 Day',
    category: 'Territory',
    mapIconTags: [],
    viewMode: 'territoryDimming',
    defaultLayers: { structures: false, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'territory',
    source: 'builtin',
  },
  'territory-three-day': {
    id: 'territory-three-day',
    name: '3 Days',
    category: 'Territory',
    mapIconTags: [],
    viewMode: 'territoryDimming',
    defaultLayers: { structures: false, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'territory',
    source: 'builtin',
  },
  'territory-weekly': {
    id: 'territory-weekly',
    name: '7 Days',
    category: 'Territory',
    mapIconTags: [],
    viewMode: 'territoryDimming',
    defaultLayers: { structures: false, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'territory',
    source: 'builtin',
  },
  'territory-all-time': {
    id: 'territory-all-time',
    name: 'All Time',
    category: 'Territory',
    mapIconTags: [],
    viewMode: 'territoryDimming',
    defaultLayers: { structures: false, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'territory',
    source: 'builtin',
  },
  // Threats Reports
  'threats-storm': {
    id: 'threats-storm',
    name: 'Storm Cannons',
    category: 'Threats',
    mapIconTags: [MapIconTag.Storm_Cannon],
    viewMode: 'territoryDimming',
    defaultLayers: { structures: true, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'threats',
    metadata: { stackComparisonIcons: [MapIcon.Storm_Cannon] },
    source: 'builtin',
  },
  'threats-rocket': {
    id: 'threats-rocket',
    name: 'Rockets',
    category: 'Threats',
    mapIconTags: [MapIconTag.Rocket_Structure],  // Matches Rocket_Site and Rocket_Site_With_Rocket
    viewMode: 'territoryDimming',
    defaultLayers: { structures: true, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'threats',
    metadata: { stackComparisonIcons: [MapIcon.Rocket_Site] },
    source: 'builtin',
  },
  // Job Views - Resource Mining
  'job-salvage-miner': {
    id: 'job-salvage-miner',
    name: 'Salvage Miner',
    category: 'Job Views',
    subcategory: 'Resource Mining',
    mapIconTags: [MapIconTag.Resource_Salvage, MapIconTag.Refinery],
    filterMode: 'ANY',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: true, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-mining',
    source: 'builtin',
  },
  'job-component-miner': {
    id: 'job-component-miner',
    name: 'Component Miner',
    category: 'Job Views',
    subcategory: 'Resource Mining',
    mapIconTags: [MapIconTag.Resource_Component, MapIconTag.Refinery],
    filterMode: 'ANY',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: true, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-mining',
    source: 'builtin',
  },
  'job-sulfur-miner': {
    id: 'job-sulfur-miner',
    name: 'Sulfur Miner',
    category: 'Job Views',
    subcategory: 'Resource Mining',
    mapIconTags: [MapIconTag.Resource_Sulfur, MapIconTag.Refinery],
    filterMode: 'ANY',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: true, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-mining',
    source: 'builtin',
  },
  'job-coal-miner': {
    id: 'job-coal-miner',
    name: 'Coal Miner',
    category: 'Job Views',
    subcategory: 'Resource Mining',
    mapIconTags: [MapIconTag.Resource_Coal],
    filterMode: 'ANY',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: true, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-mining',
    source: 'builtin',
  },
  'job-oil-miner': {
    id: 'job-oil-miner',
    name: 'Oil Miner',
    category: 'Job Views',
    subcategory: 'Resource Mining',
    mapIconTags: [MapIconTag.Resource_Oil],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: true, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-mining',
    source: 'builtin',
  },
  // Job Views - Logistics
  'job-logi-frontline': {
    id: 'job-logi-frontline',
    name: 'Logistics (Frontline)',
    category: 'Job Views',
    subcategory: 'Logistics',
    mapIconTags: [MapIconTag.Storage],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-logistics',
    source: 'builtin',
  },
  'job-logi-midline': {
    id: 'job-logi-midline',
    name: 'Logistics (Midline)',
    category: 'Job Views',
    subcategory: 'Logistics',
    mapIconTags: [MapIconTag.Logistics],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-logistics',
    source: 'builtin',
  },
  'job-logi-backline': {
    id: 'job-logi-backline',
    name: 'Logistics (Backline)',
    category: 'Job Views',
    subcategory: 'Logistics',
    mapIconTags: [MapIconTag.Logistics, MapIconTag.Production],
    filterMode: 'ANY',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-logistics',
    source: 'builtin',
  },
  // Job Views - Production
  'job-factory': {
    id: 'job-factory',
    name: 'Factory',
    category: 'Job Views',
    subcategory: 'Production',
    mapIconTags: [MapIconTag.Production],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-production',
    source: 'builtin',
  },
  'job-vehicles': {
    id: 'job-vehicles',
    name: 'Vehicles',
    category: 'Job Views',
    subcategory: 'Production',
    mapIconTags: [MapIconTag.Vehicle_Factory],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-production',
    source: 'builtin',
  },
  'job-naval': {
    id: 'job-naval',
    name: 'Naval',
    category: 'Job Views',
    subcategory: 'Production',
    mapIconTags: [MapIconTag.Shipyard],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-production',
    source: 'builtin',
  },
  'job-yard': {
    id: 'job-yard',
    name: 'Yard',
    category: 'Job Views',
    subcategory: 'Production',
    mapIconTags: [MapIconTag.Construction_Yard],
    filterMode: 'ALL',
    viewMode: 'minimal',
    defaultLayers: { structures: true, resources: false, casualties: false, territories: false, minorLocations: false },
    reportContextGroup: 'jobs-production',
    source: 'builtin',
  },
};

// Helper to get all reports (built-in + user)
export function getAllReports(): ReportSpec[] {
  const userReports = loadUserReports();  // From userReports.ts
  return [
    ...Object.values(BUILTIN_REPORTS),
    ...userReports,
  ];
}
```

---

#### Step 1.2: Update `useMapStore.ts` to Support Generic Reports

**File:** `src/state/useMapStore.ts`

Replace hardcoded report mode with generic report support. Use `toggleLayer()` to respect the layer hierarchy tree structure:

```typescript
// New state:
export type ReportMode = ReportSpec | null;

interface MapState {
  activeReport: ReportSpec | null;
  reportLayersSnapshot: LayerState | null;
  setActiveReport: (report: ReportSpec | null, skipConfirm?: boolean) => void;
  reportHighlightedSet: Set<string> | null;
  setReportHighlightedSet: (set: Set<string> | null) => void;
  // ... other state fields ...
}

// Implementation:
export const useMapStore = create<MapState>((set, get) => ({
  // ... existing fields ...

  activeReport: null,
  reportLayersSnapshot: null,
  reportHighlightedSet: null,

  setActiveReport: (report, skipConfirm = false) => {
    const state = get();
    if (report) {
      const currentReport = state.activeReport;
      const isContextSwitch =
        currentReport &&
        report.reportContextGroup &&
        currentReport.reportContextGroup &&
        currentReport.reportContextGroup !== report.reportContextGroup;

      // If switching between different context groups and layers were modified, show confirmation
      if (isContextSwitch && state.reportLayersSnapshot && !skipConfirm) {
        // Trigger confirmation dialog via store state
        set({ pendingReportForConfirmation: report });
        return;
      }

      // For same-context switching: only adjust layers that differ
      const isSameContext =
        currentReport &&
        report.reportContextGroup &&
        currentReport.reportContextGroup === report.reportContextGroup;

      let snapshot = state.reportLayersSnapshot;

      if (!isSameContext) {
        // Different context or first activation: snapshot current state
        snapshot = { ...state.activeLayers };
      }

      // Apply report's layer defaults using toggleLayer (respects tree structure)
      for (const [key, shouldEnable] of Object.entries(report.defaultLayers)) {
        const currentValue = state.activeLayers[key as keyof LayerState] ?? false;
        if (shouldEnable !== currentValue) {
          state.toggleLayer(key, shouldEnable);
        }
      }

      set({
        activeReport: report,
        reportLayersSnapshot: snapshot,
        pendingReportForConfirmation: null,
      });
      state.setPanelState('report', 'half');
    } else {
      // Deactivating a report: restore snapshot
      if (state.reportLayersSnapshot) {
        const currentLayers = state.activeLayers;
        for (const [key, shouldEnable] of Object.entries(state.reportLayersSnapshot)) {
          const currentValue = currentLayers[key as keyof LayerState] ?? false;
          if (shouldEnable !== currentValue) {
            state.toggleLayer(key, shouldEnable);
          }
        }
      }
      set({ 
        activeReport: null, 
        reportLayersSnapshot: null,
        pendingReportForConfirmation: null,
      });
      state.setPanelState('report', 'off');
    }
  },

  setReportHighlightedSet: (set_) => set({ reportHighlightedSet: set_ }),

  // ... existing methods ...
}));
```

**Key Changes:**
- Use `toggleLayer()` instead of direct layer state mutation to respect parent-child constraints
- Add `pendingReportForConfirmation` state field for context-switch confirmation dialog
- Context-aware switching logic: only snapshot on context switch, use toggleLayer for all mutations

**Migration Path:**
- Keep old `activeReportMode` temporarily for backwards compatibility during transition
- Update all usages of `activeReportMode` to use `activeReport`
- Remove old setter once all usages are migrated

---

#### Step 1.3: Create Minimal `ViewModeRules` Utility

**File:** `src/lib/viewModes.ts` (new)

Centralize core styling rules for each view mode. Start minimal; expand as styling is consolidated from components:

```typescript
import { ViewMode } from '../state/reports';

export interface ViewModeRules {
  // Territory opacity/visibility
  territory: {
    normalOpacity: number;
    unaffectedOpacity: number;
    affectedOpacity: number;
    applyGrayscale: boolean;  // For unaffected territories in territoryDimming mode
  };
  // MapIcon visibility
  mapIcon: {
    visibleAtMinZoom: boolean;  // Show icons at MAP_MARKER_MIN_ZOOM?
    affectedOpacity: number;
    unaffectedOpacity: number;
  };
  // Interaction restrictions
  interaction: {
    restrictHoverToAffected: boolean;
    restrictClickToAffected: boolean;
  };
}

export function getViewModeRules(viewMode: ViewMode): ViewModeRules {
  switch (viewMode) {
    case 'territoryDimming':
      return {
        territory: {
          normalOpacity: 0.3,
          unaffectedOpacity: 0.25,
          affectedOpacity: 0.7,
          applyGrayscale: true,
        },
        mapIcon: {
          visibleAtMinZoom: true,
          affectedOpacity: 1,
          unaffectedOpacity: 0.35,
        },
        interaction: {
          restrictHoverToAffected: true,
          restrictClickToAffected: true,
        },
      };

    case 'minimal':
      return {
        territory: {
          normalOpacity: 0.3,
          unaffectedOpacity: 0.3,
          affectedOpacity: 0.3,
          applyGrayscale: false,
        },
        mapIcon: {
          visibleAtMinZoom: true,
          affectedOpacity: 1,
          unaffectedOpacity: 1,
        },
        interaction: {
          restrictHoverToAffected: false,
          restrictClickToAffected: false,
        },
      };

    case 'none':
    default:
      return {
        territory: {
          normalOpacity: 0.3,
          unaffectedOpacity: 0.3,
          affectedOpacity: 0.3,
          applyGrayscale: false,
        },
        mapIcon: {
          visibleAtMinZoom: false,
          affectedOpacity: 1,
          unaffectedOpacity: 1,
        },
        interaction: {
          restrictHoverToAffected: false,
          restrictClickToAffected: false,
        },
      };
  }
}
```

**Note:** Label visibility, team colors, strokes, and other styling will remain in component-level code for now. Consolidate into ViewModeRules incrementally as styling is refactored.

---

### Phase 2: Decouple Territory Diffs from Highlighting

#### Step 2.1: Create Territory Diff Period Mapping

**File:** `src/lib/territoryDiffMapping.ts` (new)

Map ReportSpec IDs to backend territory_diffs table periods:

```typescript
export type TerritoryDiffPeriod = 'daily' | 'threeDay' | 'weekly' | 'allTime';

/**
 * Maps a territory report to the corresponding period in the territory_diffs table.
 * Frontend uses 'territory_daily' naming for clarity; backend stores 'daily'.
 */
export function getTerritoryDiffPeriod(reportId: string): TerritoryDiffPeriod | null {
  switch (reportId) {
    case 'territory-daily': return 'daily';
    case 'territory-three-day': return 'threeDay';
    case 'territory-weekly': return 'weekly';
    case 'territory-all-time': return 'allTime';
    default: return null;
  }
}
```

---

#### Step 2.2: Create `useActiveReportDiff()` Hook

**File:** `src/lib/queries.ts` (add new hook)

Create a hook that fetches the active report's territory diff (if applicable):

```typescript
import { useMapStore } from '../state/useMapStore';
import { getTerritoryDiffPeriod } from './territoryDiffMapping';

/**
 * Fetches the appropriate territory diff for the active report (Option A query pattern).
 * Returns null if no territory report is active.
 */
export function useActiveReportDiff() {
  const activeReport = useMapStore((s) => s.activeReport);
  
  // Compute the period from the active report
  const period = activeReport ? getTerritoryDiffPeriod(activeReport.id) : null;
  
  // Only fetch if we have a valid period (territory reports only)
  const { data, isLoading, error } = useTerritoryDiff(period, {
    enabled: !!period,
  });

  return { data, isLoading, error };
}
```

---

#### Step 2.3: Wire Diffs to MapView and Populate Highlighting

**File:** `src/components/MapView.tsx`

Use the new hook to populate `reportHighlightedSet`:

```typescript
import { useActiveReportDiff } from '../lib/queries';
import { useMapStore } from '../state/useMapStore';

export default function MapView() {
  const { data: diffData } = useActiveReportDiff();
  const setReportHighlightedSet = useMapStore(s => s.setReportHighlightedSet);

  // Populate highlighted set when diff data loads
  useEffect(() => {
    if (diffData?.changes) {
      const highlightedSet = new Set(diffData.changes.map((c: any) => c.id));
      setReportHighlightedSet(highlightedSet);
    } else {
      setReportHighlightedSet(null);
    }
  }, [diffData, setReportHighlightedSet]);

  // ... rest of MapView ...
}
```

---

#### Step 2.4: Update `TerritorySubregionLayer.tsx` to Use `reportHighlightedSet`

**File:** `src/components/TerritorySubregionLayer.tsx`

Replace hardcoded `changedSet` logic with generic `reportHighlightedSet`:

```typescript
interface Props {
  // Remove: changedDaily, changedThreeDay, changedWeekly, changedAllTime
  // Add:
  reportHighlightedSet: Set<string> | null;
  visible: boolean;
  // ... other props ...
}

export default function TerritorySubregionLayer({
  snapshot,
  // changedDaily, changedThreeDay, changedWeekly, changedAllTime,  // REMOVE
  reportHighlightedSet,  // ADD
  visible,
  historyById,
  casualtyRates,
}: Props) {
  // Remove this:
  // const changedSet = useMemo(() => {
  //   if (reportMode === 'territory_daily') return changedDaily;
  //   // ...
  // }, [reportMode, changedDaily, ...]);

  // Use reportHighlightedSet directly:
  const changedSet = reportHighlightedSet;

  // Rest of component logic remains the same, using changedSet
  // ...
}
```

---

### Phase 3: Wire View Modes into Components

#### Step 3.1: Update `TerritorySubregionLayer.tsx` to Use `ViewModeRules`

**File:** `src/components/TerritorySubregionLayer.tsx`

```typescript
import { getViewModeRules } from '../lib/viewModes';

export default function TerritorySubregionLayer({ /* ... */ }) {
  const activeReport = useMapStore(s => s.activeReport);
  const rules = activeReport ? getViewModeRules(activeReport.viewMode) : getViewModeRules('none');

  // Refactor opacity logic to use rules
  const baseOpacity = rules.territory.normalOpacity;
  const unaffectedOpacity = rules.territory.unaffectedOpacity;
  const affectedOpacity = rules.territory.affectedOpacity;
  const highlightedOpacity = rules.territory.highlightedOpacity;

  // In path rendering loop:
  const isHighlighted = changedSet && changedSet.has(territory.id);
  const opacity = isHighlighted ? highlightedOpacity : unaffectedOpacity;
  const color = isHighlighted ? getTeamColors(territory.owner)?.saturated : getTeamColors(territory.owner)?.light;
  const shouldGrayscale = !isHighlighted && rules.territory.applyGrayscale;

  // Apply grayscale filter for unaffected territories
  const filter = shouldGrayscale ? 'grayscale(1)' : 'none';

  // Refactor interaction logic
  const handleHover = (p: PathInfo) => {
    if (rules.interaction.restrictHoverToAffected && !p.highlighted) return;
    // ... show tooltip ...
  };

  const handleClick = (e: React.MouseEvent, p: PathInfo) => {
    if (rules.interaction.restrictClickToAffected && !p.highlighted) return;
    // ... handle click ...
  };

  // Refactor label visibility
  const showLabels = rules.labels.showMajor && p.name;
  // ...
}
```

---

#### Step 3.2: Update `MapView.tsx` LocationsLayer to Use `ViewModeRules`

**File:** `src/components/MapView.tsx`

```typescript
function LocationsLayer({
  snapshot,
  activeLayers,
  reportHighlightedSet,
}: { /* ... */ }) {
  const map = useMap();
  const activeReport = useMapStore(s => s.activeReport);
  const rules = activeReport ? getViewModeRules(activeReport.viewMode) : getViewModeRules('none');

  // Icon visibility based on ViewMode
  const shouldHideIcons = !rules.mapIcon.visibleAtMinZoom && zoom < MAP_MARKER_MIN_ZOOM;
  if (shouldHideIcons) return null;

  // Icon opacity application respecting report highlighting
  const updateIcons = (z: number) => {
    // ... existing code ...
    const isHighlighted = reportHighlightedSet?.has(t.id) ?? false;
    const opacity = isHighlighted ? rules.mapIcon.affectedOpacity : rules.mapIcon.unaffectedOpacity;
    img.style.opacity = String(opacity);
  };

  // ... rest of component ...
}
```

---

### Phase 3: Implement MapIcon Filtering from Reports

#### Step 3.1: Create Report Filter Function with Mode Support

**File:** `src/state/reports.ts` (add to existing)

Add a function to generate icon filters from reports, supporting both ANY and ALL modes:

```typescript
import { MapIconTag } from '../data/map-icons';

/**
 * Returns a filter function that checks if an icon matches the report's tag criteria.
 * Supports both ANY mode (any tag matches) and ALL mode (all tags must match).
 * Returns null if no filtering should be applied (empty tag list).
 */
export function getReportMapIconFilter(report: ReportSpec): ((iconTags: MapIconTag[]) => boolean) | null {
  if (report.mapIconTags.length === 0) return null;  // No icon filtering
  
  const filterMode = report.filterMode ?? 'ANY';
  
  if (filterMode === 'ALL') {
    // All tags must be present in the icon
    return (iconTags: MapIconTag[]) =>
      report.mapIconTags.every(tag => iconTags.includes(tag));
  } else {
    // (ANY mode) At least one tag must match
    return (iconTags: MapIconTag[]) =>
      report.mapIconTags.some(tag => iconTags.includes(tag));
  }
}
```

---

#### Step 3.2: Update MapView.tsx LocationsLayer to Apply Report Filter

**File:** `src/components/MapView.tsx`

Apply report-based icon filtering:

```typescript
import { getReportMapIconFilter } from '../state/reports';

function LocationsLayer({ /* ... */ }) {
  const activeReport = useMapStore(s => s.activeReport);
  const activeLayers = useMapStore(s => s.activeLayers);

  // Get filter function from active report
  const reportIconFilter = useMemo(
    () => activeReport ? getReportMapIconFilter(activeReport) : null,
    [activeReport]
  );

  // Filtering logic:
  // - If a report is active, use its filter (report-based filtering takes precedence)
  // - Otherwise, icon visibility is controlled by layer toggles (existing behavior)
  
  const shouldShowIcon = (iconId: MapIcon, iconTags: MapIconTag[]) => {
    if (reportIconFilter) {
      return reportIconFilter(iconTags);
    }
    // When no report is active, layer toggles control visibility
    return isIconVisibleByLayers(iconId, activeLayers);
  };

  // Apply in marker rendering loop
  // ... existing marker rendering code, use shouldShowIcon to filter ...
}
```

---

### Phase 4: Implement Threats Highlighting

#### Step 4.1: Wire Threats Report Highlighting

**File:** `src/components/MapView.tsx`

Add logic to compute territory highlighting for threats reports when active:

```typescript
import { useMapStore } from '../state/useMapStore';

export default function MapView() {
  const activeReport = useMapStore(s => s.activeReport);
  const setReportHighlightedSet = useMapStore(s => s.setReportHighlightedSet);
  const { data: diffData } = useActiveReportDiff();
  const snapshot = useMapStore(s => s.snapshot);

  // Territory highlighting logic
  useEffect(() => {
    if (!activeReport) {
      setReportHighlightedSet(null);
      return;
    }

    // Territory reports: use diff data
    if (diffData?.changes) {
      const highlightedSet = new Set(diffData.changes.map((c: any) => c.id));
      setReportHighlightedSet(highlightedSet);
    }
    // Threats reports: highlight territories containing threat structures
    else if (activeReport.category === 'Threats' && snapshot) {
      const highlightedSet = new Set<string>();
      
      // Find all locations with the threat's tags
      const relevantLocations = snapshot.locations.filter((loc: any) =>
        getReportMapIconFilter(activeReport)?.(getMapIconTags(loc.iconType)) ?? false
      );

      // Add territories containing these locations
      for (const loc of relevantLocations) {
        const hexId = computeHexId(loc.x, loc.y); // From hexLayout.ts
        highlightedSet.add(hexId);
      }

      setReportHighlightedSet(highlightedSet);
    }
    // Other reports: no highlighting
    else {
      setReportHighlightedSet(null);
    }
  }, [activeReport, diffData, snapshot, setReportHighlightedSet]);

  // ... rest of MapView ...
}
```

---

### Phase 5: Wire Threats Reports to StackComparison

#### Step 5.1: Add StackComparison Logic to setActiveReport

**File:** `src/state/useMapStore.ts`

Update `setActiveReport` to activate StackComparison for threats reports:

```typescript
setActiveReport: (report, skipConfirm = false) => {
  const state = get();
  if (report) {
    // ... existing report activation logic ...

    // Special handling: activate StackComparison for threats reports
    if (report.metadata?.stackComparisonIcons) {
      state.setStackComparisonMapIcon(report.metadata.stackComparisonIcons);
      state.setVictoryBarDrawerState(true);
    } else {
      state.setStackComparisonMapIcon(null);
      state.setVictoryBarDrawerState(false);
    }
  } else {
    // Deactivating any report: close StackComparison
    state.setStackComparisonMapIcon(null);
    state.setVictoryBarDrawerState(false);
    
    // ... existing report deactivation logic ...
  }
}
```

---

### Phase 6: Context-Aware Switching Confirmation Dialog

#### Step 6.1: Add Confirmation Dialog Component

**File:** `src/components/ContextSwitchConfirmationDialog.tsx` (new)

Create a dialog that appears when switching between different context groups:

```typescript
import { useMapStore } from '../state/useMapStore';

export function ContextSwitchConfirmationDialog() {
  const pendingReport = useMapStore(s => s.pendingReportForConfirmation);
  const setActiveReport = useMapStore(s => s.setActiveReport);
  const [open, setOpen] = useState(!!pendingReport);

  if (!pendingReport) return null;

  const handleConfirm = () => {
    // Proceed with the switch, bypassing confirmation
    setActiveReport(pendingReport, true);
    setOpen(false);
  };

  const handleCancel = () => {
    // Clear pending report, stay on current report
    useMapStore.setState({ pendingReportForConfirmation: null });
    setOpen(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogTitle>Switch Report Type?</DialogTitle>
        <DialogDescription>
          Switching to <strong>{pendingReport.name}</strong> will reset your layer changes.
          Continue?
        </DialogDescription>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleConfirm} variant="primary">Switch</Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
```

**Integration:** Render this component in [App.tsx](App.tsx) so it appears at app level.

---

### Phase 7: Merge JobViewPanel into Unified Reports Panel

#### Step 7.1: Update ReportModes.tsx to Show All Reports with Categorization

**File:** `src/components/ReportModes.tsx`

Expand ReportModes to display all reports (Territory, Threats, Job Views) organized by category:

```typescript
import { getAllReports, BUILTIN_REPORTS } from '../state/reports';
import { useMapStore } from '../state/useMapStore';

export default function ReportModes() {
  const activeReport = useMapStore(s => s.activeReport);
  const setActiveReport = useMapStore(s => s.setActiveReport);
  const allReports = getAllReports();

  // Group by category, then subcategory
  const grouped = useMemo(() => {
    const result: Record<string, Record<string, ReportSpec[]>> = {};
    for (const report of allReports) {
      const cat = report.category || 'Other';
      if (!result[cat]) result[cat] = {};
      const subcat = report.subcategory || 'Default';
      if (!result[cat][subcat]) result[cat][subcat] = [];
      result[cat][subcat].push(report);
    }
    return result;
  }, [allReports]);

  return (
    <div className="space-y-4 p-3">
      {Object.entries(grouped).map(([category, subcategories]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">{category}</h3>
          <div className="space-y-3">
            {Object.entries(subcategories).map(([subcat, reports]) => (
              <div key={`${category}-${subcat}`}>
                {subcat !== 'Default' && (
                  <h4 className="text-xs font-medium text-gray-500 ml-2 mb-1">{subcat}</h4>
                )}
                <div className="space-y-1">
                  {reports.map(report => (
                    <button
                      key={report.id}
                      onClick={() =>
                        setActiveReport(activeReport?.id === report.id ? null : report)
                      }
                      className={`w-full px-3 py-2 rounded text-sm border transition ${
                        activeReport?.id === report.id
                          ? 'bg-indigo-700 border-indigo-600'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {report.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**UI Hierarchy:**
```
Territory
  1 Day
  3 Days
  7 Days
  All Time
Threats
  Storm Cannons
  Rockets
Job Views
  Resource Mining
    Salvage Miner
    Component Miner
    ...
  Logistics
    Logistics (Frontline)
    ...
  Production
    Factory
    ...
```

---

#### Step 7.2: Deprecate JobViewPanel

**File:** `src/components/JobViewPanel.tsx`

Mark as deprecated. Once ReportModes is tested and working, remove entirely and update App.tsx to not render it.

---

### Phase 8: User Reports Persistence (Future Phase)

#### Note on User Reports

User report creation, editing, and localStorage persistence are **designed but not implemented** in this phase. The infrastructure (`ReportSpec.source === 'user'`, `userReports.ts` functions, `metadata` fields) is in place to enable this feature in a future release without requiring architectural changes

---

#### Step 5.2: Add Threats Configuration UI (Future)

**File:** `src/components/ReportModes.tsx`

For now, add buttons for individual Threats reports. In the future, allow users to configure:
- Checkboxes for Storm Cannon / Rocket
- Custom combinations saved as user reports

```typescript
// Current: hardcoded buttons
<button onClick={() => setActiveReport(BUILTIN_REPORTS['territory-daily'])}>1 Day</button>
<button onClick={() => setActiveReport(BUILTIN_REPORTS['threats-storm'])}>Storm</button>
<button onClick={() => setActiveReport(BUILTIN_REPORTS['threats-rocket'])}>Rockets</button>

// Future: dynamic rendering from registry
// getAllReports().map(report => ...)
```

---

### Phase 6: User Reports Persistence

#### Step 6.1: Create User Reports Storage

**File:** `src/lib/userReports.ts` (new)

```typescript
import { ReportSpec } from '../state/reports';

const STORAGE_KEY = 'foxhole-reporter-user-reports';

export function loadUserReports(): ReportSpec[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const reports = JSON.parse(stored) as ReportSpec[];
    // Validate before returning
    return reports.filter(r => r.source === 'user' && r.id && r.name);
  } catch (e) {
    console.error('[UserReports] Failed to load:', e);
    return [];
  }
}

export function saveUserReport(report: ReportSpec): void {
  try {
    const existing = loadUserReports();
    const updated = existing.filter(r => r.id !== report.id);
    updated.push({ ...report, source: 'user' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('[UserReports] Failed to save:', e);
  }
}

export function deleteUserReport(id: string): void {
  try {
    const existing = loadUserReports();
    const updated = existing.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('[UserReports] Failed to delete:', e);
  }
}
```

---

#### Step 6.2: Load User Reports on App Startup

**File:** `src/App.tsx` or initialization code

```typescript
useEffect(() => {
  const userReports = loadUserReports();
  // Merge with built-in reports in a global registry/context
  // (could also add to Zustand store for global access)
}, []);
```

---

### Phase 7: Update ReportModes Component

#### Step 7.1: Refactor ReportModes.tsx to Use Report Registry

**File:** `src/components/ReportModes.tsx`

```typescript
import { getAllReports } from '../state/reports';
import { useMapStore } from '../state/useMapStore';

export default function ReportModes() {
  const activeReport = useMapStore(s => s.activeReport);
  const setActiveReport = useMapStore(s => s.setActiveReport);
  const reports = getAllReports();

  // Group reports by category and subcategory
  const grouped = reports.reduce((acc, report) => {
    const category = report.category || 'Other';
    if (!acc[category]) acc[category] = {};
    const subcategory = report.subcategory || 'Default';
    if (!acc[category][subcategory]) acc[category][subcategory] = [];
    acc[category][subcategory].push(report);
    return acc;
  }, {} as Record<string, Record<string, ReportSpec[]>>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, subcategories]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold uppercase text-gray-400 mb-2">{category}</h3>
          <div className="space-y-3">
            {Object.entries(subcategories).map(([subcategory, reports]) => (
              <div key={`${category}-${subcategory}`}>
                {subcategory !== 'Default' && (
                  <h4 className="text-xs font-medium text-gray-500 ml-2 mb-1">{subcategory}</h4>
                )}
                <div className="space-y-1">
                  {reports.map(report => (
                    <button
                      key={report.id}
                      onClick={() => setActiveReport(activeReport?.id === report.id ? null : report)}
                      className={`w-full px-3 py-2 rounded text-sm border transition ${
                        activeReport?.id === report.id
                          ? 'bg-indigo-700 border-indigo-600'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {report.name}

```

---

## Architecture Summary

The refactored Report system unifies Territory ownership tracking, Threats filtering, and Job Views into a single, extensible architecture:

- **Single Report Registry:** Built-in reports (Territory, Threats, Jobs) + user-created reports (future)
- **Decoupled Styling:** ViewMode rules control opacity, visibility, and interaction independent of business logic
- **Smart Layer Management:** Context-aware switching with confirmation dialogs, snapshot/restore behavior
- **Flexible Filtering:** MapIcon filtering with ANY/ALL mode support, no icon filtering when reports inactive
- **Territory Highlighting:** Territory reports use diff data; Threats reports compute from structure locations
- **StackComparison Integration:** Threats reports auto-activate StackComparison drawer with appropriate icons

---

## Implementation Summary

This plan consists of 8 phases:

1. **Phase 1:** Create `ReportSpec` schema, update `useMapStore`, implement minimal `ViewModeRules`
2. **Phase 2:** Create territory diff period mapping and `useActiveReportDiff()` hook
3. **Phase 3:** Implement MapIcon filtering with ANY/ALL modes
4. **Phase 4:** Wire Threats reports to compute territory highlighting
5. **Phase 5:** Integrate Threats reports with StackComparison
6. **Phase 6:** Build context-aware switching confirmation dialog
7. **Phase 7:** Merge JobViewPanel into unified ReportModes component
8. **Phase 8:** Deprecate JobViewPanel and clean up store (future: implement user report persistence)

---

## Files Changed

### New Files Created
- `src/state/reports.ts` - Report specs registry and helpers
- `src/lib/viewModes.ts` - ViewMode rules (minimal set)
- `src/lib/territoryDiffMapping.ts` - Period mapping for territory diffs
- `src/components/ContextSwitchConfirmationDialog.tsx` - Context switch confirmation UI

### Files Modified
- `src/state/useMapStore.ts` - Add `activeReport`, `reportLayersSnapshot`, `reportHighlightedSet`, `setActiveReport()`, `setReportHighlightedSet()`
- `src/components/MapView.tsx` - Use `useActiveReportDiff()`, populate `reportHighlightedSet`, apply report icon filters
- `src/components/TerritorySubregionLayer.tsx` - Use `reportHighlightedSet` and `ViewModeRules`
- `src/components/ReportModes.tsx` - Replace with unified report selector
- `src/App.tsx` - Render `ContextSwitchConfirmationDialog`

### Files Deprecated/Removed
- `src/components/JobViewPanel.tsx` - Deprecate (remove after testing)
- `src/state/jobViews.ts` - Deprecate (functionality merged into `reports.ts`)

---

## Data Flow Summary

```
ReportSpec Registry (built-in + user)
    ↓
User selects report via ReportModes panel
    ↓
setActiveReport() → check context group & show confirmation if needed
    ↓
useMapStore updates:
  - activeReport: ReportSpec
  - reportLayersSnapshot: LayerState (on first activation or context switch)
  - activeLayers: toggled via toggleLayer() to match report defaultLayers
  - stackComparisonIcons: set if report.metadata.stackComparisonIcons exists
    ↓
useActiveReportDiff() fetches territory diffs for territory reports
    ↓
MapView computes reportHighlightedSet from:
  - Territory reports: territory diff changes
  - Threats reports: locations with matching tags
  - Other reports: null (no highlighting)
    ↓
TerritorySubregionLayer & LocationsLayer consume:
  - activeReport → ViewMode rules
  - reportHighlightedSet → territory highlighting
  - Report icon filter → icon visibility
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Period naming (territory_daily vs daily)** | Backend uses generic names; frontend prefix for clarity with other metrics |
| **toggleLayer() for defaults** | Respects parent-child hierarchy in layer tree; prevents invalid states |
| **pendingReportForConfirmation field** | Allows confirmation dialog to control flow without breaking encapsulation |
| **minimal ViewModeRules** | Start with core opacity/visibility; expand as styling consolidates from components |
| **Option A query pattern** | `useActiveReportDiff()` hook encapsulates mapping; transparent, testable, cacheable |
| **Threats highlighting from locations** | Computed on-the-fly from active icon locations; no separate diff data needed |
| **Unified ReportModes component** | Single UI entry point for all report types; JobViewPanel deprecated |
| **Infrastructure for future user reports** | ReportSpec design supports localStorage persistence without rework |

---

## Testing Checklist

- [ ] Territory reports: activate each period, verify correct diffs load and highlight
- [ ] Threats reports: activate each type, verify StackComparison drawer opens with correct icon
- [ ] Layer snapshots: switch contexts, verify confirmation dialog, confirm/cancel behavior
- [ ] Same context: switch between 2+ territory reports, verify layers adjust without snapshot restore
- [ ] MapIcon filtering: verify ANY/ALL modes work correctly, filtering disabled when no report active
- [ ] Casualty overlay: verify it respects layer toggle only, not report mode
- [ ] ViewMode styling: verify opacity, grayscale, interaction restrictions apply per mode
- [ ] UI: verify ReportModes displays all categories/subcategories, selection state correct
- [ ] Backwards compatibility: confirm old `activeReportMode` still works during migration
- [ ] Cross-browser: test on desktop and mobile viewports

---

