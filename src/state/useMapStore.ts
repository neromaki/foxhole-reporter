import { create } from 'zustand';

export type LayerKey = 'territory' | 'logistics' | 'mining' | 'production' | 'intel' | 'frontline' | 'static' | 'labelsMajor' | 'labelsMinor';

interface MapState {
  activeLayers: Record<LayerKey, boolean>;
  toggleLayer: (key: LayerKey) => void;
  setLayers: (layers: Partial<Record<LayerKey, boolean>>) => void;
  activeJobViewId: string | null;
  previousLayersSnapshot: Record<LayerKey, boolean> | null;
  setActiveJobView: (viewId: string | null) => void;
}

const defaultLayers: Record<LayerKey, boolean> = {
  territory: true,
  logistics: true,
  mining: true,
  production: true,
  intel: true,
  frontline: true,
  static: true,
  labelsMajor: true,
  labelsMinor: true,
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
  }
}));
