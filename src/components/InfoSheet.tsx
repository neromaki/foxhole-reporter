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

dayjs.extend(relativeTime);

export default function InfoSheet() {
  const selected = useMapStore((s) => s.selectedLocation);
  
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

      <CaptureHistory />

      <OwnershipGraph />
    </div>
  );

  function OwnershipGraph() {
    // Only show for territory selections
    if (!selected || selected.source !== 'territory' || !ownershipPieData || !ownershipHistory.length) {
      return null;
    }

    return (
      <div className="w-full space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Ownership Distribution (7 Days)</h3>
          <OwnershipPieChart data={ownershipPieData} />
        </div>
        
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Ownership Timeline (7 Days)</h3>
          <OwnershipTimelineGraph data={ownershipHistory} />
        </div>
        
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
}

