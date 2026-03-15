import React, { useEffect, useState } from 'react';
import { useMapStore } from '../state/useMapStore';
import { getIconLabel, getIconSize, getIconSprite, getIconUrl, getIconWikiUrl, iconTypeToFilename } from '../lib/icons';
import { Teams, getTeams, getTeamData } from '../data/teams';
import { ICON_SPRITE_METADATA, SPRITE_HEIGHT, SPRITE_WIDTH } from '../data/icon-sprite';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import tinycolor from 'tinycolor2';
import { 
  fetchTerritoryOwnershipHistory, 
  computeOwnershipPieChart, 
  fetchRegionCasualtyTrend 
} from '../lib/queries';
import { OwnershipPieChart } from './OwnershipPieChart';
import { OwnershipTimelineGraph } from './OwnershipTimelineGraph';
import { CasualtyTrendGraph } from './CasualtyTrendGraph';
import type { FPIScore } from '../lib/pressureIndex';

dayjs.extend(relativeTime);

export default function InfoSheet() {
  const selected = useMapStore((s) => s.selectedLocation);
  const activeReport = useMapStore((s) => s.activeReport);
  const fpiScores = useMapStore((s) => s.fpiScores);
  
  // State for aggregated data
  const [ownershipHistory, setOwnershipHistory] = useState<any[]>([]);
  const [ownershipPieData, setOwnershipPieData] = useState<any>(null);
  const [casualtyTrend, setCasualtyTrend] = useState<any[]>([]);
  const [isLoadingAggregates, setIsLoadingAggregates] = useState(false);

  // Fetch aggregated data when selection changes
  useEffect(() => {
    if (!selected) {
      setOwnershipHistory([]);
      setOwnershipPieData(null);
      setCasualtyTrend([]);
      return;
    }

    setIsLoadingAggregates(true);

    // Fetch ownership history if territory is selected
    if (selected.source === 'territory' && selected.id) {
      fetchTerritoryOwnershipHistory(selected.id, 24 * 7)
        .then((data) => {
          setOwnershipHistory(data);
          const pieData = computeOwnershipPieChart(data);
          setOwnershipPieData(pieData);
        })
        .catch((err) => console.error('Failed to fetch ownership history:', err))
        .finally(() => setIsLoadingAggregates(false));
    }

    // Fetch casualty trend for the region
    if (selected.hexName) {
      fetchRegionCasualtyTrend(selected.hexName, 24 * 7)
        .then((data) => setCasualtyTrend(data))
        .catch((err) => console.error('Failed to fetch casualty trend:', err));
    }
  }, [selected]);

  if (!selected) {
    return <div className="text-sm text-gray-400">Tap a location to see details.</div>;
  }

  const { tile, id, name, owner, history, hexName } = selected;
  const wikiUrl = getIconWikiUrl(tile.iconType);
  const iconType = tile.iconType;

  const team = tile.owner !== 'Neutral' ? getTeamData(tile.owner) : null;
  const events = history && history.events ? history.events : [];


  const [bw, bh] = getIconSize(iconType);

  // Try to use sprite first, fallback to individual icon
  const sprite = getIconSprite(iconType);
  
  // Get icon name and pre-calculate scaled values once (avoid function call overhead)
  const iconName = iconTypeToFilename(iconType).replace('.png', '');
  const coords = ICON_SPRITE_METADATA[iconName];

  // Pre-calculate scaled position inline
  const x = coords ? coords.x : 0;
  const y = coords ? coords.y : 0;
  const bgWidth = SPRITE_WIDTH;
  const bgHeight = SPRITE_HEIGHT;

  function renderCaptureTime() {
    if (events.length === 0) return null;
    const latestEvent = events[0];
  }

  return (
    <div className="flex flex-col items-start justify-stretch gap-y-5">
      <div className="flex items-start justify-stretch w-full">
        <div className={`flex flex-col items-start flex-1 space-y-2`}>
          <LocationHierarchy />
        </div>

        <div className={`flex flex-col items-end gap-y-2`}>
          {team && team.name !== 'Neutral' && (
            <div className="flex flex-col items-end gap-1">
              <Badge text={team.name} icon={team.icon} className={`text-xs font-semibold ${tile.owner == 'Colonial' && `shadow-xl`}`} style={{ backgroundColor: team.colors.saturated }} />
              { events.length > 0 && events[0] && (
                <div className={`flex items-center gap-1 text-xs text-gray-400`}>
                  <span>Captured</span>
                  <span>{dayjs(events[0].at).fromNow()}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            {(tile.flags & 0x01) !== 0 && <Badge text="Victory Base" className="bg-amber-500/20 text-amber-300" />}
            {(tile.flags & 0x10) !== 0 && <Badge text="Scorched" className="bg-red-500/20 text-red-300" />}
            {(tile.flags & 0x04) !== 0 && <Badge text="Build Site" className="bg-blue-500/20 text-blue-300" />}
          </div>
        </div>
      </div>

      { activeReport?.highlightType === 'pressureHeatmap' && (
        <FpiPanel selected={selected} fpiScores={fpiScores} />
      )}

      <CaptureHistory />

      <OwnershipGraph />

    </div>
  );

  function FpiPanel({ selected, fpiScores }: {
    selected: { id?: string | null } | null;
    fpiScores: Record<string, FPIScore> | null;
  }) {
    const colonialColor = getTeamData(Teams.Colonial)?.colors.saturated ?? '#4caf50';
    const wardenColor   = getTeamData(Teams.Warden)?.colors.saturated   ?? '#2196f3';

    const selectedScore: FPIScore | null = (selected?.id && fpiScores) ? (fpiScores[selected.id] ?? null) : null;

    return (
      <div className="flex flex-col gap-y-5 w-full">

      {selectedScore && (
        <FpiDetail score={selectedScore} colonialColor={colonialColor} wardenColor={wardenColor} />
      )}
      </div>
    );
  }

  function OwnershipGraph() {
    // Only show for territory selections
    if (!selected || selected.source !== 'territory' || !ownershipPieData || !ownershipHistory.length) {
      return null;
    }

    // Check if timeline has both Colonial and Warden entries
    const showTimeline = ownershipHistory.some((entry) => entry.owner === 'Colonial') && ownershipHistory.some((entry) => entry.owner === 'Warden');

    return (
      <div className="w-full space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Ownership Distribution (7 Days)</h3>
          <OwnershipPieChart data={ownershipPieData} />
        </div>
        
        {showTimeline ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Ownership Timeline (7 Days)</h3>
            <OwnershipTimelineGraph data={ownershipHistory} />
          </div>
        ) : null}
        
        {casualtyTrend.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Casualty Trend (Region, 7 Days)</h3>
            <CasualtyTrendGraph data={casualtyTrend} />
          </div>
        )}
      </div>
    );
  }

  function CaptureHistory() {
    if (events.length === 0) return null;

    return (
      <div className="w-full">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Capture History</h3>
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
          {events.map((event: any, index: number) => (
            <CaptureHistoryRow key={index} event={event} />
          ))}
        </div>
      </div>
    );
  }

  function CaptureHistoryRow({ event }: { event: any }) {
    if (!event || !event.owner || event.owner === 'Neutral') return null;
    const teamData = event.owner ? getTeamData(event.owner) : null;
    if (!teamData) return null;

    return (
      <div className="flex items-center">
        <div className="flex justify-between text-xs px-2 py-1 w-full" style={{backgroundColor: tinycolor(teamData.colors.light).setAlpha(0.15).toString()}}>
          <div className={`flex items-center gap-1`}>
            <img src={teamData.icon} alt={event.owner} className="w-5 h-5" />
            <span className="font-medium" style={{color: teamData.colors.light}}>{teamData.name}</span>
          </div>
          <span className="text-gray-300">{dayjs(event.at).fromNow()}</span>
        </div>
      </div>
    );
  }

  function LocationHierarchy() {
    if (!selected) return null;
    
    return (        
      <div className={`flex flex-col items-start flex-1 space-y-1`}>
        <div className={`font-semibold`}>
          <LocationRow type={`${selected.source}`} primary={true} />
        </div>
        { selected.source === 'mapIcon' && (
          <div className="text-sm text-gray-300 space-y-1 ml-3">
            <div className={`flex items-center gap-x-1`}>
              <img src={new URL('../images/icn_nested.png', import.meta.url).href} className={`w-4 h-4`} />
              <LocationRow type="territory" />
            </div>
          </div>
        )}
        <div className={`text-sm text-gray-300 space-y-1 ${selected.source === 'mapIcon' ? 'ml-6' : 'ml-3'}`}>
          <div className={`flex items-center gap-x-1`}>
            <img src={new URL('../images/icn_nested.png', import.meta.url).href} className={`w-4 h-4`} />
            <LocationRow type="hex" />
          </div>
        </div>
      </div>
    );
  }

  function LocationRow({ type, primary }: { type: 'mapIcon' | 'territory' | 'hex'; primary?: boolean }) {
    if (type == 'mapIcon' && (!sprite || !iconType)) return null;

    return (
      <div className="flex items-center gap-2">
        { type == 'mapIcon' ? (
          sprite ? (
          <div className={`scale-[80%]`} style={{ 
                width: bw, 
                height: bh, 
                backgroundImage: `url(${new URL(sprite.spritePath, import.meta.url).toString()})`, 
                backgroundPosition: `-${x}px -${y}px`, 
                backgroundSize: `${bgWidth}px ${bgHeight}px`, 
                backgroundRepeat: 'no-repeat' }}></div>
          ) : (
            <img src={new URL(getIconUrl(iconType), import.meta.url).href} className={`scale-90`} width={bw} height={bh} />
          )
        ) : (
          <img src={new URL(`../images/icn_${type}.png`, import.meta.url).href} className={`${primary ? 'w-8 h-8 scale-90' : 'w-4 h-4'}`} />
        )}
        { type == 'mapIcon' && wikiUrl ? (
          <a href={wikiUrl} target="_blank" rel="noopener noreferrer" className={` underline decoration-dotted`}>
            {getIconLabel(tile.iconType)}
          </a>
        ) : (
          <span className={``}>
            { type == 'mapIcon' ? getIconLabel(tile.iconType) : type == 'territory' ? selected?.source == 'territory' ? "Territory" : name : hexName }
          </span>
        )}
      </div>
      );
  }

  function Badge({ text, icon, className, style }: { text: string; icon?: string; className?: string; style?: React.CSSProperties }) {
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${className ?? ''}`} style={style}>
        {icon && <img src={icon} alt={text} className="w-4 h-4" />}
        <span className={``}>
          {text}
        </span>
      </div>
    );
  }


  function FpiDetail({ score, colonialColor, wardenColor }: {
    score: FPIScore;
    colonialColor: string;
    wardenColor: string;
  }) {
    const { fpi, pressureDirection, tci, cii, cai, meanHoldHours, hoursUntilEstimatedCapture, estimatedCasualtyCost } = score;

    const directionColor =
      pressureDirection === 'colonial' ? colonialColor :
      pressureDirection === 'warden'   ? wardenColor   :
      pressureDirection === 'disputed' ? '#f97316' : '#6b7280';

    const headline =
      pressureDirection === 'colonial' ? 'Under Colonial assault' :
      pressureDirection === 'warden'   ? 'Under Warden assault'   :
      pressureDirection === 'disputed' ? 'Actively contested — fighting on both sides' :
      'Holding steady — no recent activity';

    const pct = Math.round(fpi * 100);
    const intensityLabel = pct >= 80 ? 'Critical' : pct >= 60 ? 'High' : pct >= 30 ? 'Moderate' : 'Low';
    const isHotspot = fpi >= 0.65 && cai >= 0.65;

    return (
      <div className="space-y-3 w-full">
        <div>
          <p className="text-sm font-medium text-gray-200">{headline}</p>
          <p className="text-xs text-gray-400 mt-0.5">Activity intensity: <span className="font-semibold" style={{ color: directionColor }}>{intensityLabel}</span></p>
        </div>

        {/* Intensity bar */}
        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: directionColor }} />
        </div>

        {/* Estimates */}
        <div className="flex flex-col gap-1 text-xs text-gray-400">
          {hoursUntilEstimatedCapture !== null && (
            <div className="flex justify-between">
              <span>Est. time to flip</span>
              <span className="text-gray-200 font-medium">
                {hoursUntilEstimatedCapture < 1 ? 'Imminent' : `~${Math.round(hoursUntilEstimatedCapture)}h`}
              </span>
            </div>
          )}
          {estimatedCasualtyCost !== null && (
            <div className="flex justify-between">
              <span>Est. casualty cost to capture</span>
              <span className="text-gray-200 font-medium">~{estimatedCasualtyCost.toLocaleString()}</span>
            </div>
          )}
          {meanHoldHours > 0 && (
            <div className="flex justify-between">
              <span>Avg. hold time</span>
              <span className="text-gray-200 font-medium">
                {meanHoldHours < 1 ? `${Math.round(meanHoldHours * 60)}m` : `~${meanHoldHours.toFixed(1)}h`}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Casualties escalating?</span>
            <span className="text-gray-200 font-medium">
              {cai >= 0.6 ? 'Yes — rising' : cai <= 0.4 ? 'No — falling' : 'Steady'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Times captured (48h)</span>
            <span className="text-gray-200 font-medium">{tci}×</span>
          </div>
        </div>

        {isHotspot && (
          <div className="text-xs text-amber-400/90 border border-amber-400/20 rounded px-2 py-1.5 bg-amber-400/5">
            This is a focal point of the current offensive — high turnover with rising casualties.
          </div>
        )}
      </div>
    );
  }

}

