import React from 'react';
import { useMapStore } from '../state/useMapStore';

export default function ReportModes() {
  const mode = useMapStore(s => s.activeReportMode);
  const setMode = useMapStore(s => s.setActiveReportMode);
  const onDaily = () => setMode('daily');
  const onWeekly = () => setMode('weekly');
  const isDaily = mode === 'daily';
  const isWeekly = mode === 'weekly';
  return (
    <div className="mt-auto p-4 border-gray-700 text-xs space-y-2">
      
        <div className="flex justify-stretch gap-2">
          <button
            onClick={onDaily}
            className={`px-2 py-1 grow rounded border ${isDaily ? 'bg-gray-700 text-white border-gray-500' : 'bg-gray-800 text-gray-200 border-gray-700'} hover:bg-gray-700`}
            title="Highlight changes in last 24 hours"
          >
            Daily Report
          </button>
          <button
            onClick={onWeekly}
            className={`px-2 py-1 grow rounded border ${isWeekly ? 'bg-gray-700 text-white border-gray-500' : 'bg-gray-800 text-gray-200 border-gray-700'} hover:bg-gray-700`}
            title="Highlight changes in last 7 days"
          >
            Weekly Report
          </button>
        </div>
      
    </div>
  );
}

