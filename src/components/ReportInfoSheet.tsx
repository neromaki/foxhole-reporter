import React, { useEffect, useState } from 'react';
import { useMapStore } from '../state/useMapStore';
import { getIconLabel, getIconSize, getIconSprite, getIconUrl, getIconWikiUrl, iconTypeToFilename } from '../lib/icons';
import { Teams, getTeams, getTeamData, TeamStruct } from '../data/teams';
import { ICON_SPRITE_METADATA, SPRITE_HEIGHT, SPRITE_WIDTH } from '../data/icon-sprite';
import { MapIcon, getMapIcon } from '../data/map-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import tinycolor from 'tinycolor2';
import type { FPIScore } from '../lib/pressureIndex';


const Colonials = getTeamData(Teams.Colonial) as TeamStruct;
const Wardens = getTeamData(Teams.Warden) as TeamStruct;
const Neutral = getTeamData(Teams.Neutral) as TeamStruct;

type MapIconTypeCounts = Map<number, { colonial: number; warden: number; neutral: number }>;

interface ReportInfoSheetProps {
  mapIconCounts: MapIconTypeCounts;
}
export function ReportInfoSheet({mapIconCounts}: ReportInfoSheetProps) {
  const selected = useMapStore((s) => s.selectedLocation);
  const activeReport = useMapStore((s) => s.activeReport);
  const fpiScores = useMapStore((s) => s.fpiScores);

  const stackComparisonMapIcon = useMapStore(s => s.stackComparisonMapIcon);
  const victoryBarDrawer = useMapStore(s => s.victoryBarDrawer);

  type MapIconTypeCounts = Map<number, { colonial: number; warden: number; neutral: number }>;

  if (activeReport?.highlightType === 'pressureHeatmap') {
    return <FpiPanel selected={selected} fpiScores={fpiScores} />;
  }

  return (
    <div className="flex flex-col items-start justify-stretch gap-y-5">

        { stackComparisonMapIcon && stackComparisonMapIcon.map((mapIcon) => (
        <div key={mapIcon} className="w-full">
            {StackComparison(mapIcon ? mapIcon : MapIcon.Town_Base_1)}
          </div>
        )) }

    </div>
  );
  
  function clamp01(v: number) {
    return Math.min(1, Math.max(0, v));
  }

  function StackComparison(mapIcon: MapIcon) {

    const mapIconType = mapIcon as number;
    const iconCounts = getCountForIcon(mapIconType) as { colonial: number, warden: number, neutral: number };
    let iconScaleFactor = 1;

    if(iconCounts.colonial > 15 || iconCounts.warden > 15) iconScaleFactor = 3;
    if(iconCounts.colonial > 30 || iconCounts.warden > 30) iconScaleFactor = 4;
    if(iconCounts.colonial > 45 || iconCounts.warden > 45) iconScaleFactor = 5;
    if(iconCounts.colonial > 60 || iconCounts.warden > 60) iconScaleFactor = 6;
    if(iconCounts.colonial > 75 || iconCounts.warden > 75) iconScaleFactor = 7;

    const scaledIconCounts = {
      colonial: Math.ceil(iconCounts.colonial / iconScaleFactor),
      warden: Math.ceil(iconCounts.warden / iconScaleFactor),
      neutral: iconCounts.neutral,
    };

    const total = iconCounts.colonial + iconCounts.warden
    const scale = total;
    const pct = (v: number) => `${clamp01(v / scale) * 100}%`;

    // Icon setup
    let [bw, bh] = getIconSize(mapIconType);
    const iconScale = 0.65;
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
      <div className="flex flex-col w-full items-center px-2 py-1 pb-3 rounded">
        <span className="text-sm font-medium mb-2">{getIconLabel(mapIconType)}</span>

        <div className="flex flex-col w-full">

          <div className="flex-grow w-full relative h-6 md:h-7 overflow-hidden rounded bg-gray-700">
            <div className="flex h-full w-full justify-between">
              {iconCounts.colonial > 0 && (
                <div className="h-full flex justify-start items-center pl-1" style={{ width: pct(iconCounts.colonial), backgroundColor: Colonials?.colors.saturated }}>
                  <div style={{ 
                      width: bw, 
                      height: bh, 
                      backgroundImage: `url(${new URL(spriteColonial ? spriteColonial.spritePath : '', import.meta.url).toString()})`, 
                      backgroundPosition: `-${xColonial}px -${yColonial}px`, 
                      backgroundSize: `${bgWidth}px ${bgHeight}px`, 
                      backgroundRepeat: 'no-repeat' }}></div>
                    <span className="text-base md:text-lg font-semibold text-gray-200 text-left ml-2 victory-count">{iconCounts.colonial}</span>
                </div>
              )}
              {iconCounts.warden > 0 && (
                <div className="h-full flex flex-row-reverse justify-start pr-1 items-center" style={{ width: pct(iconCounts.warden), backgroundColor: Wardens?.colors.saturated }}>
                  <div style={{ 
                      width: bw, 
                      height: bh, 
                      backgroundImage: `url(${new URL(spriteWarden ? spriteWarden.spritePath : '', import.meta.url).toString()})`, 
                      backgroundPosition: `-${xWarden}px -${yWarden}px`, 
                      backgroundSize: `${bgWidth}px ${bgHeight}px`, 
                      backgroundRepeat: 'no-repeat' }}
                    className={`transform -scale-x-100`}></div>
                    <span className="text-gray-200 text-right text-base md:text-lg font-semibold mr-2 victory-count">{iconCounts.warden}</span>
                </div>
              )}
            </div>
          </div>

          {/* <div className="w-full h-full flex justify-between items-stretch">
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
          </div> */}
        </div>
      </div>
    );
  }

  function Comparison({ team, sprite, x, y, count, iconCount, bw, bh, bgWidth, bgHeight }: { team: TeamStruct; sprite: { spritePath: string } | null; x: number; y: number; count: number; iconCount: number; bw: number; bh: number; bgWidth: number; bgHeight: number }): JSX.Element {
    const keyBase = `${team.name}-${count}-${iconCount}`;
    return (
        <div className={`flex ${team.name === Teams.Warden ? 'flex-row-reverse' : ''} items-start flex-1 ${team.name === Teams.Warden ? 'ml-4' : 'mr-4'}`} style={{ backgroundColor: tinycolor(team.colors.base).saturate(20).setAlpha(0.15).toRgbString(), padding: '4px', borderRadius: '4px' }}>
          <div className={`flex ${team.name === Teams.Warden ? 'flex-row-reverse pl-2' : 'pr-2'} flex-grow justify-start flex-wrap items-start`}>
          { sprite && (
            Array.from({ length: iconCount }).map((_, i) => (
              <div key={`${keyBase}-${Math.random()}`} className={`${team.name === Teams.Warden ? 'transform -scale-x-100' : ''}`} style={{ 
                    width: bw, 
                    height: bh, 
                    backgroundImage: `url(${new URL(sprite.spritePath, import.meta.url).toString()})`, 
                    backgroundPosition: `-${x}px -${y}px`, 
                    backgroundSize: `${bgWidth}px ${bgHeight}px`, 
                    backgroundRepeat: 'no-repeat' }}></div>
            ))
          )}
          </div>
          <div className={`h-full flex items-center`}>
            <span className={`text-xl font-bold`} style={{ color: team.colors.saturated }}>{count}</span>
          </div>
        </div>
    );
  }

  function getCountForIcon(icon: number | MapIcon): object {
    const iconType = icon as number;
    if(iconType === MapIcon.Town_Base_1) {
      // Special case: iconType 56, 57 and 58 represents different tiers of the same Town Base
      // Sum counts for all relevant iconTypes
      return [MapIcon.Town_Base_1, MapIcon.Town_Base_2, MapIcon.Town_Base_3].reduce((sum, it) => {
        const count = mapIconCounts.get(it) ?? { colonial: 0, warden: 0, neutral: 0 };
        return {
          colonial: sum.colonial + count.colonial,
          warden: sum.warden + count.warden,
          neutral: sum.neutral + count.neutral,
        };
      }, { colonial: 0, warden: 0, neutral: 0 });
    }
    return mapIconCounts.get(iconType) ?? { colonial: 0, warden: 0, neutral: 0 };
  }

}

