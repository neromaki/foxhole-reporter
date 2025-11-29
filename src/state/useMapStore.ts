import { create } from 'zustand';

export type LayerKey = 'territory' | 'logistics' | 'mining' | 'production' | 'intel' | 'frontline' | 'static' | 'labelsMajor' | 'labelsMinor' | 'debugRegions';
export type DataSource = 'warapi' | 'supabase';

interface MapState {
  activeLayers: Record<LayerKey, boolean>;
  dataSource: DataSource;
  toggleLayer: (key: LayerKey) => void;
  setLayers: (layers: Partial<Record<LayerKey, boolean>>) => void;
  setDataSource: (source: DataSource) => void;
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
  debugRegions: false,
};

export const useMapStore = create<MapState>((set) => ({
  activeLayers: defaultLayers,
  dataSource: 'warapi',
  toggleLayer: (key) => set((s) => ({ activeLayers: { ...s.activeLayers, [key]: !s.activeLayers[key] } })),
  setLayers: (layers) => set((s) => ({ activeLayers: { ...s.activeLayers, ...layers } })),
  setDataSource: (source) => set({ dataSource: source })
}));
