import React from 'react';

export type VictoryCounts = {
  colonial: number;
  warden: number;
  neutral: number;
  scorched: number;
};

interface VictoryBarProps {
  counts: VictoryCounts | null;
  requiredVictoryTowns: number | null;
  showNeutral: boolean;
  showScorched: boolean;
  warNumber?: number | null;
}

const colonialColor = '#16a34a';
const wardenColor = '#1d4ed8';
const neutralColor = '#f8fafc';
const scorchedColor = '#0b0f19';

const colonialLogo = new URL('../images/logo_Colonial.png', import.meta.url).href;
const wardenLogo = new URL('../images/logo_Warden.png', import.meta.url).href;

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function VictoryBar({ counts, requiredVictoryTowns, showNeutral, showScorched, warNumber }: VictoryBarProps) {
  if (!counts || requiredVictoryTowns == null) return null;

  const neutralVal = showNeutral ? counts.neutral : 0;
  const scorchedVal = showScorched ? counts.scorched : 0;
  const total = counts.colonial + counts.warden + neutralVal + scorchedVal;
  if (total <= 0) return null;

  const scale = Math.max(total, requiredVictoryTowns * 2);
  const pct = (v: number) => `${clamp01(v / scale) * 100}%`;

  const thresholdLeft = `${clamp01(requiredVictoryTowns / scale) * 100}%`;

  return (
    <div className="mt-3 rounded border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200">
      <div className="flex">
        <span className="font-bold">{warNumber ? <div className="text-xs text-gray-400">War #{warNumber}</div> : null}</span>
      </div>
      <div className="flex items-center justify-center">
        <div className="flex content-center space-x-1">
            <span className="font-semibold text-xs text-center">{requiredVictoryTowns}</span>
            <span className="text-xs text-center">to win</span>
        </div>
      </div>

      <div className="flex flex-row items-start justify-between mt-2 space-x-2">
        <div className="flex items-center flex-col gap-2">
          <img src={colonialLogo} alt="Colonial" className="h-8 w-8" />
          <span className="font-medium" style={{ color: colonialColor }}>Colonials</span>
        </div>

      <div className="flex-grow relative h-7 overflow-hidden rounded bg-gray-700">
        <div className="flex h-full w-full justify-between">
          {counts.colonial > 0 && (
            <div className="h-full flex justify-start items-center" style={{ width: pct(counts.colonial), backgroundColor: colonialColor }}>
                <span className="text-lg font-semibold text-gray-200 text-left ml-2">{counts.colonial}</span>
            </div>
          )}
          {scorchedVal > 0 && (
            <div className="h-full" style={{ width: pct(scorchedVal), backgroundColor: scorchedColor }} />
          )}
          {neutralVal > 0 && (
            <div className="h-full" style={{ width: pct(neutralVal), backgroundColor: neutralColor }} />
          )}
          {counts.warden > 0 && (
            <div className="h-full flex justify-end items-center" style={{ width: pct(counts.warden), backgroundColor: wardenColor }}>
                <span className="text-gray-200 text-right text-lg font-semibold mr-2">{counts.warden}</span>
            </div>
          )}
        </div>
        <div
          className="absolute inset-y-0 w-[2px] bg-white/80"
          style={{ left: thresholdLeft, transform: 'translateX(-1px)' }}
        />
      </div>

        <div className="flex items-center flex-col gap-2">
          <img src={wardenLogo} alt="Warden" className="h-8 w-8" />
          <span className="font-medium" style={{ color: wardenColor }}>Wardens</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-300">
        {showNeutral && neutralVal > 0 && (
          <div className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: neutralColor }} />
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
    </div>
  );
}

export default VictoryBar;
