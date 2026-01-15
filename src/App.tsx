import React, { useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView';
import LayerTogglePanel from './components/LayerTogglePanel';
import JobViewPanel from './components/JobViewPanel';
import ReportModes from './components/ReportModes';
import VictoryBar, { VictoryCounts } from './components/VictoryBar';
import { useLatestSnapshot, useWarState } from './lib/queries';
import { useWarApiDirect } from './lib/hooks/useWarApiDirect';
import { DATA_SOURCE, WARSTATE_GRAPH_SHOW_NEUTRAL, WARSTATE_GRAPH_SHOW_SCORCHED } from './lib/mapConfig';
import type { LocationTile } from './types/war';
import { useMapStore, PanelType } from './state/useMapStore';
import { BottomSheet } from './components/BottomSheet';
import InfoSheet from './components/InfoSheet';
import { ContextPopover } from './components/ContextPopover';
import { getTeams } from './data/teams';
import { MapIconTag, checkMapIconHasTag } from './data/map-icons';
import { getIconLabel } from './lib/icons';

export default function App() {
  const [isTouch, setIsTouch] = useState(false);
  const { data: supabaseSnapshot } = useLatestSnapshot({ enabled: DATA_SOURCE === 'supabase' });
  const { data: warApiSnapshot } = useWarApiDirect({ enabled: DATA_SOURCE === 'warapi' });
  const snapshot = DATA_SOURCE === 'warapi' ? warApiSnapshot : supabaseSnapshot;

  const { data: warState } = useWarState();

  const setAllLayers = useMapStore((s) => s.setAllLayers);
  const resetLayers = useMapStore((s) => s.resetLayers);
  const reportModeActive = useMapStore((s) => s.activeReportMode !== null);
  const setActiveReportMode = useMapStore((s) => s.setActiveReportMode);

  const panelState = useMapStore((s) => s.panelState);
  const panelsOpen = useMapStore((s) => s.panelsOpen());
  const setPanelState = useMapStore((s) => s.setPanelState);

  const selectedLocation = useMapStore((s) => s.selectedLocation);

  const victoryCounts = useMemo<VictoryCounts | null>(() => {
    if (!snapshot?.territories) return null;
    return computeVictoryCounts(snapshot.territories);
  }, [snapshot]);

  const countsByIconType = useMemo(() => {
    const m = new Map<number, { colonial: number; warden: number; neutral: number }>();
    const items = (snapshot as any)?.territories;
    
    if (!items) return m;
    for (const t of items) {
      const current = m.get(t.iconType) ?? { colonial: 0, warden: 0, neutral: 0 };
      const team = t.owner?.toLowerCase() ?? 'neutral';
      
      if (team === 'colonial') { 
        current.colonial++;
      }
      else if (team === 'warden') {
        current.warden++;
      }
      else {
        current.neutral++;
      }
      m.set(t.iconType, current);
    }
    return m;
  }, [snapshot]);

  const teams = getTeams();
  const selectedTeam = selectedLocation && selectedLocation.tile && selectedLocation.tile.owner !== 'Neutral'
    ? teams.find(t => t.name === selectedLocation.tile.owner)
    : null;

  useEffect(() => {
    const touch = (typeof window !== 'undefined') && (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - legacy IE support
      (navigator as any).msMaxTouchPoints > 0
    );
    setIsTouch(touch);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside>

        <div className="">
          <div className="hidden md:visible">
            <h1 className="text-xl font-semibold">Foxhole Report</h1>
            <p className="text-xs text-gray-400">Live territory states & capture reports from the frontlines</p>
          </div>
        </div>

        
        <div className={`fixed top-2 inset-x-2 flex flex-col justify-start items-center z-[430] pointer-events-none`}>
          <VictoryBar
            counts={victoryCounts}
            showNeutral={WARSTATE_GRAPH_SHOW_NEUTRAL}
            showScorched={WARSTATE_GRAPH_SHOW_SCORCHED}
            warState={warState !== undefined ? warState : { warNumber: 0, warStart: new Date(), requiredVictoryTowns: 0, shortRequiredVictoryTowns: 0, source: 'supabase' }} 
            mapIconCounts={countsByIconType}
            className={`md:mt-2`}
          />
          <div className={`fixed top-24 left-2 right-24 justify-center z-[430] md:mt-2 md:relative md:top-auto md:left-auto md:right-auto md:z-[440] md:pointer-events-auto`}>
            <ContextPopover />
          </div>
        </div>

        <div className={`fixed top-24 left-2 right-24 justify-center z-[430] md:mt-2 md:fixed md:top-20 md:left-1/2 md:-translate-x-1/2 md:z-[440] md:pointer-events-auto`}>
          
        </div>

        <div className={`panel-buttons fixed top-24 right-2 flex flex-col z-[430] transition-transform duration-[250ms] md:left-2 md:right-auto md:top-4 md:bottom-auto ${panelsOpen ? 'md:translate-x-[28rem]' : ''}`}>
          <PanelButton label="Layers" targetPanel="layer" icon={'icn_layers'} onClick={() => {
            //if (reportModeActive) return;
            const active = panelState['layer'] !== 'off';
            setActiveReportMode(null);
            setPanelState('layer', active ? 'off' : 'threequarters');
          }} />
          <PanelButton label="Reports" targetPanel="report" icon={'icn_reports'} 
            onClick={() => {
              setActiveReportMode(reportModeActive ? null : 'territory_daily');
          }} />
        </div>

        <BottomSheet type={'layer'} allowedStates={['full']} clickOutsideBehavior={'off'} title={'Layers'} headerContent={
          <div className="flex gap-2">
            <button
              className="px-2 py-1 text-sm rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
              onClick={() => resetLayers()}
            >Reset</button>
            <button
              className="px-2 py-1 text-sm rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
              onClick={() => setAllLayers(true)}
            >Show all</button>
            <button
              className="px-2 py-1 text-sm rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
              onClick={() => setAllLayers(false)}
            >Hide all</button>
          </div>
        }>
          <LayerTogglePanel />
        </BottomSheet>

        <BottomSheet type={'report'} allowedStates={['half']} clickOutsideBehavior={null} title={'Reports'} closeBehavior={() => {
          const active = panelState['report'] !== 'off';
          setPanelState('report', active ? 'off' : 'half')
          setActiveReportMode(active ? null : 'territory_daily')
        }} 
        headerContent={
          reportModeActive && (
            <button
              className="px-2 py-1 text-sm rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
              onClick={() => {
                const active = panelState['report'] !== 'off';
                setPanelState('report', active ? 'off' : 'half')
                setActiveReportMode(active ? null : 'territory_daily')
              }}
            >Close Report</button>
          )
        }>
          <ReportModes />
        </BottomSheet>

        
          <BottomSheet 
            type={'info'} 
            allowedStates={['half']} 
            clickOutsideBehavior={'off'} 
            icon={selectedTeam && selectedTeam.icon} 
            title={
              (() => {
                if (selectedLocation) {
                  const isBase = checkMapIconHasTag(selectedLocation.tile.iconType, MapIconTag.Base);
                  const iconLabel = getIconLabel(selectedLocation.tile.iconType);
                  if (isBase && selectedLocation.name) return selectedLocation.name as string;
                  if (!isBase && iconLabel) return iconLabel as string;
                }
                return 'Info'; // fallback ensures a string
              })()}>
            <InfoSheet />
          </BottomSheet>
        

      </aside>

      <main className="flex-1">
        <MapView />
      </main>
    </div>
  );
}

function PanelButton({label, targetPanel, icon, disabled, onClick}: {label: string, targetPanel: PanelType, icon: string, disabled?: boolean, onClick?: () => void}): JSX.Element {

  const panelState = useMapStore((s) => s.panelState);
  const setPanelState = useMapStore((s) => s.setPanelState);
  const active = panelState[targetPanel] !== 'off';

  return (
  <div className={`flex justify-stretch border-2 ${active ? 'border-gray-100' : 'border-transparent'} rounded-2xl p-1 pointer-events-auto`}>
    <button
      className={`flex flex-1 flex-col p-3 justify-center items-center text-sm rounded-xl ${active ? 'bg-gray-100' : 'bg-gray-800 md:bg-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && onClick ? onClick() : setPanelState(targetPanel, active ? 'off' : targetPanel == 'layer' ? 'threequarters' : 'half')}
      disabled={disabled}
    >
      <img src={new URL(`./images/${icon}.png`, import.meta.url).href} className={`w-7 h-7 ${active ? 'invert' : ''}`} />
      <span className={`mt-1 ${active ? 'invert' : ''}`}>{label}</span>
    </button>
  </div>
  );
}

function computeVictoryCounts(territories: LocationTile[]): VictoryCounts {
  let colonial = 0;
  let warden = 0;
  let neutral = 0;
  let scorched = 0;

  for (const t of territories) {
    const isVictory = (t.flags & 0x01) === 0x01;
    const isScorched = (t.flags & 0x10) === 0x10;
    if (!isVictory) continue;

    if (isScorched) {
      scorched += 1;
      continue;
    }

    switch (t.owner) {
      case 'Colonial':
        colonial += 1;
        break;
      case 'Warden':
        warden += 1;
        break;
      default:
        neutral += 1;
        break;
    }
  }

  return { colonial, warden, neutral, scorched };
}
