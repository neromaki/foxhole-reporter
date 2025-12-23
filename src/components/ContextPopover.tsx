import React, { useState } from 'react';
import ReportModes from './ReportModes';
import { useMapStore } from '../state/useMapStore';


export function ContextPopover() {
  const content = useMapStore((s) => {
    if(s.activeReportMode == 'daily') return `Showing territory changes in the last 24 hours`;
    if(s.activeReportMode == 'weekly') return 'Showing territory changes in the last 7 days';
    return s.contextPopoverContent;
  });
  if (!content) return null;

  return (
    <div className={`absolute top-3 left-1/2 transform -translate-x-1/2 rounded border border-gray-700 bg-gray-800 p-3 text-[16px] text-gray-200 z-[1000]`}>
      <span>{content}</span>
    </div>
  );
}

export default ContextPopover;
