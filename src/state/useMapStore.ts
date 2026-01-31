import { create } from 'zustand';
import type { LocationTile } from '../types/war';
import {
  LayerKey,
  LayerState,
  getChildren,
  getAncestors,
  getDescendants,
  getDefaultLayerState,
} from './layers';
import { MapIcon } from '../data/map-icons';
import { ReportSpec } from './reports';

export type RealtimeConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type PanelType = 'layer' | 'report' | 'info';
export type PanelState = 'off' | 'half' | 'threequarters' | 'full';
export type ClickOutsideBehavior = 'off' | 'half' | null;
export type SelectedLocation = {
  tile: LocationTile;
  lat: number;
  lng: number;
  id: string | null;
  name: string | null;
  owner: string | null;
  history: any | null;
  hexName: string | null;
  source: 'mapIcon' | 'territory';
};
export type TerritoryHistoryEntry = { owner: LocationTile['owner']; at: string };
export type TerritoryHistory = {
  name: string;
  currentOwner: LocationTile['owner'];
  events: TerritoryHistoryEntry[];
};
export type MapMajorLabel = {
    lat: number;
    lng: number;
    text: string;
};

interface MapState {
  activeLayers: LayerState;
  toggleLayer: (key: LayerKey, value?: boolean) => void;
  setLayers: (layers: Partial<LayerState>) => void;
  setAllLayers: (on: boolean) => void;
  resetLayers: () => void;
  activeJobViewId: string | null;
  previousLayersSnapshot: LayerState | null;
  setActiveJobView: (viewId: string | null) => void;
  // New report system fields
  activeReport: ReportSpec | null;
  reportLayersSnapshot: LayerState | null;
  reportHighlightedSet: Set<string> | null;
  pendingReportForConfirmation: ReportSpec | null;
  setActiveReport: (report: ReportSpec | null, skipConfirm?: boolean) => void;
  setReportHighlightedSet: (set: Set<string> | null) => void;
  setPendingReportForConfirmation: (report: ReportSpec | null) => void;
  disabledHexes: Set<string>;
  setDisabledHexes: (hexes: Set<string>) => void;
  realtimeStatus: RealtimeConnectionStatus;
  setRealtimeStatus: (status: RealtimeConnectionStatus) => void;
  contextPopoverContent: string | null;
  setContextPopoverContent: (html: string | null) => void;
  panelState: Record<PanelType, PanelState>;
  panelsOpen: () => boolean;
  setPanelState: (panel: PanelType, state: PanelState) => void;
  panelClickOutsideBehavior: Record<PanelType, ClickOutsideBehavior>;
  setPanelClickOutsideBehavior: (panel: PanelType, behavior: ClickOutsideBehavior) => void;
  selectedLocation: SelectedLocation | null;
  setSelectedLocation: (sel: SelectedLocation | null) => void;
  victoryBarDrawer: boolean;
  setVictoryBarDrawerState: (open: boolean) => void;
  stackComparisonMapIcon: Array<MapIcon> | null;
  setStackComparisonMapIcon: (icon: Array<MapIcon> | null) => void;
  majorLabelsByMap: Map<string, MapMajorLabel[]>;
  setMajorLabelsByMap: (map: Map<string, MapMajorLabel[]>) => void;
};


const defaultLayers: LayerState = getDefaultLayerState();

