import { create } from 'zustand';

export type LayerKey = 'locations' | 'territories' | 'resources' | 'majorLocations' | 'minorLocations';

type ReportMode = 'daily' | 'weekly' | null;

interface MapState {
  activeLayers: Record<LayerKey, boolean>;
  toggleLayer: (key: LayerKey) => void;
  setLayers: (layers: Partial<Record<LayerKey, boolean>>) => void;
  activeJobViewId: string | null;
  previousLayersSnapshot: Record<LayerKey, boolean> | null;
  setActiveJobView: (viewId: string | null) => void;
  activeReportMode: ReportMode;
  setActiveReportMode: (mode: ReportMode) => void;
}

const defaultLayers: Record<LayerKey, boolean> = {
  locations: false,
  territories: true,
  resources: true,
  majorLocations: true,
  minorLocations: true,
};

export const useMapStore = create<MapState>((set, get) => ({
  activeLayers: defaultLayers,
  toggleLayer: (key) => set((s) => ({ activeLayers: { ...s.activeLayers, [key]: !s.activeLayers[key] } })),
  setLayers: (layers) => set((s) => ({ activeLayers: { ...s.activeLayers, ...layers } })),
  activeJobViewId: null,
  previousLayersSnapshot: null,
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
