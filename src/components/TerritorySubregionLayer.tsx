import React, { useEffect, useMemo, useState } from 'react';
import tinycolor from "tinycolor2";
import { SVGOverlay, useMap } from 'react-leaflet';
import type { LocationTile } from '../types/war';
import { getHexByApiName, hexToLeafletBounds } from '../lib/hexLayout';
import { TERRITORY_NORMAL_OPACITY, TERRITORY_REPORT_AFFECTED_OPACITY, TERRITORY_REPORT_UNAFFECTED_OPACITY, TERRITORY_REPORT_HIGHLIGHTED_OPACITY } from '../lib/mapConfig';
import { useMapStore } from '../state/useMapStore';
import { getTownByApiName, getTownById } from '../data/towns';
import { useSharedTooltip } from '../lib/sharedTooltip';
import { projectRegionPoint } from '../lib/projection';
import { DEBUG_MODE } from '../lib/appConfig';
import { Colors, getTeamColors, getTeamIcon } from '../data/teams';

// Dynamically load all SVGs from src/map/subregions directory
const loadSubregionSvgs = async (): Promise<Record<string, string>> => {
  const svgs: Record<string, string> = {};
  
  // Use import.meta.glob to get all .svg files in the subregions directory
  const modules = import.meta.glob<string>('../map/subregions/*.svg', { as: 'url' });
  
  for (const [path, urlLoader] of Object.entries(modules)) {
    // Extract filename and convert to key (e.g., Kalokai.svg -> KalokaiHex)
    const filename = path.split('/').pop()?.replace(/\.svg$/, '') || '';
    const key = filename == "MarbanHollow" ? `${filename}` : `${filename}Hex`;
    
    const url = await urlLoader();
    svgs[key] = url;
  }
  
  return svgs;
};

let SUBREGION_SVGS_CACHE: Record<string, string> | null = null;

type TerritoryHistoryEntry = { owner: LocationTile['owner']; at: string };
type TerritoryHistory = {
  name: string;
  currentOwner: LocationTile['owner'];
  events: TerritoryHistoryEntry[];
};

interface Props {
  snapshot: { territories?: LocationTile[] } | undefined | null;
  changedDaily: Set<string>;
  changedWeekly: Set<string>;
  visible: boolean;
  historyById: Map<string, TerritoryHistory>;
}

interface PathInfo {
  key: string;
  d: string;
  territoryId: string | null;
  owner: LocationTile['owner'] | null;
  highlighted: boolean;
  baseColor: string;
  baseOpacity: number;
  stroke: string;
  strokeWidth: number;
  lat?: number;
  lng?: number;
}

interface RegionOverlay {
  region: string;
  bounds: any;
  viewBox: string;
  paths: PathInfo[];
}

