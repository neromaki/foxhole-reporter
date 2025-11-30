import React, { useEffect, useMemo } from 'react';
import { MapContainer, Tooltip, LayerGroup, CircleMarker, Marker } from 'react-leaflet';
import { CRS } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLatestSnapshot, useTerritoryDiff } from '../lib/queries';
import { useWarApiDirect } from '../lib/hooks/useWarApiDirect';
import { useMapStore } from '../state/useMapStore';
import { projectRegionPoint, WORLD_EXTENT } from '../lib/projection';
import HexTileLayer from './HexTileLayer';
import StaticMapLayer from './StaticMapLayer';
import { getHexByApiName } from '../lib/hexLayout';
import { getIconUrl, getIconSize } from '../lib/icons';
import L from 'leaflet';
import type { TerritoryTile } from '../types/war';
import { MAP_MIN_ZOOM, MAP_MAX_ZOOM, DATA_SOURCE, SHOW_DAILY_REPORT, SHOW_WEEKLY_REPORT } from '../lib/mapConfig';

// Map WarAPI icon type to human-readable label
function getIconLabel(iconType: number): string {
  const iconMap: Record<number, string> = {
    11: 'Hospital', 12: 'Vehicle Factory', 17: 'Refinery', 18: 'Shipyard',
    19: 'Engineering Center', 20: 'Salvage Field', 21: 'Component Field',
    22: 'Fuel Field', 23: 'Sulfur Field', 27: 'Keep', 28: 'Observation Tower',
    29: 'Fort', 32: 'Sulfur Mine', 33: 'Storage Facility', 34: 'Factory',
    35: 'Garrison Station', 37: 'Rocket Site', 38: 'Salvage Mine',
    39: 'Construction Yard', 40: 'Component Mine', 45: 'Relic Base',
    51: 'Mass Production Factory', 52: 'Seaport', 53: 'Coastal Gun',
    54: 'Soul Factory', 56: 'Town Base 1', 57: 'Town Base 2', 58: 'Town Base 3',
    59: 'Storm Cannon', 60: 'Intel Center', 61: 'Coal Field', 62: 'Oil Field',
    70: 'Rocket Target', 71: 'Rocket Ground Zero', 72: 'Rocket Site (Armed)',
    75: 'Oil Rig', 83: 'Weather Station', 84: 'Mortar House'
  };
  return iconMap[iconType] ?? `Icon ${iconType}`;
}

