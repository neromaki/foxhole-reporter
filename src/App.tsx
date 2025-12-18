import React, { useMemo } from 'react';
import MapView from './components/MapView';
import LayerTogglePanel from './components/LayerTogglePanel';
import JobViewPanel from './components/JobViewPanel';
import ReportModes from './components/ReportModes';
import VictoryBar, { VictoryCounts } from './components/VictoryBar';
import { useLatestSnapshot, useWarState } from './lib/queries';
import { useWarApiDirect } from './lib/hooks/useWarApiDirect';
import { DATA_SOURCE, WARSTATE_GRAPH_SHOW_NEUTRAL, WARSTATE_GRAPH_SHOW_SCORCHED } from './lib/mapConfig';
import type { LocationTile } from './types/war';

export default function App() {
  const { data: supabaseSnapshot } = useLatestSnapshot({ enabled: DATA_SOURCE === 'supabase' });
  const { data: warApiSnapshot } = useWarApiDirect({ enabled: DATA_SOURCE === 'warapi' });
  const snapshot = DATA_SOURCE === 'warapi' ? warApiSnapshot : supabaseSnapshot;

  const { data: warState } = useWarState();

  const victoryCounts = useMemo<VictoryCounts | null>(() => {
    if (!snapshot?.territories) return null;
    return computeVictoryCounts(snapshot.territories);
  }, [snapshot]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <VictoryBar
        counts={victoryCounts}
        requiredVictoryTowns={warState?.requiredVictoryTowns ?? null}
        showNeutral={WARSTATE_GRAPH_SHOW_NEUTRAL}
        showScorched={WARSTATE_GRAPH_SHOW_SCORCHED}
        warNumber={warState?.warNumber}
        className="visible absolute top-0 inset-x-3 z-[1000] hidden"
      />
      <aside className="w-full md:w-[25rem] bg-gray-800 border-r border-gray-700 flex flex-col absolute -left-full md:relative md:left-0 z-[500]">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-semibold">Foxhole Reporter</h1>
          <p className="text-xs text-gray-400">Live territory & logistics overlays</p>
          <VictoryBar
            counts={victoryCounts}
            requiredVictoryTowns={warState?.requiredVictoryTowns ?? null}
            showNeutral={WARSTATE_GRAPH_SHOW_NEUTRAL}
            showScorched={WARSTATE_GRAPH_SHOW_SCORCHED}
            warNumber={warState?.warNumber}
            className="victory visible absolute md:static top-0 left-[103%] -right-[97%] z-[1000]"
          />
          <ReportModes />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-full overflow-y-auto">
            <LayerTogglePanel />
          </div>
        </div>
      </aside>
      <main className="flex-1">
        <MapView />
      </main>
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
