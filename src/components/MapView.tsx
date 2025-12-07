import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, LayerGroup, Marker, useMap, useMapEvents } from 'react-leaflet';
import { CRS } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLatestSnapshot, useTerritoryDiff } from '../lib/queries';
import { useWarApiDirect } from '../lib/hooks/useWarApiDirect';
import { useMapStore } from '../state/useMapStore';
import { projectRegionPoint, WORLD_EXTENT } from '../lib/projection';
import HexTileLayer from './HexTileLayer';
import HexNameLabels from './HexNameLabels';
import { StaticIconLayer, StaticLabelLayer } from './StaticMapLayer';
import TerritorySubregionLayer from './TerritorySubregionLayer';
import { getHexByApiName } from '../lib/hexLayout';
import { getIconUrl, getIconSize, getMapIcon, getIconLabel, getMapIconsByTag, getIconWikiUrl } from '../lib/icons';
import { MapIconTag } from '../data/map-icons';
import L from 'leaflet';
import type { LocationTile } from '../types/war';
import { MAP_MIN_ZOOM, MAP_MAX_ZOOM, DATA_SOURCE, SHOW_DAILY_REPORT, SHOW_WEEKLY_REPORT, ZOOM_ICON_UPDATE_MODE, ZOOM_THROTTLE_MS, ICON_SMOOTH_SCALE, ICON_SMOOTH_DURATION_MS, DEBUG_PERF_OVERLAY, REPORT_UNAFFECTED_ICON_OPACITY } from '../lib/mapConfig';
import { SharedTooltipProvider, useSharedTooltip } from '../lib/sharedTooltip';
import { layerTagsByKey } from './LayerTogglePanel';
import { getJobViewFilter } from '../state/jobViews';
import { useStaticMaps } from '../lib/hooks/useStaticMaps';

export default function MapView() {
  // Fetch data based on config constant (only one source is fetched)
  const { data: supabaseSnapshot } = useLatestSnapshot({ enabled: DATA_SOURCE === 'supabase' });
  const { data: warApiSnapshot } = useWarApiDirect({ enabled: DATA_SOURCE === 'warapi' });
  const snapshot = DATA_SOURCE === 'warapi' ? warApiSnapshot : supabaseSnapshot;
  
  const { data: dailyDiff } = useTerritoryDiff('daily');
  const changedDaily = useMemo<Set<string>>(() => new Set((dailyDiff?.changes ?? []).map((c: { id: string }) => c.id)), [dailyDiff]);

  const { data: weeklyDiff } = useTerritoryDiff('weekly');
  const changedWeekly = useMemo<Set<string>>(() => new Set((weeklyDiff?.changes ?? []).map((c: { id: string }) => c.id)), [weeklyDiff]);

  const activeLayers = useMapStore((s) => s.activeLayers);
  const reportMode = useMapStore((s) => s.activeReportMode);
  const activeJobViewId = useMapStore(s => s.activeJobViewId);

  const effectiveLayers = useMemo(() => {
    if (!reportMode) return activeLayers;
    // In report mode: hide locations (icons), only show territories (SVG)
    return { ...activeLayers, locations: false, territories: true };
  }, [activeLayers, reportMode]);

  useEffect(() => {
    console.log('[MapView] Data source (config):', DATA_SOURCE);
    console.log('[MapView] Snapshot data:', snapshot);
    console.log('[MapView] Location count:', snapshot?.territories?.length ?? 0);
    console.log('[MapView] Location layer active:', activeLayers.locations);
    if (snapshot?.territories && snapshot.territories.length > 0) {
      console.log('[MapView] Sample locations:', snapshot.territories[0]);
    }
  }, [snapshot, activeLayers.locations]);


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
        <StaticIconLayer visible={true} />
        <LocationsLayer 
          snapshot={snapshot}
          activeLayers={effectiveLayers} // hide location layer at zooms < 0
          changedDaily={changedDaily}
          changedWeekly={changedWeekly}
        />
        <TerritorySubregionLayer
          snapshot={snapshot}
          changedDaily={changedDaily}
          changedWeekly={changedWeekly}
          visible={effectiveLayers.territories}
        />
        <HexTileLayer />
        <StaticLabelLayer 
          majorVisible={activeLayers.majorLocations}
          minorVisible={activeLayers.minorLocations && !activeJobViewId}
        />
        <HexNameLabels />
      </SharedTooltipProvider>
      {/* Additional layers (logistics/mining/etc.) would be added similarly */}
    </MapContainer>
  );
}

function ownerColor(owner: LocationTile['owner']) {
  switch (owner) {
    case 'Colonial': return '#16a34a';
    case 'Warden': return '#1d4ed8';
    default: return '#6b7280';
  }
}

function getOwnerIcon(owner: LocationTile['owner']) {
  const iconFilename = `logo_${owner}.png`
  return new URL(`../images/${iconFilename}`, import.meta.url).href;
}