export default function MapView() {
  // Fetch data based on config constant (only one source is fetched)
  const { data: supabaseSnapshot } = useLatestSnapshot({ enabled: DATA_SOURCE === 'supabase' });
  const { data: warApiSnapshot } = useWarApiDirect({ enabled: DATA_SOURCE === 'warapi' });
  const snapshot = DATA_SOURCE === 'warapi' ? warApiSnapshot : supabaseSnapshot;
  
  const { data: dailyDiff } = SHOW_DAILY_REPORT ? useTerritoryDiff('daily') : { data: undefined };
  const changedDaily = SHOW_DAILY_REPORT ? useMemo<Set<string>>(() => new Set((dailyDiff?.changes ?? []).map((c: { id: string }) => c.id)), [dailyDiff]) : false;
  
  const { data: weeklyDiff } = SHOW_WEEKLY_REPORT ? useTerritoryDiff('weekly') : { data: undefined };
  const changedWeekly = SHOW_WEEKLY_REPORT ? useMemo<Set<string>>(() => new Set((weeklyDiff?.changes ?? []).map((c: { id: string }) => c.id)), [weeklyDiff]) : false;

  const activeLayers = useMapStore((s) => s.activeLayers);

  useEffect(() => {
    console.log('[MapView] Data source (config):', DATA_SOURCE);
    console.log('[MapView] Snapshot data:', snapshot);
    console.log('[MapView] Territory count:', snapshot?.territories?.length ?? 0);
    console.log('[MapView] Territory layer active:', activeLayers.territory);
    if (snapshot?.territories && snapshot.territories.length > 0) {
      console.log('[MapView] Sample territory:', snapshot.territories[0]);
    }
  }, [snapshot, activeLayers.territory]);

  return (
    <MapContainer 
      center={[0, 0] as [number, number]} 
      zoom={1}
      minZoom={MAP_MIN_ZOOM}
      maxZoom={MAP_MAX_ZOOM}
      crs={CRS.Simple}
      className="h-full w-full bg-gray-900"
    >
      <HexTileLayer />
      <StaticMapLayer 
        visible={activeLayers.static}
        majorVisible={activeLayers.labelsMajor}
        minorVisible={activeLayers.labelsMinor}
      />
      {activeLayers.territory && (
        <LayerGroup>
          {snapshot?.territories.map((t: TerritoryTile, idx: number) => {
            // Project directly into the bounds of the region's hex tile.
            const projected = projectRegionPoint(t.region, t.x, t.y);
            console.log(`[MapView] Projecting region: ${t.region} at (${t.x}, ${t.y})`);
            if (!projected) {
              console.warn(`[MapView] Failed to project region: ${t.region} at (${t.x}, ${t.y})`);
              return null;
            }
            const [lat, lng] = projected;
            
            if (idx < 3) {
              console.log(`[MapView] Marker ${idx}: region=${t.region}, iconType=${t.iconType}, pos=[${lat}, ${lng}]`);
            }
            
            const isVictoryBase = (t.flags & 0x01) !== 0;
            const isScorched = (t.flags & 0x10) !== 0;
            const isBuildSite = (t.flags & 0x04) !== 0;

            const [w, h] = getIconSize(t.iconType);
            const iconUrl = getIconUrl(t.iconType);
            if (idx < 3) {
              console.log(`[MapView] Icon ${idx}: url=${iconUrl}, size=[${w}, ${h}]`);
            }
            const icon = L.icon({
              iconUrl,
              iconSize: [w, h],
              iconAnchor: [w / 2, h / 2],
              className: 'drop-shadow-sm'
            });

            return (
              <Marker key={t.id} position={[lat, lng]} icon={icon}>
                <Tooltip>
                  <div className="text-xs">
                    <div className="font-semibold">{getIconLabel(t.iconType)}</div>
                    <div>{t.owner}</div>
                    <div className="text-gray-400">{t.region}</div>
                    {isVictoryBase && <div className="text-amber-400">Victory Base</div>}
                    {isScorched && <div className="text-red-400">Scorched</div>}
                    {isBuildSite && <div className="text-blue-400">Build Site</div>}
                    {SHOW_DAILY_REPORT && changedDaily ? changedDaily.has(t.id) && <div className="text-purple-400">Changed 24h</div> : null}
                    {SHOW_WEEKLY_REPORT && changedWeekly ? changedWeekly.has(t.id) && <div className="text-amber-400">Changed 7d</div> : null}
                  </div>
                </Tooltip>
              </Marker>
            );
          })}
          {activeLayers.debugRegions && snapshot?.territories.map((t: TerritoryTile, idx: number) => {
            const projected = projectRegionPoint(t.region, t.x, t.y);
            if (!projected) return null;
            const [lat, lng] = projected;
            return (
              <Marker position={[lat, lng]} key={`dbg-${t.id}-${idx}`} icon={L.divIcon({
                className: 'map-label text-[9px] font-semibold',
                html: `<span>${t.region}</span>`
              })} />
            );
          })}
        </LayerGroup>
      )}
      {/* Additional layers (logistics/mining/etc.) would be added similarly */}
    </MapContainer>
  );
}

function ownerColor(owner: TerritoryTile['owner']) {
  switch (owner) {
    case 'Colonial': return '#1d4ed8';
    case 'Warden': return '#16a34a';
    default: return '#6b7280';
  }
}
