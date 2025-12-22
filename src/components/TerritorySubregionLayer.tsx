import React, { useEffect, useMemo, useState } from 'react';
import tinycolor from "tinycolor2";
import { SVGOverlay, useMap } from 'react-leaflet';
import type { LocationTile } from '../types/war';
import { getHexByApiName, hexToLeafletBounds } from '../lib/hexLayout';
import { TERRITORY_NORMAL_OPACITY, TERRITORY_REPORT_AFFECTED_OPACITY, TERRITORY_REPORT_UNAFFECTED_OPACITY, TERRITORY_REPORT_HIGHLIGHTED_OPACITY, MAJOR_LABEL_MIN_ZOOM, MINOR_LABEL_MIN_ZOOM, MAP_MIN_ZOOM, TERRITORY_OVERVIEW_OPACITY } from '../lib/mapConfig';
import { useMapStore } from '../state/useMapStore';
import { getTownByApiName, getTownById } from '../data/towns';
import { useSharedTooltip } from '../lib/sharedTooltip';
import { projectRegionPoint } from '../lib/projection';
import { DEBUG_MODE } from '../lib/appConfig';
import { Colors, getTeamColors, getTeamIcon } from '../data/teams';
import disabledHexOverlay from '../images/disabledHexOverlay.svg';
import { TERRITORY_PATHS } from '../data/territory-paths';

// Remove dynamic SVG loading - now using pre-bundled paths

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
  name: string | null;
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
  hasAnyTerritory?: boolean;
}

export default function TerritorySubregionLayer({ snapshot, changedDaily, changedWeekly, visible, historyById }: Props) {
  const map = useMap();
  const [zoom, setZoom] = React.useState(map.getZoom());

  React.useEffect(() => {
    const handler = () => { setZoom(map.getZoom()); };
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);
  const reportModeActive = useMapStore((s) => s.activeReportMode !== null);
  const reportMode = useMapStore((s) => s.activeReportMode);
  const setDisabledHexes = useMapStore((s) => s.setDisabledHexes);
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
    const processed: RegionOverlay[] = [];

    // Use pre-bundled territory paths instead of runtime parsing
    Object.entries(TERRITORY_PATHS).forEach(([region, regionData]) => {
      const hex = getHexByApiName(region);
      if (!hex) return;
      const bounds = hexToLeafletBounds(hex);

      const paths: PathInfo[] = [];
      let hasAnyTerritory = false;

      for (const pathData of regionData.paths) {
        const matchedTown = getTownByApiName(pathData.id);
        const territory = matchedTown?.id ? territoryById.get(matchedTown.id) : undefined;
        if (!territory) {
          DEBUG_MODE ?? console.log(`[TerritorySubregion] No territory data for path ${pathData.id} in region ${region}`);
          continue;
        }
        hasAnyTerritory = true;
        const highlighted = !!(changedSet && changedSet.has(territory.id));
        const baseColor = getTeamColors(territory.owner)?.saturated ?? Colors.Neutral;
        const baseOpacity = TERRITORY_NORMAL_OPACITY;
        const projected = projectRegionPoint(territory.region, territory.x, territory.y);

        paths.push({
          key: `${region}-${pathData.id}`,
          d: pathData.d,
          territoryId: territory.id,
          owner: territory.owner,
          name: matchedTown?.displayName || null,
          highlighted,
          baseColor,
          baseOpacity,
          stroke: 'hsla(0,0%,0%,0.4)',
          strokeWidth: 0.5,
          lat: projected ? projected[0] : undefined,
          lng: projected ? projected[1] : undefined,
        });
      }

      processed.push({ region, bounds, viewBox: regionData.viewBox, paths, hasAnyTerritory });
    });

    return processed;
  }, [territoryById, changedSet, reportMode]);

  // Update disabled hexes in store
  useEffect(() => {
    const disabled = new Set<string>();
    overlays.forEach((o) => {
      if (!o.hasAnyTerritory) {
        if (disabled.has(o.region)) return;
        disabled.add(o.region);
      }
    });
    setDisabledHexes(disabled);
  }, [overlays, setDisabledHexes]);

  const handleHover = (p: PathInfo) => {
    setHoveredId(p.territoryId);
    //if (!reportModeActive || !p.highlighted) return;
    showTooltipFor(p);
  };

  const handleLeave = (p: PathInfo) => {
    if (reportModeActive) return; // keep tooltip open in report mode
    if (stickyId && stickyId === p.territoryId) return;
    setHoveredId((prev) => (prev === p.territoryId ? null : prev));
    hide(120);
  };

  const handleClick = (p: PathInfo) => {
    if (!reportModeActive || !p.highlighted) return;
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
    if (!reportModeActive && zoom > MAJOR_LABEL_MIN_ZOOM) return;
    const name = p.name ?? p.territoryId;
    const hist = historyById.get(p.territoryId);
    const owner = hist?.currentOwner ?? p.owner ?? 'Neutral';
    const lines: string[] = [];
    lines.push(`<div class="font-semibold">${name}</div>`);
    lines.push(`<div class="flex"><img src="${getTeamIcon(owner)}" alt="${owner}" class="inline-block w-4 h-4 mr-1"/>${owner}${reportModeActive ? ' gain' : ''}</div>`);
    if(reportModeActive) {
      if (reportMode == 'daily') {
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
    } 
    show(`<div class="text-xs flex flex-col">${lines.join('')}</div>`, p.lat, p.lng, 0, true, false);
  };

  if (!visible || !snapshot?.territories?.length) {
    return null;
  }

  return (
    <>
      {overlays.map((o) => (
        <SVGOverlay key={o.region} bounds={o.bounds} pane="territories-pane" className="territory-subregions">
          <svg viewBox={o.viewBox} preserveAspectRatio="xMidYMid meet">
            <path id="HexBorder" d="M384.425 1L512.845 222.001L385.423 443H128.577L1.15332 222L128.577 1H384.425Z" fill="none" stroke="hsla(0,0%,0%,0.8)" strokeWidth="2" />


            <g id="Territories" className="transition-opacity duration-150">
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
                  if (active) {
                    fill = tinycolor(p.baseColor).brighten(20).toString();
                  }
                  if (zoom == MAP_MIN_ZOOM) {
                    fillOpacity = TERRITORY_OVERVIEW_OPACITY;
                  } else {
                    fillOpacity = TERRITORY_NORMAL_OPACITY;
                  }
                }
                
                const interactive = reportModeActive ? p.highlighted ? true : false : true; 
                
                return (
                  <path
                    key={p.key}
                    d={p.d}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={p.stroke}
                    strokeWidth={p.strokeWidth}
                    style={{ pointerEvents: interactive ? 'auto' : 'none', cursor: interactive ? 'pointer' : 'default', transition: 'fill 120ms ease, fill-opacity 120ms ease, transform 250ms ease', outline: 'none' }}
                    onMouseEnter={() => handleHover(p)}
                    onMouseLeave={() => handleLeave(p)}
                    onClick={() => handleClick(p)}
                    onTouchStart={() => handleClick(p)}
                  />
                );
              })}
            </g>
            {!o.hasAnyTerritory && (
              <image 
                href={disabledHexOverlay} 
                width="100%" 
                height="100%" 
                preserveAspectRatio="xMidYMid meet"
                style={{ pointerEvents: 'none' }}
              />
            )}
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