// ─── Frontline Pressure panel ────────────────────────────────────────────────

function FpiPanel({ selected, fpiScores }: {
  selected: { id?: string | null } | null;
  fpiScores: Record<string, FPIScore> | null;
}) {
  const colonialColor = getTeamData(Teams.Colonial)?.colors.saturated ?? '#4caf50';
  const wardenColor   = getTeamData(Teams.Warden)?.colors.saturated   ?? '#2196f3';

  const selectedScore: FPIScore | null = (selected?.id && fpiScores) ? (fpiScores[selected.id] ?? null) : null;

  return (
    <div className="flex flex-col gap-y-5 w-full">

      {/* Legend */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Reading this map</h3>
        <div className="space-y-2 text-xs text-gray-400">
          <LegendRow color={colonialColor} label="Colonial push" description="Colonials are on offense here" />
          <LegendRow color={wardenColor}   label="Warden push"   description="Wardens are on offense here" />
          <LegendRow color="#f97316"       label="Contested"     description="Both sides are fighting for control" />
          <LegendRow color="#4b5563"       label="Stable"        description="No significant activity in 48h" />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Intensity (Critical / High / Moderate / Low) is based on how frequently the territory has changed hands and current casualty rates.
        </p>
      </div>

      <div className="border-t border-gray-700/50" />

        <p className="text-xs text-gray-500 italic">Tap a colored territory on the map to see its battle details.</p>

    </div>
  );
}

function LegendRow({ color, label, description }: { color: string; label: string; description: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: color }} />
      <span><span className="text-gray-200 font-medium">{label}</span> — {description}</span>
    </div>
  );
}
