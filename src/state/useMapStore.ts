import { create } from 'zustand';
import {
  LayerKey,
  LayerState,
  allLayerKeys,
  getChildren,
  getDescendants,
  getDefaultLayerState,
} from './layers';

type ReportMode = 'daily' | 'weekly' | null;

export type RealtimeConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface MapState {
  activeLayers: LayerState;
  toggleLayer: (key: LayerKey) => void;
  setLayers: (layers: Partial<LayerState>) => void;
  setStructureLayers: (on: boolean) => void;
  setResourceLayers: (on: boolean) => void;
  layerSnapshots: Record<string, Record<string, boolean> | undefined>;
  activeJobViewId: string | null;
  previousLayersSnapshot: LayerState | null;
  setActiveJobView: (viewId: string | null) => void;
  activeReportMode: ReportMode;
  setActiveReportMode: (mode: ReportMode) => void;
  disabledHexes: Set<string>;
  setDisabledHexes: (hexes: Set<string>) => void;
  realtimeStatus: RealtimeConnectionStatus;
  setRealtimeStatus: (status: RealtimeConnectionStatus) => void;
}

const defaultLayers: LayerState = getDefaultLayerState();

export const useMapStore = create<MapState>((set, get) => ({
  activeLayers: defaultLayers,
  layerSnapshots: {},
  toggleLayer: (key) => set((s) => {
    const hasChildren = getChildren(key).length > 0;
    const currentlyOn = !!s.activeLayers[key];
    if (!hasChildren) {
      return { activeLayers: { ...s.activeLayers, [key]: !currentlyOn } };
    }

    // Parent toggle logic with child-state snapshot
    const descendants = getDescendants(key);
    const nextActiveLayers: LayerState = { ...s.activeLayers };
    const nextSnapshots = { ...s.layerSnapshots } as Record<string, Record<string, boolean> | undefined>;

    if (currentlyOn) {
      // turning off: snapshot descendant states
      const snap: Record<string, boolean> = {};
      descendants.forEach((d) => { snap[d] = s.activeLayers[d]; });
      nextSnapshots[key] = snap;
      nextActiveLayers[key] = false;
      return { activeLayers: nextActiveLayers, layerSnapshots: nextSnapshots };
    } else {
      // turning on: restore snapshot if any descendant was on, else turn all descendants on
      const snap = nextSnapshots[key];
      const anyOn = snap ? Object.values(snap).some(Boolean) : false;
      nextActiveLayers[key] = true;
      if (anyOn && snap) {
        descendants.forEach((d) => { nextActiveLayers[d] = snap[d] ?? true; });
      } else {
        descendants.forEach((d) => { nextActiveLayers[d] = true; });
      }
      nextSnapshots[key] = undefined;
      return { activeLayers: nextActiveLayers, layerSnapshots: nextSnapshots };
    }
  }),
  setLayers: (layers) => set((s) => ({ activeLayers: { ...s.activeLayers, ...layers } as LayerState })),
  setStructureLayers: (on) => set((s) => {
    const updates: Partial<LayerState> = {};
    getDescendants('structures').concat(['structures']).forEach((k) => { updates[k] = on; });
    return { activeLayers: { ...s.activeLayers, ...updates } as LayerState };
  }),
  setResourceLayers: (on) => set((s) => {
    const updates: Partial<LayerState> = {};
    getDescendants('resources').concat(['resources']).forEach((k) => { updates[k] = on; });
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
  }
}));
