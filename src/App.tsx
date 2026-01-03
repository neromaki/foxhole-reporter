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

export default function App() {
  const [isTouch, setIsTouch] = useState(false);
  const { data: supabaseSnapshot } = useLatestSnapshot({ enabled: DATA_SOURCE === 'supabase' });
  const { data: warApiSnapshot } = useWarApiDirect({ enabled: DATA_SOURCE === 'warapi' });
  const snapshot = DATA_SOURCE === 'warapi' ? warApiSnapshot : supabaseSnapshot;

  const { data: warState } = useWarState();

  const setAllLayers = useMapStore((s) => s.setAllLayers);
  const reportModeActive = useMapStore((s) => s.activeReportMode !== null);

  const selectedLocation = useMapStore((s) => s.selectedLocation);

  const victoryCounts = useMemo<VictoryCounts | null>(() => {
    if (!snapshot?.territories) return null;
    return computeVictoryCounts(snapshot.territories);
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

        
        <div className={`fixed top-2 inset-x-2 flex flex-col justify-start items-end z-[430] pointer-events-none`}>
          <VictoryBar
            counts={victoryCounts}
            requiredVictoryTowns={warState?.requiredVictoryTowns ?? null}
            showNeutral={WARSTATE_GRAPH_SHOW_NEUTRAL}
            showScorched={WARSTATE_GRAPH_SHOW_SCORCHED}
            warNumber={warState?.warNumber}
          />
          <div className={`flex items-start justify-normal`}>
            <div className={`mt-4 mr-3`}>
              <ContextPopover />
            </div>

            <div className={`flex flex-col mt-2 flex-shrink-0`}>
              <PanelButton label="Layers" targetPanel="layer" icon={'icn_layers'} />
              <PanelButton label="Reports" targetPanel="report" icon={'icn_reports'} />
            </div>
          </div>
        </div>

        <BottomSheet type={'layer'} allowedStates={['full']} clickOutsideBehavior={'off'} title={'Layers'} headerContent={
          <div className="flex gap-2">
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

        <BottomSheet type={'report'} allowedStates={['half']} clickOutsideBehavior={'off'} title={'Reports'} headerContent={
          reportModeActive && (
            <button
              className="px-2 py-1 text-sm rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
              onClick={() => useMapStore.getState().setActiveReportMode(null)}
            >Close Report</button>
          )
        }>
          <ReportModes />
        </BottomSheet>

        {isTouch && (
          <BottomSheet type={'info'} allowedStates={['half']} clickOutsideBehavior={'off'} icon={selectedTeam && selectedTeam.icon} title={selectedLocation && selectedLocation.name ? selectedLocation.name : 'Info'}>
            <InfoSheet />
          </BottomSheet>
        )}

      </aside>

      <main className="flex-1">
        <MapView />
      </main>
    </div>
  );
}

function PanelButton({label, targetPanel, icon, onClick}: {label: string, targetPanel: PanelType, icon: string, onClick?: () => void}): JSX.Element {

  const panelState = useMapStore((s) => s.panelState);
  const setPanelState = useMapStore((s) => s.setPanelState);
  const active = panelState[targetPanel] !== 'off';

  return (
  <div className={`border-2 ${active ? 'border-gray-100' : 'border-transparent'} rounded-2xl p-1 pointer-events-auto`}>
    <button
      className={`flex flex-1 flex-col p-3 justify-center items-center text-sm rounded-xl ${active ? 'bg-gray-100' : 'bg-gray-800'}`}
      onClick={() => onClick ? onClick() : setPanelState(targetPanel, active ? 'off' : targetPanel == 'layer' ? 'threequarters' : 'half')}
    >
      <img src={new URL(`./images/${icon}.png`, import.meta.url).href} className={`w-7 h-7 ${active ? 'invert' : ''}`} />
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