// Territory markers rendered with icon sizes that scale by zoom
function LocationsLayer({
  snapshot,
  activeLayers,
  changedDaily,
  changedWeekly,
}: {
  snapshot: { territories?: LocationTile[] } | undefined | null;
  activeLayers: any;
  changedDaily: Set<string>;
  changedWeekly: Set<string>;
}) {
  const map = useMap();
  const [zoom, setZoom] = React.useState(map.getZoom());

  React.useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  // Caches for performance
  const iconUrlCache = React.useRef<Map<string, string>>(new Map());
  const iconSizeCache = React.useRef<Map<number, [number, number]>>(new Map());
  const iconInstanceCache = React.useRef<Map<string, L.Icon>>(new Map());
  const markerRefs = React.useRef<Map<string, L.Marker>>(new Map());
  const iconTypeById = React.useRef<Map<string, number>>(new Map());
  const ownerById = React.useRef<Map<string, LocationTile['owner']>>(new Map());

  const { show, hide } = useSharedTooltip();
  const reportMode = useMapStore(s => s.activeReportMode);

  // Load static maps to access projected Major labels for nearest-location lookup
  const { data: staticMaps } = useStaticMaps(true);

  const majorLabelsByMap = useMemo(() => {
    const m = new Map<string, Array<{ lat: number; lng: number; text: string }>>();
    (staticMaps ?? []).forEach(entry => {
      const arr: Array<{ lat: number; lng: number; text: string }> = [];
      entry.data.mapTextItems.forEach(txt => {
        if (txt.mapMarkerType === 'Major') {
          const projected = projectRegionPoint(entry.mapName, txt.x, txt.y);
          if (projected) {
            const [lat, lng] = projected;
            arr.push({ lat, lng, text: txt.text });
          }
        }
      });
      m.set(entry.mapName, arr);
    });
    return m;
  }, [staticMaps]);

  function nearestMajorLabel(region: string, lat: number, lng: number): string | null {
    const arr = majorLabelsByMap.get(region);
    if (!arr || arr.length === 0) return null;
    let bestIdx = -1;
    let bestD = Infinity;
    for (let i = 0; i < arr.length; i++) {
      const lab = arr[i];
      const dx = lab.lat - lat;
      const dy = lab.lng - lng;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    return bestIdx >= 0 ? arr[bestIdx].text : null;
  }

  function getUrl(iconType: number, owner?: LocationTile['owner']): string {
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

  function getIcon(iconType: number, z: number, owner?: LocationTile['owner']): L.Icon {
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

  function markerIconElement(marker: L.Marker): HTMLElement | null {
    const el = marker.getElement() as HTMLElement | null;
    if (!el) return null;
    if (el.tagName === 'IMG' || el.classList.contains('leaflet-marker-icon')) return el;
    const inside = el.querySelector('img.leaflet-marker-icon, .leaflet-marker-icon') as HTMLElement | null;
    return inside ?? el;
  }

  function applySmoothScale(marker: L.Marker, iconType: number, z: number, highlighted: boolean) {
    const img = markerIconElement(marker);
    if (!img) return;
    img.style.transition = `opacity 120ms ease-out`;
    img.style.opacity = reportMode ? (highlighted ? '1' : `${REPORT_UNAFFECTED_ICON_OPACITY}`) : '1';
  }

  function updateIconsForZoom(z: number) {
    if (ICON_SMOOTH_SCALE) {
      // Just adjust transform scale; icons created at max size.
      for (const [id, marker] of markerRefs.current) {
        const iconType = iconTypeById.current.get(id);
        if (iconType == null) continue;
        const highlighted = reportMode === 'daily'
          ? !!(changedDaily && (changedDaily as Set<string>).has(id))
          : reportMode === 'weekly'
          ? !!(changedWeekly && (changedWeekly as Set<string>).has(id))
          : false;
        applySmoothScale(marker, iconType, z, highlighted);
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
        const highlighted = reportMode === 'daily'
          ? !!(changedDaily && (changedDaily as Set<string>).has(id))
          : reportMode === 'weekly'
          ? !!(changedWeekly && (changedWeekly as Set<string>).has(id))
          : false;
        const img = markerIconElement(marker);
        if (img) {
          img.style.transition = `opacity 120ms ease-out`;
          img.style.opacity = reportMode ? (highlighted ? '1' : `${REPORT_UNAFFECTED_ICON_OPACITY}`) : '1';
        }
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
      t: LocationTile;
      lat: number;
      lng: number;
    }>;
    const out: Array<{ t: LocationTile; lat: number; lng: number }> = [];
    for (const t of snapshot.territories) {
      const projected = projectRegionPoint(t.region, t.x, t.y);
      if (!projected) continue;
      const [lat, lng] = projected;
      out.push({ t, lat, lng });
    }
    return out;
  }, [snapshot]);

  // Viewport culling: only render markers within current map bounds (with padding)
  const [visibleTerritories, setVisibleTerritories] = React.useState<Array<{ t: LocationTile; lat: number; lng: number }>>([]);

  function isInBounds(lat: number, lng: number, b: L.LatLngBounds, pad: number): boolean {
    const padded = L.latLngBounds(
      [b.getSouth() - pad, b.getWest() - pad],
      [b.getNorth() + pad, b.getEast() + pad]
    );
    return padded.contains([lat, lng] as any);
  }

  const activeJobViewId = useMapStore(s => s.activeJobViewId);
  const excludedIconTypes = useMemo<Set<number>>(() => {
    const excluded = new Set<number>();
    for (const [key, isOn] of Object.entries(activeLayers)) {
      if (isOn) continue;
      const tags = (layerTagsByKey as any)[key] as any[] | undefined;
      if (!tags || tags.length === 0) continue;
      for (const tag of tags) {
        const icons = getMapIconsByTag(tag as any);
        for (const mi of icons) excluded.add(mi.id);
      }
    }
    return excluded;
  }, [activeLayers]);

  // Job view filter function
  const jobViewFilter = useMemo(() => {
    if (!activeJobViewId) return null;
    return getJobViewFilter(activeJobViewId);
  }, [activeJobViewId]);

  React.useEffect(() => {
    if (!map) return;
    let rafId: number | null = null;
    const PAD = 20; // padding in map CRS units to avoid pop-in at edges

    const recompute = () => {
      const bounds = map.getBounds();
      let base = projectedTerritories;
      if (jobViewFilter) {
        base = base.filter(({ t }) => {
          const mi = getMapIcon(t.iconType);
          if (!mi) return false; // exclude unknown
          return jobViewFilter(mi.tags);
        });
      } else {
        base = base.filter(({ t }) => !excludedIconTypes.has(t.iconType));
      }
      const filtered = base.filter(({ lat, lng }) => isInBounds(lat, lng, bounds, PAD));
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
  }, [map, projectedTerritories, excludedIconTypes, jobViewFilter, reportMode]);

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
  const getTooltipContent = React.useCallback((t: LocationTile, lat: number, lng: number) => {
    const isVictoryBase = (t.flags & 0x01) !== 0;
    const isScorched = (t.flags & 0x10) !== 0;
    const isBuildSite = (t.flags & 0x04) !== 0;
    const parts = [];
    const wikiUrl = getIconWikiUrl(t.iconType);
    const labelHtml = wikiUrl
      ? `<a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" class="font-semibold underline decoration-dotted">${getIconLabel(t.iconType)}</a>`
      : `<span class="font-semibold">${getIconLabel(t.iconType)}</span>`;
    parts.push(labelHtml);
    const nearbyMajor = nearestMajorLabel(t.region, lat, lng);
    if (nearbyMajor) parts.push(`<div class="text-gray-400">${nearbyMajor}</div>`);
    const hexName = getHexByApiName(t.region)?.displayName;
    if (hexName) parts.push(`<div class="text-gray-500">${hexName}</div>`);
    if (t.owner !== 'Neutral') parts.push(`<div class="flex"><img src="${getOwnerIcon(t.owner)}" alt="${t.owner}" class="inline-block w-4 h-4 mr-1"/>${t.owner}</div>`);
    if (isVictoryBase) parts.push('<div class="text-amber-400">Victory Base</div>');
    if (isScorched) parts.push('<div class="text-red-400">Scorched</div>');
    if (isBuildSite) parts.push('<div class="text-blue-400">Build Site</div>');
    if (SHOW_DAILY_REPORT && changedDaily.has(t.id)) {
      parts.push('<div class="text-purple-400">Changed 24h</div>');
    }
    if (SHOW_WEEKLY_REPORT && changedWeekly.has(t.id)) {
      parts.push('<div class="text-amber-400">Changed 7d</div>');
    }
    return `<div class="text-xs">${parts.join('')}</div>`;
  }, [changedDaily, changedWeekly, majorLabelsByMap]);

  // Hover handlers
  const handleMouseOver = React.useCallback((t: LocationTile, lat: number, lng: number) => {
    show(getTooltipContent(t, lat, lng), lat, lng, 100);
  }, [show, getTooltipContent]);

  const handleMouseOut = React.useCallback(() => {
    hide(200);
  }, [hide]);

  // Re-apply styles when report mode or diff sets change
  React.useEffect(() => {
    updateIconsForZoom(map.getZoom());
  }, [reportMode, changedDaily, changedWeekly]);

  const activeJobViewIdTop = useMapStore(s => s.activeJobViewId); // local subscription for render condition
  // Hide LocationsLayer when zoomed out to -1 or lower, in report mode, or when layer is off
  if ((!activeLayers.locations || zoom < -1 || reportMode)) return null;

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
                const img = markerIconElement(ref as unknown as L.Marker);
                if (img) {
                  const highlighted = reportMode === 'daily'
                    ? !!(changedDaily && (changedDaily as Set<string>).has(t.id))
                    : reportMode === 'weekly'
                    ? !!(changedWeekly && (changedWeekly as Set<string>).has(t.id))
                    : false;
                  img.style.opacity = reportMode ? (highlighted ? '1' : '0.35') : '1';
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
