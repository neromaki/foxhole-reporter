import React, { useEffect, useMemo, useState } from 'react';
import ReportModes from './ReportModes';
import { formatDuration } from '../lib/time';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ResolvedWarState, useLatestSnapshot } from '../lib/queries';
import wars from '../data/wars';
import { getIconLabel, getIconSize, getIconSprite, getIconUrl, getIconWikiUrl, iconTypeToFilename } from '../lib/icons';
import { MapIcon, getMapIcon } from '../data/map-icons';
import { ICON_SPRITE_METADATA, SPRITE_HEIGHT, SPRITE_WIDTH } from '../data/icon-sprite';
import { DATA_SOURCE } from '../lib/mapConfig';
import { Teams, TeamStruct, getTeamData } from '../data/teams';
import { useMapStore } from '../state/useMapStore';

dayjs.extend(relativeTime);

export type VictoryCounts = {
  colonial: number;
  warden: number;
  neutral: number;
  scorched: number;
};

type MapIconTypeCounts = Map<number, { colonial: number; warden: number; neutral: number }>;

interface VictoryBarProps {
  counts: VictoryCounts | null;
  mapIconCounts: MapIconTypeCounts;
  showNeutral: boolean;
  showScorched: boolean;
  warState: ResolvedWarState | null;
  className?: string;
}

const Colonials = getTeamData(Teams.Colonial) as TeamStruct;
const Wardens = getTeamData(Teams.Warden) as TeamStruct;
const Neutral = getTeamData(Teams.Neutral) as TeamStruct;

