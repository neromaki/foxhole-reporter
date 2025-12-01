import React from 'react';
import MapView from './components/MapView';
import LayerTogglePanel from './components/LayerTogglePanel';
import JobViewPanel from './components/JobViewPanel';
import TerritoryLegend from './components/TerritoryLegend';

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside className="w-[28rem] bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-semibold">Foxhole Reporter</h1>
          <p className="text-xs text-gray-400">Live territory & logistics overlays</p>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 overflow-y-auto">
            <LayerTogglePanel />
          </div>
          <div className="w-1/2 overflow-y-auto">
            <JobViewPanel />
          </div>
        </div>
        <TerritoryLegend />
      </aside>
      <main className="flex-1">
        <MapView />
      </main>
    </div>
  );
}