export default function TerritorySubregionLayer({ snapshot, changedDaily, changedWeekly, visible, historyById }: Props) {
  const map = useMap();
  const reportModeActive = useMapStore((s) => s.activeReportMode !== null);
  const reportMode = useMapStore((s) => s.activeReportMode);
  const { show, hide } = useSharedTooltip();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [stickyId, setStickyId] = useState<string | null>(null);


  // Ensure pane exists with deterministic stacking under markers/labels
  useEffect(() => {
    const paneId = 'territories-pane';
    if (!map.getPane(paneId)) {
      const pane = map.createPane(paneId);
      if (pane) pane.style.zIndex = '400';
    }
  }, [map]);

  useEffect(() => {
    if (!reportMode) {
      setHoveredId(null);
      setStickyId(null);
      hide(0);
    }
  }, [reportMode, hide]);

  // Load raw SVG text once per region
  const [svgByRegion, setSvgByRegion] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load SVG URLs from dynamic loader
      if (!SUBREGION_SVGS_CACHE) {
        SUBREGION_SVGS_CACHE = await loadSubregionSvgs();
      }
      const SUBREGION_SVGS = SUBREGION_SVGS_CACHE;
      
      DEBUG_MODE ?? console.log('[TerritorySubregion] Loading SVGs:', Object.keys(SUBREGION_SVGS));
      const entries = await Promise.all(
        Object.entries(SUBREGION_SVGS).map(async ([region, url]) => {
          try {
            const res = await fetch(url as string);
            if (!res.ok) {
              console.warn(`[TerritorySubregion] Failed to fetch ${region}: ${res.status}`);
              return [region, ''] as const;
            }
            const text = await res.text();
            DEBUG_MODE ?? console.log(`[TerritorySubregion] Loaded ${region}, size: ${text.length} bytes`);
            return [region, text] as const;
          } catch (e) {
            console.error(`[TerritorySubregion] Error loading ${region}:`, e);
            return [region, ''] as const;
          }
        })
      );
      if (!cancelled) {
        const next: Record<string, string> = {};
        entries.forEach(([region, text]) => {
          next[region] = text;
        });
        setSvgByRegion(next);
        DEBUG_MODE ?? console.log('[TerritorySubregion] SVGs loaded:', Object.keys(next));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build territory maps
  const territoryById = useMemo(() => {
    const map = new Map<string, LocationTile>();
    (snapshot?.territories ?? []).forEach((t) => map.set(t.id, t));
    return map;
  }, [snapshot]);

  const changedSet = useMemo(() => {
    if (reportMode === 'daily') return changedDaily;
    if (reportMode === 'weekly') return changedWeekly;
    return null;
  }, [reportMode, changedDaily, changedWeekly]);

  const overlays = useMemo(() => {
    const parser = new DOMParser();
    const processed: RegionOverlay[] = [];

    Object.entries(svgByRegion).forEach(([region, svgText]) => {
      if (!svgText) return;

      const hex = getHexByApiName(region);
      if (!hex) return;
      const bounds = hexToLeafletBounds(hex);

      const doc = parser.parseFromString(String(svgText), 'image/svg+xml');
      const root = doc.documentElement.cloneNode(true) as SVGSVGElement;
      const viewBox = root.getAttribute('viewBox') || `0 0 ${root.getAttribute('width') || 1000} ${root.getAttribute('height') || 1000}`;
      const territoriesGroup = root.querySelector('#Territories');
      if (!territoriesGroup) return;

      const pathsEls = Array.from(territoriesGroup.querySelectorAll<SVGPathElement>('path[id]'));
      const paths: PathInfo[] = [];

      for (const p of pathsEls) {
        const pathId = p.getAttribute('id');
        const d = p.getAttribute('d');
        if (!pathId || !d) continue;

        const matchedTown = getTownByApiName(pathId);
        const territory = matchedTown?.id ? territoryById.get(matchedTown.id) : undefined;
        if (!territory) continue;
        const highlighted = !!(changedSet && changedSet.has(territory.id));
        const baseColor = getTeamColors(territory.owner)?.saturated ?? Colors.Neutral;
        const baseOpacity = TERRITORY_NORMAL_OPACITY;
        const projected = projectRegionPoint(territory.region, territory.x, territory.y);

        paths.push({
          key: `${region}-${pathId}`,
          d,
          territoryId: territory.id,
          owner: territory.owner,
          highlighted,
          baseColor,
          baseOpacity,
          stroke: '#0f172a',
          strokeWidth: 0.5,
          lat: projected ? projected[0] : undefined,
          lng: projected ? projected[1] : undefined,
        });
      }

      processed.push({ region, bounds, viewBox, paths });
    });

    return processed;
  }, [svgByRegion, territoryById, changedSet, reportMode]);

  const handleHover = (p: PathInfo) => {
    if (reportMode !== 'daily' || !p.highlighted) return;
    setHoveredId(p.territoryId);
    showTooltipFor(p);
  };

  const handleLeave = (p: PathInfo) => {
    if (reportMode === 'daily') return; // keep tooltip open in report mode
    if (stickyId && stickyId === p.territoryId) return;
    setHoveredId((prev) => (prev === p.territoryId ? null : prev));
    hide(120);
  };

  const handleClick = (p: PathInfo) => {
    if (reportMode !== 'daily' || !p.highlighted) return;
    if (stickyId === p.territoryId) {
      setStickyId(null);
      hide(0);
    } else {
      setStickyId(p.territoryId);
      showTooltipFor(p);
    }
  };

  const showTooltipFor = (p: PathInfo) => {
    if (!p.lat || !p.lng || !p.territoryId) return;
    const hist = historyById.get(p.territoryId);
    const name = hist?.name ?? getTownById(p.territoryId)?.displayName ?? p.territoryId;
    const owner = hist?.currentOwner ?? p.owner ?? 'Neutral';
    const lines: string[] = [];
    lines.push(`<div class="font-semibold">${name}</div>`);
    if (owner !== 'Neutral') lines.push(`<div class="flex"><img src="${getTeamIcon(owner)}" alt="${owner}" class="inline-block w-4 h-4 mr-1"/>${owner}</div>`);
    if (reportMode === 'daily') {
      lines.push('<div class="mt-1 font-semibold">History:</div>');
      const events = hist?.events ?? [];
      if (events.length === 0) {
        lines.push(`<div class="flex">
              <img src="${getTeamIcon(owner)}" alt="${owner}" class="inline-block w-4 h-4 mr-1"/>
              <span class="mr-2">${owner}</span>
              <span>(24 hrs ago)</span>
          </div>`);
      } else {
        events.forEach((ev) => {
          (ev.owner !== 'Neutral') ? lines.push(
            `<div class="flex">
              <img src="${getTeamIcon(ev.owner)}" alt="${ev.owner}" class="inline-block w-4 h-4 mr-1"/>
              <span class="mr-2">${ev.owner}</span>
              <span>(${formatTimeAgo(ev.at)})</span>
            </div>`) : '';
        });
      }
    }
    show(`<div class="text-xs flex flex-col">${lines.join('')}</div>`, p.lat, p.lng, 0, true);
  };


  if (!visible || !snapshot?.territories?.length) {
    return null;
  }

  return (
    <>
      {overlays.map((o) => (
        <SVGOverlay key={o.region} bounds={o.bounds} pane="territories-pane" className="territory-subregions">
          <svg viewBox={o.viewBox} preserveAspectRatio="xMidYMid meet">
            <g id="Territories">
              {o.paths.map((p) => {                
                const affected = p.highlighted; 
                const active = (hoveredId === p.territoryId || stickyId === p.territoryId);

                let fill = p.baseColor;
                let fillOpacity = p.baseOpacity;

                if (reportModeActive) {
                  if (affected) {
                    if (active) {
                      fill = tinycolor(p.baseColor).brighten(20).toString();
                      fillOpacity = TERRITORY_REPORT_HIGHLIGHTED_OPACITY;
                    } else {
                      fillOpacity = TERRITORY_REPORT_AFFECTED_OPACITY;
                    }
                  } else {
                    fillOpacity = TERRITORY_REPORT_UNAFFECTED_OPACITY;
                  }
                } else {
                  fillOpacity = TERRITORY_NORMAL_OPACITY;
                }
                
                const interactive = reportMode === 'daily' && p.highlighted;
                return (
                  <path
                    key={p.key}
                    d={p.d}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={p.stroke}
                    strokeWidth={p.strokeWidth}
                    style={{ pointerEvents: interactive ? 'auto' : 'none', cursor: interactive ? 'pointer' : 'default', transition: 'fill 120ms ease, fill-opacity 120ms ease', outline: 'none' }}
                    onMouseEnter={() => handleHover(p)}
                    onMouseLeave={() => handleLeave(p)}
                    onClick={() => handleClick(p)}
                    onTouchStart={() => handleClick(p)}
                  />
                );
              })}
            </g>
          </svg>
        </SVGOverlay>
      ))}
    </>
  );
}



function formatTimeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins >= 60) {
    const hours = Math.round(mins / 60);
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  }
  return `${mins} min${mins === 1 ? '' : 's'} ago`;
}