const scorchedColor = '#6B4C3B'; // Brownish

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function VictoryBar({ counts, mapIconCounts, showNeutral, showScorched, warState, className }: VictoryBarProps & { mapIconCounts: MapIconTypeCounts }) {
  
  const reportMode = useMapStore(s => s.activeReportMode);
  const stackComparisonMapIcon = useMapStore(s => s.stackComparisonMapIcon);
  const setStackComparisonMapIcon = useMapStore(s => s.setStackComparisonMapIcon);
  const victoryBarDrawer = useMapStore(s => s.victoryBarDrawer);
  const setVictoryBarDrawerState = useMapStore(s => s.setVictoryBarDrawerState);


    const [now, setNow] = useState<Date>(() => new Date());
  
  // useEffect(() => {
  //   const id = setInterval(() => setNow(new Date()), 1000);
  //   return () => clearInterval(id);
  // }, []);

  if (!counts || warState?.requiredVictoryTowns == null || warState?.shortRequiredVictoryTowns == null) return null;

  const requiredVictoryTowns = warState.shortRequiredVictoryTowns > 0 ? warState.shortRequiredVictoryTowns : warState.requiredVictoryTowns;

  const neutralVal = showNeutral ? counts.neutral : 0;
  const scorchedVal = showScorched ? counts.scorched : 0;
  const total = counts.colonial + counts.warden + neutralVal + scorchedVal;
  if (total <= 0) return null;
  


  const scale = Math.max(total, requiredVictoryTowns * 2);
  const pct = (v: number) => `${clamp01(v / scale) * 100}%`;

  const thresholdLeft = `${clamp01(requiredVictoryTowns / scale) * 100}%`;

  return (
    <div className={`w-full md:flex md:justify-center`}>
      <div className={`flex flex-col items-center w-full md:w-[28rem] visible z-[449] rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 pb-0 text-sm text-gray-200 ${className ?? ''} pointer-events-auto`}>

        <div className="w-full flex flex-row items-start justify-between mt-2 space-x-2">
          <div className="flex items-center flex-col gap-1">
            <img src={Colonials?.icon} alt="Colonial" className="h-6 w-6" />
            <span className="font-medium text-xs" style={{ color: Colonials?.colors.light }}>{Colonials?.namePlural}</span>
          </div>

          <div className={`flex flex-grow flex-col relative`}>
            <div className="flex-grow relative h-7 overflow-hidden rounded bg-gray-700">
              <div className="flex h-full w-full justify-between">
                {counts.colonial > 0 && (
                  <div className="h-full flex justify-start items-center" style={{ width: pct(counts.colonial), backgroundColor: Colonials?.colors.saturated }}>
                      <span className="text-lg font-semibold text-gray-200 text-left ml-2 victory-count">{counts.colonial}</span>
                  </div>
                )}
                {scorchedVal > 0 && (
                  <div className="h-full" style={{ width: pct(scorchedVal), backgroundColor: scorchedColor }} />
                )}
                {neutralVal > 0 && (
                  <div className="h-full" style={{ width: pct(neutralVal), backgroundColor: Neutral?.colors.base }} />
                )}
                {counts.warden > 0 && (
                  <div className="h-full flex justify-end items-center" style={{ width: pct(counts.warden), backgroundColor: Wardens?.colors.saturated }}>
                      <span className="text-gray-200 text-right text-lg font-semibold mr-2 victory-count">{counts.warden}</span>
                  </div>
                )}
              </div>
              <div
                className="absolute inset-y-0 w-[2px] bg-white/80"
                style={{ left: thresholdLeft, transform: 'translateX(-1px)' }}
              />
            </div>
            <div className="flex items-center justify-center">
              <div className="flex content-center space-x-1 mt-1">
                  <span className="font-semibold text-xs text-center">{requiredVictoryTowns}</span>
                  <span className="text-xs text-center">to win</span>
                  <span className="font-bold">{warState?.warNumber ? <div className="text-xs text-gray-400">War {warState.warNumber}</div> : null}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-col gap-1">
            <img src={Wardens?.icon} alt="Warden" className="h-6 w-6" />
            <span className="font-medium text-xs" style={{ color: Wardens?.colors.light }}>{Wardens?.namePlural}</span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-300">
          {showNeutral && neutralVal > 0 && (
            <div className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: Neutral?.colors.base }} />
              <span>Neutral {counts.neutral}</span>
            </div>
          )}
          {showScorched && scorchedVal > 0 && (
            <div className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: scorchedColor }} />
              <span>Scorched {counts.scorched}</span>
            </div>
          )}
        </div>

        <div className={`${victoryBarDrawer ? "h-auto" : "h-0 overflow-hidden"} transition-all duration-300 ease-in-out`}>
          {warState?.warStart && (
            <div className="flex gap-x-2 mt-2 bg-gray-700/50 p-1 rounded">
              {TimerPiece(formatDuration(warState.warStart, "{DD}", now), "days")}
              {TimerPiece(formatDuration(warState.warStart, "{HH}", now), "hours")}
              {TimerPiece(formatDuration(warState.warStart, "{MM}", now), "mins")}
              {TimerPiece(formatDuration(warState.warStart, "{SS}", now), "secs")}
            </div>
          )}
          { stackComparisonMapIcon && stackComparisonMapIcon.map((mapIcon) => (
          <div className="mt-3 mb-2">
              {StackComparison(mapIcon ? mapIcon : MapIcon.Town_Base_1)}
            </div>
          )) }
        </div>
        {/* <div className={`flex justify-center w-full`}>
          <img src={new URL(`../images/icn_chevron-down.png`, import.meta.url).href} className={`inline-block h-4 w-4 ${victoryBarDrawer ? "rotate-180" : ""}`} />
        </div> */}
      </div>
    </div>
  );

  function TimerPiece(time: string, label: string) {
    return (
      <div className="flex items-center gap-x-1 text-gray-300 bg-gray-900 px-2 py-1 rounded">
        <span className={`text-sm ${label == "days" && "font-bold"}`}>{time}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
    );
  }


  function StackComparison(mapIcon: MapIcon) {

    const mapIconType = mapIcon as number;
    const iconCounts = getCountForIcon(mapIconType) as { colonial: number, warden: number, neutral: number };
    let iconScaleFactor = 1;

    if(iconCounts.colonial > 15 || iconCounts.warden > 15) iconScaleFactor = 2;
    if(iconCounts.colonial > 30 || iconCounts.warden > 30) iconScaleFactor = 3;
    if(iconCounts.colonial > 45 || iconCounts.warden > 45) iconScaleFactor = 4;
    if(iconCounts.colonial > 60 || iconCounts.warden > 60) iconScaleFactor = 5;
    if(iconCounts.colonial > 75 || iconCounts.warden > 75) iconScaleFactor = 6;

    const scaledIconCounts = {
      colonial: Math.ceil(iconCounts.colonial / iconScaleFactor),
      warden: Math.ceil(iconCounts.warden / iconScaleFactor),
      neutral: iconCounts.neutral,
    };

    // Icon setup
    let [bw, bh] = getIconSize(mapIconType);
    const iconScale = 0.75;
    bw = bw * iconScale;
    bh = bh * iconScale;

    /* Colonial */
    const spriteColonial = getIconSprite(mapIconType, 'Colonial');
    const iconNameColonial = iconTypeToFilename(mapIconType, 'Colonial').replace('.png', '');
    const coordsColonial = ICON_SPRITE_METADATA[iconNameColonial];
    // Pre-calculate scaled position inline
    const xColonial = coordsColonial ? coordsColonial.x * iconScale : 0;
    const yColonial = coordsColonial ? coordsColonial.y * iconScale : 0;

    // const iconCounts = getCountForIcon(mapIconType, countsByIconType) as { colonial: number, warden: number, neutral: number };

    /* Warden */
    const spriteWarden = getIconSprite(mapIconType, 'Warden');
    const iconNameWarden = iconTypeToFilename(mapIconType, 'Warden').replace('.png', '');
    const coordsWarden = ICON_SPRITE_METADATA[iconNameWarden];
    // Pre-calculate scaled position inline
    const xWarden = coordsWarden ? coordsWarden.x * iconScale : 0;
    const yWarden = coordsWarden ? coordsWarden.y * iconScale : 0;

    const bgWidth = SPRITE_WIDTH * iconScale;
    const bgHeight = SPRITE_HEIGHT * iconScale;
    
    return (
      <div className="h-full flex justify-between items-stretch px-2 py-1 pb-3 bg-gray-900 rounded">

        <Comparison 
          team={Colonials}
          count={iconCounts.colonial}
          iconCount={scaledIconCounts.colonial}
          sprite={spriteColonial}
          x={xColonial}
          y={yColonial}
          bw={bw}
          bh={bh}
          bgWidth={bgWidth}
          bgHeight={bgHeight} />

        <Comparison 
          team={Wardens}
          count={iconCounts.warden}
          iconCount={scaledIconCounts.warden}
          sprite={spriteWarden}
          x={xWarden}
          y={yWarden}
          bw={bw}
          bh={bh}
          bgWidth={bgWidth}
          bgHeight={bgHeight} />

      </div>
    );
  }

  function Comparison({ team, sprite, x, y, count, iconCount, bw, bh, bgWidth, bgHeight }: { team: TeamStruct; sprite: { spritePath: string } | null; x: number; y: number; count: number; iconCount: number; bw: number; bh: number; bgWidth: number; bgHeight: number }): JSX.Element {
    return (
        <div className={`flex ${team.name === Teams.Warden ? 'flex-row-reverse' : ''} items-start flex-1 ${team.name === Teams.Warden ? 'ml-4' : 'mr-4'}`}>
          <div className={`flex ${team.name === Teams.Warden ? 'flex-row-reverse' : ''} justify-start flex-wrap items-start`}>
          { sprite && (
            Array.from({ length: iconCount }).map((_, i) => (
              <div key={i} className={``} style={{ 
                    width: bw, 
                    height: bh, 
                    backgroundImage: `url(${new URL(sprite.spritePath, import.meta.url).toString()})`, 
                    backgroundPosition: `-${x}px -${y}px`, 
                    backgroundSize: `${bgWidth}px ${bgHeight}px`, 
                    backgroundRepeat: 'no-repeat' }}></div>
            ))
          )}
          </div>
          <div className={`h-full flex flex-1 items-center`}>
            <span className={`text-xl font-bold`} style={{ color: team.colors.saturated }}>{count}</span>
          </div>
        </div>
    );
  }

  function getCountForIcon(icon: number | MapIcon): object {
    const iconType = icon as number;
    // console.log('[COUNT] Getting counts for icon type:', iconType);
    if(iconType === MapIcon.Town_Base_1) {
      // console.log('[COUNT] Special case for Town Base: aggregating counts for all tiers.');
      // Special case: iconType 56, 57 and 58 represents different tiers of the same Town Base
      // Sum counts for all relevant iconTypes
      return [MapIcon.Town_Base_1, MapIcon.Town_Base_2, MapIcon.Town_Base_3].reduce((sum, it) => {
        const count = mapIconCounts.get(it) ?? { colonial: 0, warden: 0, neutral: 0 };
        // console.log(`[COUNT] Adding counts for iconType ${it}:`, sum, count);
        return {
          colonial: sum.colonial + count.colonial,
          warden: sum.warden + count.warden,
          neutral: sum.neutral + count.neutral,
        };
      }, { colonial: 0, warden: 0, neutral: 0 });
    }
    // console.log('[COUNT] Standard case for icon type:', iconType);
    return mapIconCounts.get(iconType) ?? { colonial: 0, warden: 0, neutral: 0 };
  }

}

export default VictoryBar;
