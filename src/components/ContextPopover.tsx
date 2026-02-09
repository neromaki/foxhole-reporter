import React, { useState } from 'react';
import ReportModes from './ReportModes';
import { useMapStore } from '../state/useMapStore';


export function ContextPopover() {
  const activeReport = useMapStore((s) => s.activeReport);
  const reportModeActive = activeReport != null;
  const setActiveReport = useMapStore((s) => s.setActiveReport);
  const setPanelState = useMapStore((s) => s.setPanelState);

  const content = useMapStore((s) => {
    return activeReport ? activeReport?.tooltip || null : null;
  });

  return (
    <div className={`flex flex-1 flex-col items-center w-full gap-y-2 z-[1000] pointer-events-auto`}>
      {/* <div className={`rounded border border-gray-400 bg-gray-200 p-3 text-[16px] text-gray-800`}>
        <span>⌚ Got a minute? <a href="https://forms.gle/1mLUohERKBm8cMnWA" className={`font-bold`} target="_blank" rel="noopener noreferrer">Leave feedback</a> and help me build Foxhole Report!</span>
      </div> */}
        
      {content && (
        <div className={`flex w-full md:w-auto rounded bg-gray-200 text-[16px] text-gray-200`}>
          <span className={`text-xs flex-1 md:text-sm text-gray-800 p-3`}>{content}</span>
          { activeReport && (
            <button className={`flex justify-center items-center text-xs min-w-11 border-l border-gray-400/20 bg-gray-400/30`} onClick={() => {
              setActiveReport(null);
              setPanelState('report', 'off');
            }}>
              <img src={new URL(`../images/icn_close.png`, import.meta.url).href} alt="Close" className={`h-4 w-4 invert`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ContextPopover;
