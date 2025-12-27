import React, { useState } from 'react';
import ReportModes from './ReportModes';
import { useMapStore } from '../state/useMapStore';


export function ContextPopover() {
  const content = useMapStore((s) => {
    if(s.activeReportMode == 'daily') return `Showing territory changes since 24 hours ago`;
    if(s.activeReportMode == 'threeDay') return 'Showing territory changes since 3 days ago';
    if(s.activeReportMode == 'weekly') return 'Showing territory changes since 7 days ago';
    if(s.activeReportMode == 'allTime') return 'Showing territory changes since the start of the war';
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
