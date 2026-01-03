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

export type ReportMode = 'daily' | 'threeDay' | 'weekly' | 'allTime' | null;
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
  source: 'marker' | 'territory';
};
export type TerritoryHistoryEntry = { owner: LocationTile['owner']; at: string };
export type TerritoryHistory = {
  name: string;
  currentOwner: LocationTile['owner'];
  events: TerritoryHistoryEntry[];
};

interface MapState {
  activeLayers: LayerState;
  toggleLayer: (key: LayerKey) => void;
  setLayers: (layers: Partial<LayerState>) => void;
  setAllLayers: (on: boolean) => void;
  activeJobViewId: string | null;
  previousLayersSnapshot: LayerState | null;
  setActiveJobView: (viewId: string | null) => void;
  activeReportMode: ReportMode;
  setActiveReportMode: (mode: ReportMode) => void;
  disabledHexes: Set<string>;
  setDisabledHexes: (hexes: Set<string>) => void;
  realtimeStatus: RealtimeConnectionStatus;
  setRealtimeStatus: (status: RealtimeConnectionStatus) => void;
  contextPopoverContent: string | null;
  setContextPopoverContent: (html: string | null) => void;
  panelState: Record<PanelType, PanelState>;
  setPanelState: (panel: PanelType, state: PanelState) => void;
  panelClickOutsideBehavior: Record<PanelType, ClickOutsideBehavior>;
  setPanelClickOutsideBehavior: (panel: PanelType, behavior: ClickOutsideBehavior) => void;
  selectedLocation: SelectedLocation | null;
  setSelectedLocation: (sel: SelectedLocation | null) => void;
}


const defaultLayers: LayerState = getDefaultLayerState();

export const useMapStore = create<MapState>((set, get) => ({
  activeLayers: defaultLayers,
  toggleLayer: (key) => set((s) => {
    const hasChildren = getChildren(key).length > 0;
    const currentlyOn = !!s.activeLayers[key];
    if (!hasChildren) {
      const turningOn = !currentlyOn;
      const nextActiveLayers: LayerState = { ...s.activeLayers, [key]: !currentlyOn };
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
    const turnOn = !currentlyOn;
    const nextActiveLayers: LayerState = { ...s.activeLayers, [key]: turnOn };

    if (turnOn) {
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
  activeReportMode: null,
  setActiveReportMode: (mode) => {
    const state = get();
    const next = mode === state.activeReportMode ? null : mode;
    set({ activeReportMode: next });
    state.setPanelState('report', next !== null ? 'half' : 'off');
  },
  contextPopoverContent: null,
  setContextPopoverContent: (html) => set({ contextPopoverContent: html }),
  panelState: { layer: 'off', report: 'off', info: 'off' },
  setPanelState: (panel, state) => {
    set((s) => {
      const nextPanelState: Record<PanelType, PanelState> = {
        layer: 'off',
        report: s.activeReportMode != null ? 'half' : 'off',
        info: 'off',
        [panel]: state,
      };
      const shouldClearSelection = nextPanelState.info === 'off';
      return {
        panelState: nextPanelState,
        selectedLocation: shouldClearSelection ? null : s.selectedLocation,
      };
    });
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
}));
