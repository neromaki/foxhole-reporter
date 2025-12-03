import React from 'react';
import { useMapStore, LayerKey } from '../state/useMapStore';
import { MapIcon, MapIconTag } from '../data/map-icons';

// Map which tags each layer controls. Extend as needed.
export const layerTagsByKey: Partial<Record<LayerKey, MapIconTag[]>> = {
  resources: [MapIconTag.Resource],
  // Extend with other layer->tag mappings as needed
};

const labels: Record<LayerKey, string> = {
  territory: 'Territory (dynamic)',
  resources: 'Resources',
  majorLocations: 'Major locations',
  minorLocations: 'Minor locations',
};

export default function LayerTogglePanel() {
  const active = useMapStore((s) => s.activeLayers);
  const toggle = useMapStore((s) => s.toggleLayer);
  const activeJobViewId = useMapStore(s => s.activeJobViewId);

  return (
    <div className="p-4 space-y-3 overflow-y-auto">
      <h2 className="text-sm font-semibold tracking-wide text-gray-300 uppercase">Layers</h2>
      <ul className="space-y-2">
        {Object.entries(labels).map(([key, label]) => {
          const k = key as LayerKey;
          return (
            <li key={k}>
              <button
                onClick={() => {
                  if (activeJobViewId && (k === 'territory' || k === 'majorLocations')) return; // locked under job view
                  toggle(k);
                }}
                disabled={!!activeJobViewId && (k === 'territory' || k === 'minorLocations')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm border transition ${active[k] ? 'bg-gray-700 border-gray-600' : 'bg-gray-900 border-gray-800 hover:border-gray-700'} ${activeJobViewId && (k === 'territory' || k === 'minorLocations') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span>{label}</span>
                <span className={`h-3 w-3 rounded-full ${active[k] ? 'bg-green-400' : 'bg-gray-600'}`}></span>
              </button>
            </li>
          );
        })}
      </ul>
      {activeJobViewId && (
        <div className="mt-2 text-[10px] text-gray-400 space-y-0.5">
          <div>Job View active: territory forced on; minor labels hidden.</div>
        </div>
      )}
    </div>
  );
}
