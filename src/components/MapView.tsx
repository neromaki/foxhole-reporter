import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, LayerGroup, Marker, useMap, useMapEvents } from 'react-leaflet';
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
import { MAP_MIN_ZOOM, MAP_MAX_ZOOM, DATA_SOURCE, SHOW_DAILY_REPORT, SHOW_WEEKLY_REPORT, ZOOM_ICON_UPDATE_MODE, ZOOM_THROTTLE_MS, ICON_SMOOTH_SCALE, ICON_SMOOTH_DURATION_MS, DEBUG_PERF_OVERLAY } from '../lib/mapConfig';
import { SharedTooltipProvider, useSharedTooltip } from '../lib/sharedTooltip';

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
      zoom={MAP_MIN_ZOOM}
      minZoom={MAP_MIN_ZOOM}
      maxZoom={MAP_MAX_ZOOM}
      crs={CRS.Simple}
      className="h-full w-full bg-gray-900"
    >
      <SharedTooltipProvider>
        <ZoomLogger />
        <TerritoryLayer 
          snapshot={snapshot}
          activeLayers={activeLayers}
          changedDaily={changedDaily}
          changedWeekly={changedWeekly}
        />
        <HexTileLayer />
        <StaticMapLayer 
          visible={activeLayers.static}
          majorVisible={activeLayers.labelsMajor}
          minorVisible={activeLayers.labelsMinor}
        />
        {DEBUG_PERF_OVERLAY && <PerfOverlay />}
      </SharedTooltipProvider>
      {/* Additional layers (logistics/mining/etc.) would be added similarly */}
    </MapContainer>
  );
}

function ownerColor(owner: TerritoryTile['owner']) {
  switch (owner) {
    case 'Colonial': return '#16a34a';
    case 'Warden': return '#1d4ed8';
    default: return '#6b7280';
  }
}

