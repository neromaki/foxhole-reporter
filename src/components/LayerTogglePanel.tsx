import React from 'react';
import { useMapStore, LayerKey } from '../state/useMapStore';

const labels: Record<LayerKey, string> = {
  territory: 'Territory (dynamic)',
  logistics: 'Logistics',
  mining: 'Mining',
  production: 'Production',
  intel: 'Intel/Reports',
  frontline: 'Front Lines',
  static: 'Static Map Icons',
  labelsMajor: 'Labels: Major',
  labelsMinor: 'Labels: Minor',
  debugRegions: 'Debug: Region Names'
};

export default function LayerTogglePanel() {
  const active = useMapStore((s) => s.activeLayers);
  const toggle = useMapStore((s) => s.toggleLayer);

  return (
    <div className="p-4 space-y-3 overflow-y-auto">
      <h2 className="text-sm font-semibold tracking-wide text-gray-300 uppercase">Layers</h2>
      <ul className="space-y-2">
        {Object.entries(labels).map(([key, label]) => {
          const k = key as LayerKey;
          return (
            <li key={k}>
              <button
                onClick={() => toggle(k)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm border transition ${active[k] ? 'bg-gray-700 border-gray-600' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
              >
                <span>{label}</span>
                <span className={`h-3 w-3 rounded-full ${active[k] ? 'bg-green-400' : 'bg-gray-600'}`}></span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
