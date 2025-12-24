import React from 'react';
import { useMapStore } from '../state/useMapStore';

export default function ReportModes() {
  const mode = useMapStore(s => s.activeReportMode);
  const setMode = useMapStore(s => s.setActiveReportMode);
  const onDaily = () => setMode('daily');
  const onWeekly = () => setMode('weekly');
  const isDaily = mode === 'daily';
  const isWeekly = mode === 'weekly';
  const buttonStyle = {
    base: `px-2 py-1 grow rounded border`,
    active: `bg-gray-200 text-gray-800 border-gray-500 hover:bg-gray-100`,
    inactive: `bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-600`,
  };

  return (
    <div className={`mt-3 rounded border border-gray-700 bg-gray-700 p-3 text-sm text-gray-200`}>
      <div className="flex flex-col mb-3">
        <span className="font-bold"><div className="text-xs text-gray-300">Territory reports</div></span>
        <span className="text-xs text-gray-400">View territory changes across time periods</span>
      </div>
      
        <div className="flex justify-stretch gap-2">
          <button
            onClick={onDaily}
            className={`${buttonStyle.base} ${isDaily ? buttonStyle.active : buttonStyle.inactive}`}
            title="Highlight changes in last 24 hours"
          >
            Last 24 hours
          </button>
          <button
            onClick={onWeekly}
            className={`${buttonStyle.base} ${isWeekly ? buttonStyle.active : buttonStyle.inactive}`}
            title="Highlight changes in last 7 days"
          >
            Last 7 days
          </button>
        </div>
      
    </div>
  );
}

