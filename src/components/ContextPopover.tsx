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

  return (
    <div className={`absolute top-3 inset-x-3 flex flex-col items-center gap-y-2 z-[1000]`}>
      {/* <div className={`rounded border border-gray-400 bg-gray-200 p-3 text-[16px] text-gray-800`}>
        <span>⌚ Got a minute? <a href="https://forms.gle/1mLUohERKBm8cMnWA" className={`font-bold`} target="_blank" rel="noopener noreferrer">Leave feedback</a> and help me build Foxhole Report!</span>
      </div> */}
        
      {content && (
        <div className={`flex rounded border border-gray-700 bg-gray-800 p-3 text-[16px] text-gray-200`}>
          <span>{content}</span>
        </div>
      )}
    </div>
  );
}

export default ContextPopover;