export const useMapStore = create<MapState>((set, get) => ({
  activeLayers: defaultLayers,
  toggleLayer: (key, value) => set((s) => {
    // If value is explicitly provided, use it; otherwise toggle
    const currentlyOn = !!s.activeLayers[key];
    const targetValue = value !== undefined ? value : !currentlyOn;
    
    // If no change needed, return same state
    if (targetValue === currentlyOn) {
      return {};
    }

    const hasChildren = getChildren(key).length > 0;
    if (!hasChildren) {
      const turningOn = targetValue;
      const nextActiveLayers: LayerState = { ...s.activeLayers, [key]: targetValue };
      if (turningOn) {
        getAncestors(key).forEach((ancestor) => {
          nextActiveLayers[ancestor] = true;
        });
      } else {
        const ancestors = getAncestors(key);
        ancestors.forEach((ancestor) => {
          const children = getChildren(ancestor);
          const allChildrenOff = children.every((child) => nextActiveLayers[child] === false);
          if (allChildrenOff) {
            nextActiveLayers[ancestor] = false;
          }
        });
      }
      return { activeLayers: nextActiveLayers };
    }

    const children = getChildren(key);
    const descendants = getDescendants(key);
    const nextActiveLayers: LayerState = { ...s.activeLayers, [key]: targetValue };

    if (targetValue) {
      const anyDescendantOn = descendants.some((d) => s.activeLayers[d]);
      if (!anyDescendantOn) {
        descendants.forEach((d) => { nextActiveLayers[d] = true; });
      } else {
        children.forEach((child) => { nextActiveLayers[child] = true; });
      }
    } else {
      descendants.forEach((d) => { nextActiveLayers[d] = false; });
    }

    return { activeLayers: nextActiveLayers };
  }),
  setLayers: (layers) => set((s) => ({ activeLayers: { ...s.activeLayers, ...layers } as LayerState })),
  setAllLayers: (on) => set((s) => {
    const updates: Partial<LayerState> = {};
    const allKeys: LayerKey[] = [
      'territories',
      'majorLocations',
      'minorLocations',
      ...Object.keys(s.activeLayers),
    ];
    allKeys.forEach((k) => { updates[k] = on; });
    return { activeLayers: { ...s.activeLayers, ...updates } as LayerState };
  }),
  resetLayers: () => set({ activeLayers: defaultLayers }),
  activeJobViewId: null,
  previousLayersSnapshot: null,
  disabledHexes: new Set<string>(),
  setDisabledHexes: (hexes) => set({ disabledHexes: hexes }),
  realtimeStatus: 'disconnected',
  setRealtimeStatus: (status) => set({ realtimeStatus: status }),
  setActiveJobView: (viewId) => {
    const state = get();
    if (viewId && !state.activeJobViewId) {
      // Activating: snapshot current layers
      set({ activeJobViewId: viewId, previousLayersSnapshot: { ...state.activeLayers } });
    } else if (!viewId && state.activeJobViewId) {
      // Deactivating: restore snapshot if available
      if (state.previousLayersSnapshot) {
        set({ activeLayers: { ...state.previousLayersSnapshot }, activeJobViewId: null, previousLayersSnapshot: null });
      } else {
        set({ activeJobViewId: null });
      }
    } else {
      // Switching directly between job views (no restore)
      set({ activeJobViewId: viewId });
    }
  },
  // New report system implementation
  activeReport: null,
  reportLayersSnapshot: null,
  reportHighlightedSet: null,
  pendingReportForConfirmation: null,
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
        // Store pending report and wait for user confirmation
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
          state.toggleLayer(key as LayerKey, shouldEnable);
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
            state.toggleLayer(key as LayerKey, shouldEnable);
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
  setPendingReportForConfirmation: (report) => set({ pendingReportForConfirmation: report }),
  contextPopoverContent: null,
  setContextPopoverContent: (html) => set({ contextPopoverContent: html }),
  panelState: { layer: 'off', report: 'off', info: 'off' },
  panelsOpen: () => {
    const s = get();
    return Object.values(s.panelState).some((state) => state !== 'off');
  },
  setPanelState: (panel, state) => {
    const s = get();
    const nextPanelState: Record<PanelType, PanelState> = {
      layer: 'off',
      report: s.activeReport != null ? 'half' : 'off',
      info: 'off',
      [panel]: state,
    };
    const shouldClearSelection = nextPanelState.info === 'off';
    set({panelState: nextPanelState});
    window.setTimeout(() => {
      set({selectedLocation: shouldClearSelection ? null : s.selectedLocation});
    }, 250);
  },
  panelClickOutsideBehavior: { layer: 'half', report: 'off', info: 'off' },
  setPanelClickOutsideBehavior: (panel, behavior) => {
    const s = get();
    set({ panelClickOutsideBehavior: { ...s.panelClickOutsideBehavior, [panel]: behavior } });
  },
  selectedLocation: null,
  setSelectedLocation: (sel) => {
    set({ selectedLocation: sel });
  },
  victoryBarDrawer: false,
  setVictoryBarDrawerState: (open) => {
    set({ victoryBarDrawer: open });
  },
  stackComparisonMapIcon: null,
  setStackComparisonMapIcon: (icon) => {
    set({ stackComparisonMapIcon: icon });
  },
  majorLabelsByMap: new Map<string, MapMajorLabel[]>(),
  setMajorLabelsByMap: (map) => set({ majorLabelsByMap: map }),
}));
