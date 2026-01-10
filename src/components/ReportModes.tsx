import React from 'react';
import { useMapStore } from '../state/useMapStore';
import { Tile } from './Tile';

export default function ReportModes() {
  const mode = useMapStore(s => s.activeReportMode);
  const setMode = useMapStore(s => s.setActiveReportMode);
  const isDaily = mode === 'daily';
  const isThreeDay = mode === 'threeDay';
  const isWeekly = mode === 'weekly';
  const isAllTime = mode === 'allTime';

  return (
    <div>
      <div className={``}>
        <span className={`text-gray-300 mb-2 inline-block`}>Territory</span>
        <div className="flex justify-between gap-2">
          <Tile label={"1 day"} icon={{type: "image", url: new URL(`../images/Tile_Report_1.png`, import.meta.url)}} active={isDaily} callBack={() => setMode('daily')} />
          <Tile label={"3 days"} icon={{type: "image", url: new URL(`../images/Tile_Report_3.png`, import.meta.url)}} active={isThreeDay} callBack={() => setMode('threeDay')} />
          <Tile label={"7 days"} icon={{type: "image", url: new URL(`../images/Tile_Report_7.png`, import.meta.url)}} active={isWeekly} callBack={() => setMode('weekly')} />
          <Tile label={"All"} icon={{type: "image", url: new URL(`../images/Tile_Report_All.png`, import.meta.url)}} active={isAllTime} callBack={() => setMode('allTime')} />
        </div>
      </div>
    </div>
  );
}

