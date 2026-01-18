import React from 'react';
import { useMapStore } from '../state/useMapStore';
import { Tile } from './Tile';

export default function ReportModes() {
  const mode = useMapStore(s => s.activeReportMode);
  const setMode = useMapStore(s => s.setActiveReportMode);
  const isTerritoryDaily = mode === 'territory_daily';
  const isTerritoryThreeDay = mode === 'territory_threeDay';
  const isTerritoryWeekly = mode === 'territory_weekly';
  const isTerritoryAllTime = mode === 'territory_allTime';
  const isThreats = mode === 'threats';

  return (
    <div>
      <div className={`mb-5`}>
        <span className={`text-gray-300 mb-2 inline-block`}>Territory</span>
        <div className="flex justify-between gap-2">
          <Tile label={"1 day"} icon={{type: "image", url: new URL(`../images/Tile_Report_1.png`, import.meta.url)}} active={isTerritoryDaily} callBack={() => setMode('territory_daily')} />
          <Tile label={"3 days"} icon={{type: "image", url: new URL(`../images/Tile_Report_3.png`, import.meta.url)}} active={isTerritoryThreeDay} callBack={() => setMode('territory_threeDay')} />
          <Tile label={"7 days"} icon={{type: "image", url: new URL(`../images/Tile_Report_7.png`, import.meta.url)}} active={isTerritoryWeekly} callBack={() => setMode('territory_weekly')} />
          <Tile label={"All"} icon={{type: "image", url: new URL(`../images/Tile_Report_All.png`, import.meta.url)}} active={isTerritoryAllTime} callBack={() => setMode('territory_allTime')} />
        </div>
      </div>

      <div className={`mb-5`}>
        <span className={`text-gray-300 mb-2 inline-block`}>Intel</span>
        <div className="flex justify-between gap-2">
          <Tile label={"Major threats"} icon={{type: "image", url: new URL(`../images/Tile_Threats.png`, import.meta.url)}} active={isThreats} callBack={() => setMode('threats')} />
        </div>
      </div>
    </div>
  );
}