// Logs zoom level on wheel/zoom events
function ZoomLogger() {
  const map = useMap();
  useMapEvents({
    zoom: () => {
      console.log('[MapView] Zoom event, zoom:', map.getZoom());
    },
  });
  React.useEffect(() => {
    const container = map.getContainer();
    const onWheel = () => {
      console.log('[MapView] Wheel event, zoom:', map.getZoom());
    };
    container.addEventListener('wheel', onWheel);
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [map]);
  return null;
}

// Territory markers rendered with icon sizes that scale by zoom
function TerritoryLayer({
  snapshot,
  activeLayers,
  changedDaily,
  changedWeekly,
}: {
  snapshot: { territories?: TerritoryTile[] } | undefined | null;
  activeLayers: any;
  changedDaily: Set<string> | false;
  changedWeekly: Set<string> | false;
}) {
  const map = useMap();
  // Caches for performance
  const iconUrlCache = React.useRef<Map<string, string>>(new Map());
  const iconSizeCache = React.useRef<Map<number, [number, number]>>(new Map());
  const iconInstanceCache = React.useRef<Map<string, L.Icon>>(new Map());
  const markerRefs = React.useRef<Map<string, L.Marker>>(new Map());
  const iconTypeById = React.useRef<Map<string, number>>(new Map());
  const ownerById = React.useRef<Map<string, TerritoryTile['owner']>>(new Map());

  const { show, hide } = useSharedTooltip();

  function getUrl(iconType: number, owner?: TerritoryTile['owner']): string {
    const key = `${iconType}|${owner ?? 'none'}`;
    if (iconUrlCache.current.has(key)) return iconUrlCache.current.get(key)!;
    const url = getIconUrl(iconType, owner);
    iconUrlCache.current.set(key, url);
    return url;
  }

  function getBaseSize(iconType: number): [number, number] {
    if (iconSizeCache.current.has(iconType)) return iconSizeCache.current.get(iconType)!;
    const s = getIconSize(iconType);
    iconSizeCache.current.set(iconType, s);
    return s;
  }

  function zoomBucket(z: number): string {
    return String(Math.round(z));
  }

  function scaleForZoom(z: number): number {
    return Math.pow(1.25, z - 1);
  }

  function getIcon(iconType: number, z: number, owner?: TerritoryTile['owner']): L.Icon {
    if (ICON_SMOOTH_SCALE) {
      // Single icon per iconType at max zoom size
      const key = `${iconType}|max|${owner ?? 'none'}`; // include owner in cache key
      const cached = iconInstanceCache.current.get(key);
      if (cached) return cached;
      const [bw, bh] = getBaseSize(iconType);
      const maxScale = scaleForZoom(MAP_MAX_ZOOM);
      const w = Math.max(8, Math.round(bw * maxScale));
      const h = Math.max(8, Math.round(bh * maxScale));
      const icon = L.icon({
        iconUrl: getUrl(iconType, owner),
        iconSize: [w, h],
        iconAnchor: [w / 2, h / 2],
        className: 'drop-shadow-sm smooth-icon-base',
      });
      iconInstanceCache.current.set(key, icon);
      return icon;
    } else {
      const bucket = zoomBucket(z);
      const key = `${iconType}|${bucket}|${owner ?? 'none'}`;
      const cached = iconInstanceCache.current.get(key);
      if (cached) return cached;
      const [bw, bh] = getBaseSize(iconType);
      const s = scaleForZoom(z);
      const w = Math.max(8, Math.round(bw * s));
      const h = Math.max(8, Math.round(bh * s));
      const icon = L.icon({
        iconUrl: getUrl(iconType, owner),
        iconSize: [w, h],
        iconAnchor: [w / 2, h / 2],
        className: 'drop-shadow-sm',
      });
      iconInstanceCache.current.set(key, icon);
      return icon;
    }
  }

  function applySmoothScale(marker: L.Marker, iconType: number, z: number) {
    const el = marker.getElement();
    if (!el) return;
    const img = el.querySelector('img.leaflet-marker-icon') as HTMLImageElement | null;
    if (!img) return;
    const maxScale = scaleForZoom(MAP_MAX_ZOOM);
    const currentScale = scaleForZoom(z) / maxScale;
    img.style.transition = `transform ${ICON_SMOOTH_DURATION_MS}ms ease-out`;
    img.style.transformOrigin = 'center center';
    img.style.transform = `scale(${currentScale})`;
  }

  function updateIconsForZoom(z: number) {
    if (ICON_SMOOTH_SCALE) {
      // Just adjust transform scale; icons created at max size.
      for (const [id, marker] of markerRefs.current) {
        const iconType = iconTypeById.current.get(id);
        if (iconType == null) continue;
        applySmoothScale(marker, iconType, z);
      }
    } else {
      const bucket = zoomBucket(z);
      for (const [id, iconType] of iconTypeById.current) {
        const owner = ownerById.current.get(id);
        const key = `${iconType}|${bucket}|${owner ?? 'none'}`;
        if (!iconInstanceCache.current.has(key)) {
          iconInstanceCache.current.set(key, getIcon(iconType, z, owner));
        }
      }
      for (const [id, marker] of markerRefs.current) {
        const iconType = iconTypeById.current.get(id);
        const owner = ownerById.current.get(id);
        if (iconType == null) continue;
        marker.setIcon(getIcon(iconType, z, owner));
      }
    }
  }

  // Attach zoom handlers based on config mode
  React.useEffect(() => {
    if (ZOOM_ICON_UPDATE_MODE === 'throttle') {
      let scheduled = false;
      let lastRun = 0;
      const handler = () => {
        const now = Date.now();
        if (now - lastRun >= ZOOM_THROTTLE_MS) {
          lastRun = now;
          updateIconsForZoom(map.getZoom());
          scheduled = false;
        } else if (!scheduled) {
          scheduled = true;
          const delay = ZOOM_THROTTLE_MS - (now - lastRun);
          setTimeout(() => {
            lastRun = Date.now();
            updateIconsForZoom(map.getZoom());
            scheduled = false;
          }, delay);
        }
      };
      map.on('zoom', handler);
      return () => {
        map.off('zoom', handler);
      };
    } else {
      const handler = () => updateIconsForZoom(map.getZoom());
      map.on('zoomend', handler);
      return () => {
        map.off('zoomend', handler);
      };
    }
  }, [map]);

  // Memoize projection of territory positions so zoom changes don't recompute
  const projectedTerritories = useMemo(() => {
    if (!snapshot?.territories) return [] as Array<{
      t: TerritoryTile;
      lat: number;
      lng: number;
    }>;
    const out: Array<{ t: TerritoryTile; lat: number; lng: number }> = [];
    for (const t of snapshot.territories) {
      const projected = projectRegionPoint(t.region, t.x, t.y);
      if (!projected) continue;
      const [lat, lng] = projected;
      out.push({ t, lat, lng });
    }
    return out;
  }, [snapshot]);

  // Viewport culling: only render markers within current map bounds (with padding)
  const [visibleTerritories, setVisibleTerritories] = React.useState<Array<{ t: TerritoryTile; lat: number; lng: number }>>([]);

  function isInBounds(lat: number, lng: number, b: L.LatLngBounds, pad: number): boolean {
    const padded = L.latLngBounds(
      [b.getSouth() - pad, b.getWest() - pad],
      [b.getNorth() + pad, b.getEast() + pad]
    );
    return padded.contains([lat, lng] as any);
  }

  React.useEffect(() => {
    if (!map) return;
    let rafId: number | null = null;
    const PAD = 20; // padding in map CRS units to avoid pop-in at edges

    const recompute = () => {
      const bounds = map.getBounds();
      const filtered = projectedTerritories.filter(({ lat, lng }) => isInBounds(lat, lng, bounds, PAD));
      setVisibleTerritories(filtered);
    };

    const schedule = () => {
      if (rafId != null) return;
      rafId = (window.requestAnimationFrame as any)(() => {
        rafId = null;
        recompute();
      });
    };

    // Initial compute
    recompute();

    const onMove = () => schedule();
    const onZoom = () => schedule();
    map.on('move', onMove);
    map.on('zoom', onZoom);

    return () => {
      map.off('move', onMove);
      map.off('zoom', onZoom);
      if (rafId != null) (window.cancelAnimationFrame as any)(rafId);
    };
  }, [map, projectedTerritories]);

  // Prune stale marker refs when visibleTerritories changes
  React.useEffect(() => {
    const ids = new Set(visibleTerritories.map(v => v.t.id));
    for (const id of Array.from(markerRefs.current.keys())) {
      if (!ids.has(id)) {
        markerRefs.current.delete(id);
        iconTypeById.current.delete(id);
      }
    }
    if (DEBUG_PERF_OVERLAY) {
      //console.log('[Perf] After prune: visible=', visibleTerritories.length, 'refs=', markerRefs.current.size);
    }
  }, [visibleTerritories]);


  // Helper to build tooltip content
  const getTooltipContent = React.useCallback((t: TerritoryTile) => {
    const isVictoryBase = (t.flags & 0x01) !== 0;
    const isScorched = (t.flags & 0x10) !== 0;
    const isBuildSite = (t.flags & 0x04) !== 0;
    const parts = [
      `<div class="font-semibold">${getIconLabel(t.iconType)}</div>`,
      `<div>${t.owner}</div>`,
      `<div class="text-gray-400">${t.region}</div>`,
    ];
    if (isVictoryBase) parts.push('<div class="text-amber-400">Victory Base</div>');
    if (isScorched) parts.push('<div class="text-red-400">Scorched</div>');
    if (isBuildSite) parts.push('<div class="text-blue-400">Build Site</div>');
    if (SHOW_DAILY_REPORT && changedDaily && (changedDaily as Set<string>).has(t.id)) {
      parts.push('<div class="text-purple-400">Changed 24h</div>');
    }
    if (SHOW_WEEKLY_REPORT && changedWeekly && (changedWeekly as Set<string>).has(t.id)) {
      parts.push('<div class="text-amber-400">Changed 7d</div>');
    }
    return `<div class="text-xs">${parts.join('')}</div>`;
  }, [changedDaily, changedWeekly]);

  // Hover handlers
  const handleMouseOver = React.useCallback((t: TerritoryTile, lat: number, lng: number) => {
    show(getTooltipContent(t), lat, lng, 100);
  }, [show, getTooltipContent]);

  const handleMouseOut = React.useCallback(() => {
    hide(200);
  }, [hide]);

  if (!activeLayers.territory) return null;

  return (
    <LayerGroup>
      {visibleTerritories.map(({ t, lat, lng }, idx: number) => {

        const isVictoryBase = (t.flags & 0x01) !== 0;
        const isScorched = (t.flags & 0x10) !== 0;
        const isBuildSite = (t.flags & 0x04) !== 0;

        // Cache iconType by id and create initial icon using current zoom
        iconTypeById.current.set(t.id, t.iconType);
        ownerById.current.set(t.id, t.owner);
        const initialIcon = getIcon(t.iconType, map.getZoom(), t.owner);

        return (
          <Marker
            key={t.id}
            position={[lat, lng]}
            icon={initialIcon}
            eventHandlers={{
              mouseover: () => handleMouseOver(t, lat, lng),
              mouseout: handleMouseOut,
            }}
            ref={(ref: any) => {
              if (ref) markerRefs.current.set(t.id, ref);
              if (ref && ICON_SMOOTH_SCALE) {
                // Apply initial scale without animation
                const el = ref.getElement();
                if (el) {
                  const img = el.querySelector('img.leaflet-marker-icon') as HTMLImageElement | null;
                  if (img) {
                    const maxScale = scaleForZoom(MAP_MAX_ZOOM);
                    const currentScale = scaleForZoom(map.getZoom()) / maxScale;
                    img.style.transformOrigin = 'center center';
                    img.style.transform = `scale(${currentScale})`;
                  }
                }
              }
            }}
          />
        );
      })}
    </LayerGroup>
  );
}

// Simple performance overlay to inspect marker counts and memory usage
function PerfOverlay() {
  const map = useMap();
  const [stats, setStats] = useState<{ markers: number; tooltipPresent: boolean; heapMB?: number; domMarkerIcons: number }>({ markers: 0, tooltipPresent: false, domMarkerIcons: 0 });
  // Access refs via a global window hook for debugging (optional)
  // @ts-ignore
  const globalMarkerCount = (window.__markerRefsSize = (window.__markerRefsSize || 0));
  useEffect(() => {
    let interval: number | null = null;
    const collect = () => {
      const markerIcons = document.querySelectorAll('.leaflet-marker-icon');
      const tooltip = document.querySelector('.shared-territory-tooltip');
      let heapMB: number | undefined;
      // Chrome only: performance.memory
      const pm: any = (performance as any).memory;
      if (pm && pm.usedJSHeapSize) {
        heapMB = pm.usedJSHeapSize / 1024 / 1024;
      }
      // Derive logical marker count from React state (using data attr on container if available) or fallback to DOM icons
      const logicalCount = (document.querySelector('#perf-logical-marker-count')?.getAttribute('data-count'));
      const logicalMarkers = logicalCount ? parseInt(logicalCount, 10) : markerIcons.length;
      setStats({ markers: logicalMarkers, tooltipPresent: !!tooltip, heapMB, domMarkerIcons: markerIcons.length });
    };
    collect();
    interval = window.setInterval(collect, 2000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [map]);
  return (
    <div className="absolute top-2 right-2 z-[1000] rounded bg-black/60 text-xs text-white px-2 py-1 space-y-0.5">
      <div>Logical Markers: {stats.markers}</div>
      <div>DOM Icons: {stats.domMarkerIcons}</div>
      <div>Tooltip mounted: {stats.tooltipPresent ? 'yes' : 'no'}</div>
      {stats.heapMB && <div>Heap: {stats.heapMB.toFixed(1)} MB</div>}
    </div>
  );
}
