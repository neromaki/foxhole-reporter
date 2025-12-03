import React from 'react';
import { useMapStore } from '../state/useMapStore';

export default function TerritoryLegend() {
  const mode = useMapStore(s => s.activeReportMode);
  const setMode = useMapStore(s => s.setActiveReportMode);
  const onDaily = () => setMode('daily');
  const onWeekly = () => setMode('weekly');
  const isDaily = mode === 'daily';
  const isWeekly = mode === 'weekly';
  return (
    <div className="mt-auto p-4 border-t border-gray-700 text-xs space-y-2">
      <h2 className="font-semibold text-gray-300 uppercase tracking-wide">Legend</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <button
            onClick={onDaily}
            className={`px-2 py-1 rounded border ${isDaily ? 'bg-gray-700 text-white border-gray-500' : 'bg-gray-800 text-gray-200 border-gray-700'} hover:bg-gray-700`}
            title="Highlight changes in last 24 hours"
          >
            Daily Report
          </button>
          <button
            onClick={onWeekly}
            className={`px-2 py-1 rounded border ${isWeekly ? 'bg-gray-700 text-white border-gray-500' : 'bg-gray-800 text-gray-200 border-gray-700'} hover:bg-gray-700`}
            title="Highlight changes in last 7 days"
          >
            Weekly Report
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <LegendItem color="bg-coalition" label="Colonial" />
          <LegendItem color="bg-warden" label="Warden" />
          <LegendItem color="bg-neutral" label="Neutral" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-sm ${color}`}></span>
      <span>{label}</span>
    </div>
  );
}
