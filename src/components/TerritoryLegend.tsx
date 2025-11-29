import React from 'react';

export default function TerritoryLegend() {
  return (
    <div className="mt-auto p-4 border-t border-gray-700 text-xs space-y-2">
      <h2 className="font-semibold text-gray-300 uppercase tracking-wide">Legend</h2>
      <div className="flex flex-col gap-1">
        <LegendItem color="bg-coalition" label="Colonial" />
        <LegendItem color="bg-warden" label="Warden" />
        <LegendItem color="bg-neutral" label="Neutral" />
        <LegendItem color="bg-purple-500" label="Changed (24h)" />
        <LegendItem color="bg-amber-500" label="Changed (7d)" />
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
