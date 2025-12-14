import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, LayerGroup, Marker, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import { CRS } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLatestSnapshot, useTerritoryDiff, useSnapshotsSince } from '../lib/queries';
import { useWarApiDirect } from '../lib/hooks/useWarApiDirect';
import { useMapStore } from '../state/useMapStore';
import { projectRegionPoint, WORLD_EXTENT } from '../lib/projection';
import HexTileLayer from './HexTileLayer';
import HexNameLabels from './HexNameLabels';
import { StaticIconLayer, StaticLabelLayer } from './StaticMapLayer';
import TerritorySubregionLayer from './TerritorySubregionLayer';
import { getHexByApiName } from '../lib/hexLayout';
import { getIconUrl, getIconSize, getMapIcon, getIconLabel, getMapIconsByTag, getIconWikiUrl, getIconSprite, iconTypeToFilename } from '../lib/icons';
import { MapIconTag } from '../data/map-icons';
import { ICON_SPRITE_PATH, SPRITE_WIDTH, SPRITE_HEIGHT, SPRITE_ICON_SIZE, ICON_SPRITE_METADATA } from '../data/icon-sprite';
import L from 'leaflet';
import type { LocationTile, Snapshot } from '../types/war';
import { MAP_MIN_ZOOM, MAP_MAX_ZOOM, DATA_SOURCE, SHOW_DAILY_REPORT, SHOW_WEEKLY_REPORT, ZOOM_ICON_UPDATE_MODE, ZOOM_THROTTLE_MS, DEBUG_PERF_OVERLAY, TERRITORY_NORMAL_OPACITY, TERRITORY_REPORT_AFFECTED_OPACITY, TERRITORY_REPORT_UNAFFECTED_OPACITY, TERRITORY_REPORT_HIGHLIGHTED_OPACITY } from '../lib/mapConfig';
import { SharedTooltipProvider, useSharedTooltip } from '../lib/sharedTooltip';
import { layerTagsByKey } from './LayerTogglePanel';
import { getJobViewFilter } from '../state/jobViews';
import { useStaticMaps } from '../lib/hooks/useStaticMaps';
import { getTownById } from '../data/towns';
import { DEBUG_MODE } from '../lib/appConfig';
import { getTeamIcon } from '../data/teams';
import { ZoomControls } from './ZoomControls';

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

  const { data: recentSnapshots } = useSnapshotsSince(24, { enabled: DATA_SOURCE === 'supabase' && reportMode === 'daily' });

  const historyByTerritoryId = useMemo(() => {
    if (!recentSnapshots || recentSnapshots.length === 0) return new Map<string, TerritoryHistory>();
    return buildTerritoryHistory(recentSnapshots as any);
  }, [recentSnapshots]);

  const effectiveLayers = useMemo(() => {
    if (!reportMode) return activeLayers;
    // In report mode: hide locations (icons), only show territories (SVG)
    return { ...activeLayers, locations: false, territories: true };
  }, [activeLayers, reportMode]);

  useEffect(() => {
    DEBUG_MODE ?? console.log('[MapView] Data source (config):', DATA_SOURCE);
    DEBUG_MODE ?? console.log('[MapView] Snapshot data:', snapshot);
    DEBUG_MODE ?? console.log('[MapView] Location count:', snapshot?.territories?.length ?? 0);
    DEBUG_MODE ?? console.log('[MapView] Location layer active:', activeLayers.locations);
    if (snapshot?.territories && snapshot.territories.length > 0) {
      DEBUG_MODE ?? console.log('[MapView] Sample locations:', snapshot.territories[0]);
    }
  }, [snapshot, activeLayers.locations]);


  return (
    <MapContainer
      center={[0, 0] as [number, number]} 
      zoom={MAP_MIN_ZOOM}
      minZoom={MAP_MIN_ZOOM}
      maxZoom={MAP_MAX_ZOOM}
      crs={CRS.Simple}
      zoomControl={false}
      className="h-full w-full bg-gray-900"
    >
      <ZoomControls />
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
          historyById={historyByTerritoryId}
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

type TerritoryHistoryEntry = { owner: LocationTile['owner']; at: string };
type TerritoryHistory = {
  name: string;
  currentOwner: LocationTile['owner'];
  events: TerritoryHistoryEntry[];
};

function buildTerritoryHistory(snapshots: Snapshot[]): Map<string, TerritoryHistory> {
  const sorted = [...snapshots].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  if (sorted.length === 0) return new Map();

  const latest = sorted[0];
  const history = new Map<string, TerritoryHistory>();

  for (const t of latest.territories ?? []) {
    const town = getTownById(t.id);
    history.set(t.id, {
      name: town?.displayName ?? t.id,
      currentOwner: t.owner,
      events: [],
    });
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    const nextMap = new Map<string, LocationTile>();
    for (const t of next.territories ?? []) nextMap.set(t.id, t);

    for (const t of curr.territories ?? []) {
      const prev = nextMap.get(t.id);
      if (!prev) continue;
      if (prev.owner !== t.owner) {
        const entry = history.get(t.id) ?? {
          name: getTownById(t.id)?.displayName ?? t.id,
          currentOwner: t.owner,
          events: [],
        };
        entry.events.push({ owner: t.owner, at: curr.created_at });
        history.set(t.id, entry);
      }
    }
  }

  return history;
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
    const handler = () => { setZoom(map.getZoom()); console.log('Zoom changed to', map.getZoom()) };
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  // Caches for performance
  const iconUrlCache = React.useRef<Map<string, string>>(new Map());
  const iconSizeCache = React.useRef<Map<number, [number, number]>>(new Map());
  const iconInstanceCache = React.useRef<Map<string, L.Icon | L.DivIcon>>(new Map());
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

  function getIcon(iconType: number, z: number, owner?: LocationTile['owner']): L.Icon | L.DivIcon {
    const bucket = zoomBucket(z);
    const key = `${iconType}|${bucket}|${owner ?? 'none'}`;
    const cached = iconInstanceCache.current.get(key);
    if (cached) return cached;
    const [bw, bh] = getBaseSize(iconType);
    const s = scaleForZoom(z);
    const w = Math.max(8, Math.round(bw * s));
    const h = Math.max(8, Math.round(bh * s));
    
    // Try to use sprite first, fallback to individual icon
    const sprite = getIconSprite(iconType, owner);
    if (sprite) {
      // Get icon name and pre-calculate scaled values once (avoid function call overhead)
      const iconName = iconTypeToFilename(iconType, owner).replace('.png', '');
      const coords = ICON_SPRITE_METADATA[iconName];
      
      // Pre-calculate scaled position inline
      const scaledX = coords ? coords.x * s : 0;
      const scaledY = coords ? coords.y * s : 0;
      const scaledBgSize = SPRITE_WIDTH * s;
      const scaledBgHeight = SPRITE_HEIGHT * s;
      
      const icon = L.divIcon({
        html: `<div style="width:${w}px;height:${h}px;background-image:url(${sprite.spritePath});background-position:-${scaledX}px -${scaledY}px;background-size:${scaledBgSize}px ${scaledBgHeight}px;background-repeat:no-repeat"></div>`,
        iconSize: [w, h],
        iconAnchor: [w / 2, h / 2],
        className: 'drop-shadow-sm icon-sprite-marker',
      });
      iconInstanceCache.current.set(key, icon);
      return icon;
    } else {
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
    // For divIcon (sprite), look for the inner div with background-image
    const inside = el.querySelector('div[style*="background-image"], img.leaflet-marker-icon, .leaflet-marker-icon') as HTMLElement | null;
    return inside ?? el;
  }

  function applySmoothScale(marker: L.Marker, iconType: number, z: number, highlighted: boolean) {
    const img = markerIconElement(marker);
    if (!img) return;
    img.style.transition = `opacity 120ms ease-out`;
    img.style.opacity = reportMode ? (highlighted ? '1' : `${TERRITORY_REPORT_UNAFFECTED_OPACITY}`) : '1';
  }

  function updateIconsForZoom(z: number) {
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
        img.style.opacity = reportMode ? (highlighted ? '1' : `${TERRITORY_REPORT_UNAFFECTED_OPACITY}`) : '1';
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
      DEBUG_MODE ?? console.log('[Perf] After prune: visible=', visibleTerritories.length, 'refs=', markerRefs.current.size);
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
      ? `<a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" class="font-medium underline decoration-dotted">${getIconLabel(t.iconType)}</a>`
      : `<span class="font-semibold">${getIconLabel(t.iconType)}</span>`;
    parts.push(labelHtml);
    const nearbyMajor = nearestMajorLabel(t.region, lat, lng);
    if (nearbyMajor) parts.push(`<div class="font-semibold">${nearbyMajor}</div>`);
    const hexName = getHexByApiName(t.region)?.displayName;
    if (hexName) parts.push(`<div class="text-gray-800">${hexName}</div>`);
    if (t.owner !== 'Neutral') parts.push(`<div class="flex"><img src="${getTeamIcon(t.owner)}" alt="${t.owner}" class="inline-block w-4 h-4 mr-1"/>${t.owner}</div>`);
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

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Hover handlers
  const handleMouseOver = React.useCallback((t: LocationTile, lat: number, lng: number) => {
    setHoveredId(t.id);
    show(getTooltipContent(t, lat, lng), lat, lng, 100);
    
    // Apply brightness filter to hovered icon
    const marker = markerRefs.current.get(t.id);
    if (marker) {
      const img = markerIconElement(marker);
      if (img) {
        img.style.filter = 'brightness(1.3)';
        img.style.transition = 'filter 120ms ease';
      }
    }
  }, [show, getTooltipContent]);

  const handleMouseOut = React.useCallback(() => {
    hide(200);
    
    // Remove brightness filter from previously hovered icon
    if (hoveredId) {
      const marker = markerRefs.current.get(hoveredId);
      if (marker) {
        const img = markerIconElement(marker);
        if (img) {
          img.style.filter = 'none';
        }
      }
    }
    
    setHoveredId(null);
  }, [hide, hoveredId]);

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
              if (ref) {
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
