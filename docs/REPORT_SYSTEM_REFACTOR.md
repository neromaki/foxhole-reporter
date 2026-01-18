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
- Allows user-created, persistent reports (localStorage initially)
- Decouples visual "view modes" (territory dimming, minimal, none) from business logic
- Enables future complex reports (stacked overlays, data union, custom analytics)
- Snapshots/restores user layer preferences when entering/exiting reports

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

export interface ReportMetadata {
  // Extensible for future complexity
  // Examples:
  // - { sources: ['threat-data', 'casualty-data'], union: true }
  // - { highlightZones: 'threat-estimation' }
  // Leave open for now; allow arbitrary key-value pairs
  [key: string]: any;
}

export interface ReportSpec {
  id: string;                    // Unique identifier (e.g., 'logistics-frontline', 'threats-storm')
  name: string;                  // Display name (e.g., 'Logistics (Frontline)', 'Storm Cannons')
  category: string;              // Primary category (e.g., 'Territory', 'Threats', 'Jobs')
  subcategory?: string;          // Optional secondary grouping (e.g., 'Resource Mining', 'Logistics')
  mapIconTags: MapIconTag[];     // MapIcon tags to filter/show (empty = show no icons)
  viewMode: ViewMode;            // Visual presentation mode
  defaultLayers: LayerState;     // Complete desired layer state when report activates
  reportContextGroup?: string;   // Group for context-aware report switching (e.g., 'territory', 'threats', 'jobs-mining')
  metadata?: ReportMetadata;     // Future: complexity hints, data sources, etc.
  source: ReportSource;          // 'builtin' (immutable) or 'user' (from localStorage)
}
```

**Built-in Reports Registry:**

```typescript
export const BUILTIN_REPORTS: Record<string, ReportSpec> = {
  // Territory Reports
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
    mapIconTags: [MapIconTag.Rocket, MapIconTag.Rocket_Site],
    viewMode: 'territoryDimming',
    defaultLayers: { structures: true, territories: true, resources: false, casualties: false, minorLocations: false },
    reportContextGroup: 'threats',
    metadata: { stackComparisonIcons: [MapIcon.Rocket] },
    source: 'builtin',
  },
  // Job Views - Resource Mining
  'job-salvage-miner': {
    id: 'job-salvage-miner',
    name: 'Salvage Miner',
    category: 'Job Views',
    subcategory: 'Resource Mining',
    mapIconTags: [MapIconTag.Resource_Salvage, MapIconTag.Refinery],
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

Replace hardcoded report mode with generic report support:

```typescript
// Current state (to be replaced):
// export type ReportMode = 'territory_daily' | 'territory_threeDay' | 'territory_weekly' | 'territory_allTime' | 'threats' | null;
// activeReportMode: ReportMode;
// setActiveReportMode: (mode: ReportMode) => void;

// New state:
export type ReportMode = ReportSpec | null;  // Change: now a spec object

interface MapState {
  activeReport: ReportSpec | null;
  reportLayersSnapshot: LayerState | null;
  setActiveReport: (report: ReportSpec | null) => void;
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
        // Show confirmation dialog (implementation in component layer)
        // User can confirm to proceed, which will call setActiveReport(report, true)
        state.showContextSwitchConfirmation(report);
        return;
      }

      // For same-context switching: only remove previous report's defaultLayers, apply new ones
      const isSameContext =
        currentReport &&
        report.reportContextGroup &&
        currentReport.reportContextGroup === report.reportContextGroup;

      let snapshot = state.reportLayersSnapshot;
      let nextLayers: LayerState;

      if (isSameContext && snapshot) {
        // Same context: remove old report's defaults, apply new report's defaults
        nextLayers = removeLayerDefaults(snapshot, currentReport!.defaultLayers);
        nextLayers = applyLayerDefaults(nextLayers, report.defaultLayers);
      } else {
        // Different context or first activation: full snapshot and apply
        snapshot = { ...state.activeLayers };
        nextLayers = report.defaultLayers;
      }

      set({
        activeReport: report,
        reportLayersSnapshot: snapshot,
        activeLayers: nextLayers,
      });
      state.setPanelState('report', 'half');
    } else {
      // Deactivating a report: restore snapshot
      if (state.reportLayersSnapshot) {
        set({
          activeReport: null,
          reportLayersSnapshot: null,
          activeLayers: state.reportLayersSnapshot,
        });
      } else {
        set({ activeReport: null, reportLayersSnapshot: null });
      }
      state.setPanelState('report', 'off');
    }
  },

  setReportHighlightedSet: (set_) => set({ reportHighlightedSet: set_ }),

  // ... existing methods ...
}));

// Helper to apply report defaults completely (replaces all layers with report's desired state)
function applyLayerDefaults(base: LayerState, reportDefaults: LayerState): LayerState {
  return { ...reportDefaults };
}

// Helper to remove a report's defaults from current state (for context-aware switching)
function removeLayerDefaults(current: LayerState, reportDefaults: LayerState): LayerState {
  // Remove only the layers that the report had enabled; preserve everything else
  const result = { ...current };
  for (const [key, wasEnabled] of Object.entries(reportDefaults)) {
    if (wasEnabled) {
      result[key as keyof LayerState] = false;
    }
  }
  return result;
}
```

**Migration Path:**
- Keep old `activeReportMode` temporarily for backwards compatibility during transition
- Update all usages of `activeReportMode` to use `activeReport` and extract properties as needed
- Remove old setter once all usages are migrated

---

#### Step 1.3: Create `ViewModeRenderer` Utility

**File:** `src/lib/viewModes.ts` (new)

Centralize styling/interaction rules for each view mode:

```typescript
import { ViewMode } from '../state/reports';

export interface ViewModeRules {
  // Territory opacity/color rules
  territory: {
    normalOpacity: number;
    unaffectedOpacity: number;
    affectedOpacity: number;
    highlightedOpacity: number;
    applyGrayscale: boolean;  // For unaffected territories
  };
  // MapIcon visibility/opacity
  mapIcon: {
    visibleInMinZoom: boolean;  // Show icons even at minimum zoom?
    affectedOpacity: number;
    unaffectedOpacity: number;
  };
  // Interaction rules
  interaction: {
    restrictHoverToAffected: boolean;  // Only show hover on highlighted territories
    restrictClickToAffected: boolean;  // Only allow clicks on highlighted territories
  };
  // Label visibility
  labels: {
    showMajor: boolean;
    showMinor: boolean;
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
          highlightedOpacity: 0.8,
          applyGrayscale: true,
        },
        mapIcon: {
          visibleInMinZoom: true,
          affectedOpacity: 1,
          unaffectedOpacity: 0.35,
        },
        interaction: {
          restrictHoverToAffected: true,
          restrictClickToAffected: true,
        },
        labels: {
          showMajor: true,
          showMinor: false,
        },
      };

    case 'minimal':
      return {
        territory: {
          normalOpacity: 0.3,
          unaffectedOpacity: 0.3,
          affectedOpacity: 0.3,
          highlightedOpacity: 0.3,
          applyGrayscale: false,
        },
        mapIcon: {
          visibleInMinZoom: true,
          affectedOpacity: 1,
          unaffectedOpacity: 1,
        },
        interaction: {
          restrictHoverToAffected: false,
          restrictClickToAffected: false,
        },
        labels: {
          showMajor: true,
          showMinor: false,
        },
      };

    case 'none':
    default:
      return {
        territory: {
          normalOpacity: 0.3,
          unaffectedOpacity: 0.3,
          affectedOpacity: 0.3,
          highlightedOpacity: 0.3,
          applyGrayscale: false,
        },
        mapIcon: {
          visibleInMinZoom: false,
          affectedOpacity: 1,
          unaffectedOpacity: 1,
        },
        interaction: {
          restrictHoverToAffected: false,
          restrictClickToAffected: false,
        },
        labels: {
          showMajor: true,
          showMinor: true,
        },
      };
  }
}
```

---

### Phase 2: Decouple Territory Diffs from Highlighting

#### Step 2.1: Refactor Territory Diff Mapping

**File:** `src/lib/queries.ts`

Instead of mapping reports to diff sets in components, compute the highlighted set in the query/store layer:

```typescript
// Add to queries.ts or create new file src/lib/territoryDiffMapping.ts
export function getTerritoryDiffForReport(report: ReportSpec): 'territory_daily' | 'territory_threeDay' | 'territory_weekly' | 'territory_allTime' | null {
  if (report.id === 'territory-daily') return 'territory_daily';
  if (report.id === 'territory-three-day') return 'territory_threeDay';
  if (report.id === 'territory-weekly') return 'territory_weekly';
  if (report.id === 'territory-all-time') return 'territory_allTime';
  return null;
}
```

**In MapView.tsx:**

```typescript
// Fetch the appropriate diff based on active report
const diffPeriod = activeReport ? getTerritoryDiffForReport(activeReport) : null;
const { data: diffData } = useTerritoryDiff(diffPeriod, { enabled: !!diffPeriod });

// Compute highlighted set and populate store
useEffect(() => {
  if (activeReport && diffData?.changes) {
    const highlightedSet = new Set(diffData.changes.map((c: { id: string }) => c.id));
    setReportHighlightedSet(highlightedSet);
  } else {
    setReportHighlightedSet(null);
  }
}, [activeReport, diffData, setReportHighlightedSet]);
```

---

#### Step 2.2: Update `TerritorySubregionLayer.tsx` to Use `reportHighlightedSet`

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
  // Remove changedDaily, changedThreeDay, etc.
  reportHighlightedSet,
}: { /* ... */ }) {
  const map = useMap();
  const activeReport = useMapStore(s => s.activeReport);
  const rules = activeReport ? getViewModeRules(activeReport.viewMode) : getViewModeRules('none');

  // Refactor visibility condition for MapIcons
  // Current: if ((zoom < MAP_MARKER_MIN_ZOOM || reportMode)) return null;
  // New:
  const shouldHideIcons = !rules.mapIcon.visibleInMinZoom && zoom < MAP_MARKER_MIN_ZOOM;
  if (shouldHideIcons) return null;

  // Refactor icon opacity application
  const updateIcons = (z: number) => {
    // ... existing code ...
    const isHighlighted = reportHighlightedSet?.has(t.id) ?? false;
    const opacity = isHighlighted ? rules.mapIcon.affectedOpacity : rules.mapIcon.unaffectedOpacity;
    img.style.opacity = String(opacity);
  };

  // Refactor label visibility
  const minorVisible = activeLayers.minorLocations && rules.labels.showMinor;
  // ...
}
```

---

#### Step 3.3: Update HexInfo Casualty Overlay

**File:** `src/components/HexInfo.tsx`

Casualty overlay visibility is driven solely by the Casualties layer toggle, like any other layer:

```typescript
// Casualty overlay rendering:
const casualtyOverlay = activeLayers.casualties && casualtyRates ? <HexCasualties ... /> : null;
// No special handling for activeReport needed
```

The `activeLayers.casualties` value will be controlled by each report's `defaultLayers`, so casualties will be shown/hidden as configured per report. Verify and remove any existing special-case logic that hides casualties when a report is active.

---

### Phase 4: Implement MapIcon Filtering from Reports

#### Step 4.1: Create Report Filter Function

**File:** `src/state/reports.ts` (add to existing)

```typescript
export function getReportMapIconFilter(report: ReportSpec): ((iconTags: MapIconTag[]) => boolean) | null {
  if (report.mapIconTags.length === 0) return null;  // No filtering
  return (iconTags: MapIconTag[]) =>
    report.mapIconTags.some(tag => iconTags.includes(tag));
}
```

---

#### Step 4.2: Update MapView.tsx LocationsLayer to Use Report Filter

**File:** `src/components/MapView.tsx`

```typescript
function LocationsLayer({ /* ... */ }) {
  const activeReport = useMapStore(s => s.activeReport);
  const activeLayers = useMapStore(s => s.activeLayers);

  // Get filter function from report or layer toggles
  const reportFilter = activeReport ? getReportMapIconFilter(activeReport) : null;

  const jobViewFilter = useMemo(() => {
    if (reportFilter) return reportFilter;
    // Fallback to layer-based filtering
    const excluded = new Set<number>();
    for (const [key, isOn] of Object.entries(activeLayers)) {
      if (isOn) continue;
      const tags = (layerTagsByKey as any)[key];
      if (!tags) continue;
      for (const tag of tags) {
        const icons = getMapIconsByTag(tag);
        for (const mi of icons) excluded.add(mi.id);
      }
    }
    return (iconTags: MapIconTag[]) => {
      const mi = getMapIcon(...);  // pseudocode
      return !excluded.has(mi.id);
    };
  }, [reportFilter, activeLayers]);

  // Use jobViewFilter as before
  // ...
}
```

---

### Phase 5: Threats Report & StackComparison

#### Step 5.1: Wire Threats Report to StackComparison

**File:** `src/state/useMapStore.ts`

Modify `setActiveReport` to handle Threats report metadata:

```typescript
setActiveReport: (report) => {
  const state = get();
  if (report) {
    // ... existing logic ...

    // Special handling for Threats report
    if (report.metadata?.stackComparisonIcons) {
      state.setStackComparisonMapIcon(report.metadata.stackComparisonIcons);
      state.setVictoryBarDrawerState(true);
    } else {
      state.setStackComparisonMapIcon(null);
      state.setVictoryBarDrawerState(false);
    }
  } else {
    // Deactivating report: clear StackComparison
    state.setStackComparisonMapIcon(null);
    state.setVictoryBarDrawerState(false);
    // ... restore layers ...
  }
};
```

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

---

### Phase 8: Remove/Deprecate Old Systems

#### Step 8.1: Deprecate JobView System

**Files to remove or disable:**
- `src/components/JobViewPanel.tsx` - No longer needed
- `src/state/jobViews.ts` - Functionality merged into reports.ts
- References to `activeJobViewId` in store (after migrating all usages)

Replace JobViewPanel with Reports panel (or fold into existing ReportModes.tsx).

---

#### Step 8.2: Clean Up Store

**File:** `src/state/useMapStore.ts`

After migration, remove:
- `activeJobViewId`
- `previousLayersSnapshot` (replace with `reportLayersSnapshot`)
- Old setter `setActiveJobView`
- Old report mode type and setter

---

## Decisions & Resolutions

### ✅ Resolved Questions

1. **Report Categories**: Added `category` and `subcategory` fields to `ReportSpec` for two-level grouping (scalable for future expansion)

2. **Default Layer Merging**: `defaultLayers` represents complete desired state; unspecified layers default to `false`. Ensures predictable behavior for user-created reports.

3. **MapIconTag Validation**: Hybrid approach (Option C) - validate at save time with user-friendly errors, plus runtime safety checks for corrupted localStorage

4. **ViewMode Restrictions**: Strict whitelist enforced: `'territoryDimming' | 'minimal' | 'none'`. New view modes require code updates.

5. **Report Switching Behavior**: Context-aware switching with `reportContextGroup` field
   - **Same context**: Seamlessly switch between reports, preserving user's layer toggles
   - **Different context**: Restore original snapshot with confirmation dialog if layers were modified
   - Prevents unexpected layer state changes and confusion

6. **Casualty Layer**: Treated like any other layer - controlled entirely by `defaultLayers`, no special handling
   - Removed `hideWhenActive` from `ViewModeRules`
   - Casualties visibility follows layer toggle and report settings

7. **Complex Reports (Future)**: Single `viewMode` per report; multiple sources contribute to highlight sets only (union/intersection). ViewMode is not combined.

8. **StackComparison Multi-Icon**: VictoryBar already handles multiple icons correctly (vertical stack). No changes needed.

---

## Implementation Notes for Key Features

### Context-Aware Report Switching

When switching between reports:

1. **Same context group** (e.g., territory_daily → territory_weekly):
   - Remove previous report's `defaultLayers` from active state
   - Apply new report's `defaultLayers`
   - Preserve any manual toggles user made within the context

2. **Different context groups** (e.g., territory → jobs-mining):
   - Restore original snapshot that was saved before entering first report
   - If user made changes, show confirmation dialog:
     - "Switching to [New Report] will reset your layer changes. Continue?"
     - Allow user to cancel or proceed

3. **First activation**:
   - Snapshot user's current `activeLayers`
   - Apply report's `defaultLayers` completely

### User Report Validation

When saving user reports:
- Validate `mapIconTags` exist in enum (with graceful fallback)
- Validate `viewMode` is in whitelist
- Ensure required fields present (id, name, category, viewMode, defaultLayers)
- Return user-friendly validation errors via UI

At runtime:
- Silently filter invalid tags
- Fallback to 'none' viewMode if invalid
- Log warnings to console for debugging

## Implementation Order & Phases Summary

1. **Phase 1 (Core):** Create ReportSpec schema, update store, create ViewModeRenderer
2. **Phase 2 (Decoupling):** Refactor Territory diffs to use generic `reportHighlightedSet`
3. **Phase 3 (Styling):** Wire ViewModeRules into components
4. **Phase 4 (Filtering):** Implement MapIcon filtering from report tags
5. **Phase 5 (Features):** Wire Threats report to StackComparison
6. **Phase 6 (Persistence):** Add localStorage for user reports
7. **Phase 7 (UI):** Refactor ReportModes component
8. **Phase 8 (Cleanup):** Remove JobView system, clean up store

---

## Files Created/Modified

### New Files
- `src/state/reports.ts` - Report specs and registry
- `src/lib/viewModes.ts` - ViewMode rules
- `src/lib/userReports.ts` - localStorage persistence
- `src/lib/territoryDiffMapping.ts` (optional) - Territory diff mapping

### Modified Files
- `src/state/useMapStore.ts` - Add report state and logic
- `src/components/MapView.tsx` - Use activeReport and ViewModeRules
- `src/components/TerritorySubregionLayer.tsx` - Use reportHighlightedSet and ViewModeRules
- `src/components/ReportModes.tsx` - Dynamic report rendering
- `src/components/HexInfo.tsx` - Verify casualty layer independence
- `src/App.tsx` - Load user reports on startup

### Deprecated/Removed
- `src/components/JobViewPanel.tsx` - Remove
- `src/state/jobViews.ts` - Remove (functionality in reports.ts)

---

## Testing Checklist

- [ ] Activate Territory reports; verify diff highlighting works
- [ ] Activate Threats report; verify StackComparison drawer opens
- [ ] Switch between reports; verify layer snapshots work
- [ ] Manually toggle layers in report mode; verify toggles apply
- [ ] Exit report mode; verify layers restore to pre-activation state
- [ ] Create user report via localStorage; verify it loads on app restart
- [ ] Verify casualty overlay visibility follows layer toggle only
- [ ] Verify MapIcon filtering works for both Territory and Threats reports
- [ ] Verify ViewMode styling applies correctly (opacity, grayscale, etc.)
- [ ] Verify interaction restrictions (hover/click) work in territoryDimming mode
- [ ] Test on touch and desktop devices
- [ ] Verify label visibility rules apply per ViewMode

---

## Notes for Implementation Agent

When implementing this plan:

1. **Run tests frequently** - This is a large refactor with many interconnected systems. Test each phase before moving to the next.

2. **Preserve backwards compatibility initially** - Keep old store fields/methods during transition, mark as deprecated, remove after full migration.

3. **Check component subscriptions** - Many components subscribe to `activeReportMode`, `activeJobViewId`, and diff sets. Ensure all usages are updated to use new `activeReport` and `reportHighlightedSet`.

4. **Verify mapIcon filtering** - The JobView filtering logic is complex. Test that report filters produce the same results as old JobView filters for parity.

5. **User report validation** - Consider adding a validation UI (toast/notification) for invalid user reports, or silent fallback to defaults.

6. **Documentation** - Update component comments to reflect new report structure; remove old ReportMode comments.

7. **TypeScript** - Ensure strict typing; ReportSpec should be immutable/readonly where possible to prevent accidental mutations.

---

