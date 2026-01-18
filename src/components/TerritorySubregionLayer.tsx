import React, { useEffect, useMemo, useState } from 'react';
import tinycolor from "tinycolor2";
import { SVGOverlay, useMap } from 'react-leaflet';
import type { LocationTile } from '../types/war';
import { getHexByApiName, hexToLeafletBounds } from '../lib/hexLayout';
import { TERRITORY_NORMAL_OPACITY, TERRITORY_REPORT_AFFECTED_OPACITY, TERRITORY_REPORT_UNAFFECTED_OPACITY, TERRITORY_REPORT_HIGHLIGHTED_OPACITY, MAJOR_LABEL_MIN_ZOOM, MINOR_LABEL_MIN_ZOOM, MAP_MIN_ZOOM, TERRITORY_OVERVIEW_OPACITY, CLICK_DISTANCE_THRESHOLD } from '../lib/mapConfig';
import { useMapStore, TerritoryHistory, SelectedLocation } from '../state/useMapStore';
import { getTownByApiName, getTownById } from '../data/towns';
import { useSharedTooltip } from '../lib/sharedTooltip';
import { projectRegionPoint } from '../lib/projection';
import { DEBUG_MODE } from '../lib/appConfig';
import { Colors, getTeamColors, getTeamIcon, Teams } from '../data/teams';
import disabledHexOverlay from '../images/disabledHexOverlay.svg';
import { TERRITORY_PATHS } from '../data/territory-paths';
import type { useCasualtyRates } from '../lib/hooks/useCasualtyRates';
import { getTimeSinceLastCapture } from '../lib/time';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// Remove dynamic SVG loading - now using pre-bundled paths



interface Props {
  snapshot: { territories?: LocationTile[] } | undefined | null;
  visible: boolean;
  historyById: Map<string, TerritoryHistory>;
  casualtyRates: ReturnType<typeof useCasualtyRates>;
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

export default function TerritorySubregionLayer({ snapshot, visible, historyById, casualtyRates }: Props) {
  const map = useMap();
  const [zoom, setZoom] = React.useState(map.getZoom());
  const [isTouch, setIsTouch] = React.useState(false);

  React.useEffect(() => {
    const handler = () => { setZoom(map.getZoom()); };
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  React.useEffect(() => {
    const touch = (typeof window !== 'undefined') && (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore legacy
      (navigator as any).msMaxTouchPoints > 0
    );
    setIsTouch(touch);
  }, []);
  
  // New unified report system
  const activeReport = useMapStore((s) => s.activeReport);
  const reportHighlightedSet = useMapStore((s) => s.reportHighlightedSet);
  const reportModeActive = activeReport !== null;
  
  // Keep old reportMode for backward compatibility during transition
  const reportMode = useMapStore((s) => s.activeReportMode);
  
  const setDisabledHexes = useMapStore((s) => s.setDisabledHexes);
  const setPanelState = useMapStore((s) => s.setPanelState);
  const setSelectedLocation = useMapStore((s) => s.setSelectedLocation);
  const selectedLocation = useMapStore((s) => s.selectedLocation);
  const { show, hide, buildTooltipContent } = useSharedTooltip();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mouseDownPosition, setMouseDownPosition] = useState<{ x: number; y: number } | null>(null);
  const activeLayers = useMapStore((s) => s.activeLayers);


  // Ensure pane exists with deterministic stacking under markers/labels
  useEffect(() => {
    const paneId = 'territories-pane';
    if (!map.getPane(paneId)) {
      const pane = map.createPane(paneId);
      if (pane) pane.style.zIndex = '400';
    }
  }, [map]);

  useEffect(() => {
    return;
    console.log(`[TerritorySubregion] reportMode changed: now ${reportMode ?? 'null'}`);
    if (!reportMode) {
      setHoveredId(null);
      console.log('[TerritorySubregion] Exiting report mode - hiding tooltip');
      hide('hover', 0);
    }
  }, [reportMode, hide]);

  // Build territory maps
  const territoryById = useMemo(() => {
    const map = new Map<string, LocationTile>();
    (snapshot?.territories ?? []).forEach((t) => map.set(t.id, t));
    return map;
  }, [snapshot]);

  // Use reportHighlightedSet for territory highlighting (unified report system)
  const changedSet = reportHighlightedSet;

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





  const getSelectedLocationFromPathInfo = (p: PathInfo): SelectedLocation => {
    const territory = p.territoryId ? territoryById.get(p.territoryId) : null;
    if (!territory || p.lat == null || p.lng == null || p.territoryId == null) return null as any;
    const hist = historyById.get(p.territoryId);
    const owner = hist?.currentOwner ?? p.owner ?? territory.owner ?? 'Neutral';

    return {
        tile: territory,
        lat: p.lat,
        lng: p.lng,
        id: p.territoryId,
        name: p.name,
        owner: owner,
        history: hist ?? null,
        hexName: getHexByApiName(territory.region)?.displayName ?? null,
        source: 'territory' as const,
    };
  };

  const handleHover = (p: PathInfo) => {
    setHoveredId(p.territoryId);
    
    // Suppress hover tooltip if this territory is already selected
    if (selectedLocation && selectedLocation.id === p.territoryId && selectedLocation.source === 'territory') {
      return;
    }
    
    // In report mode, only show hover on highlighted territories
    if (reportModeActive && !p.highlighted) {
      return;
    }
    
    if (!isTouch) {
      const locationData = getSelectedLocationFromPathInfo(p);
      if (!locationData || !locationData.lat || !locationData.lng) return;
      //if (!reportModeActive /*&& (activeLayers.majorLocations && zoom > MAJOR_LABEL_MIN_ZOOM)*/) return;
      
      const html = buildTooltipContent({
        platform: 'desktop',
        action: 'hover',
        source: 'territory',
        location: locationData,
        reportMode: reportMode,
      });
      show('hover', { html, lat: locationData.lat, lng: locationData.lng, openDelay: 0 });
    }
  };

  const handleLeave = (p: PathInfo) => {
    setHoveredId((prev) => (prev === p.territoryId ? null : prev));
    hide('hover', 120);
  };

  const handleClick = (e: React.MouseEvent, p: PathInfo) => {
    // Check if this is a real click vs a drag/pan operation
    if (!isTouch && mouseDownPosition) {
      const dx = e.pageX - mouseDownPosition.x;
      const dy = e.pageY - mouseDownPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > CLICK_DISTANCE_THRESHOLD) {
        // User was panning, not clicking - ignore
        setMouseDownPosition(null);
        return;
      }
    }
    setMouseDownPosition(null);

    // Desktop: only clickable in report mode on highlighted territories
    if (!isTouch && (reportModeActive && !p.highlighted)) return;

    const locationData = getSelectedLocationFromPathInfo(p);
    if (!locationData || !locationData.lat || !locationData.lng) return;

    // Touch: set selection, show selected tooltip, open panel, and pan
    setSelectedLocation(locationData);
    setPanelState('info', 'half');
    
    const html = buildTooltipContent({
      platform: isTouch ? 'mobile' : 'desktop',
      action: 'selected',
      source: 'territory',
      location: locationData,
      reportMode: reportMode,
    });
    show('selected', { html, lat: locationData.lat, lng: locationData.lng, openDelay: 0, sticky: true });

    if (isTouch) {      
      if (reportModeActive && locationData.lat && locationData.lng) {
        map.panTo([locationData.lat, locationData.lng], { animate: true, duration: 0.5 });
      }
      return;
    }
  };

  if (!visible || !snapshot?.territories?.length) {
    return null;
  }

  return (
    <>
      {overlays.map((o) => {
        // Compute casualty rates once per overlay
        const rate = casualtyRates.getRate(o.region);
        const combined = rate ? rate.warden + rate.colonial : 0;
        type combinedCasualtyRate = 'low' | 'medium' | 'high' | 'none';
        const hexCasualtyRate: combinedCasualtyRate = (combined > 200 && combined <= 500) ? 'low' : (combined > 500 && combined <= 1000) ? 'medium' : (combined > 1000) ? 'high' : 'none';

        return (
        <SVGOverlay key={o.region} bounds={o.bounds} pane="territories-pane" className="territory-subregions">
          <svg viewBox={o.viewBox} preserveAspectRatio="xMidYMid meet">
            <path id="HexBorder" d="M384.425 1L512.845 222.001L385.423 443H128.577L1.15332 222L128.577 1H384.425Z" fill="none" stroke="hsla(0,0%,0%,0.8)" strokeWidth="2" />

            <g id="Territories" className="transition-opacity duration-150">
              {o.paths.map((p) => {   
                const affected = p.highlighted; 
                const active = (hoveredId === p.territoryId) || (selectedLocation?.id === p.territoryId && selectedLocation?.source === 'territory');
                const hist = historyById.get(p.territoryId || '');  
                const events = hist?.events ?? [];
                const teamColors = getTeamColors(p.owner || 'Neutral');
                
                const timeLastCaptured = getTimeSinceLastCapture(events) || -1;

                let fill = p.baseColor;
                let fillOpacity = p.baseOpacity;
                let stroke = p.stroke;
                let strokeWidth = p.strokeWidth;

                // Figure out opacities and colors based on report mode and state
                if (reportModeActive) {
                  if (affected) {
                    strokeWidth = 2;
                    fill = tinycolor(p.baseColor).saturate(10).brighten(10).toString();

                    if (active) {
                      fill = tinycolor(fill).brighten(15).toString();
                      fillOpacity = TERRITORY_REPORT_HIGHLIGHTED_OPACITY;
                    } else {
                      fill = tinycolor(fill).toString();
                      fillOpacity = TERRITORY_REPORT_AFFECTED_OPACITY;
                    }
                  } else {
                    fillOpacity = TERRITORY_REPORT_UNAFFECTED_OPACITY;
                  }
                } else {
                  if (zoom == MAP_MIN_ZOOM) {
                    fillOpacity = TERRITORY_OVERVIEW_OPACITY;
                  } else {
                    fillOpacity = TERRITORY_NORMAL_OPACITY;
                  }
                  
                  fill = tinycolor(p.baseColor).toString();
                  if (active) {
                    if(timeLastCaptured > 0 && timeLastCaptured <= 6) {
                      fill = tinycolor(fill).saturate(50).toString();
                    } 
                    fill = tinycolor(fill).brighten(30).toString();
                  } else {
                    if(timeLastCaptured > 0 && timeLastCaptured <= 6) {
                      fill = tinycolor(fill).saturate(50).darken(20).toString();
                      fillOpacity = fillOpacity + (zoom == MAP_MIN_ZOOM ? 0.15 : 0.05);
                    }
                    else if(timeLastCaptured > 0 && timeLastCaptured <= 24) {
                      fill = tinycolor(fill).saturate(10).darken(10).toString();
                      fillOpacity = fillOpacity + (zoom == MAP_MIN_ZOOM ? 0.15 : 0.05);
                    }
                  }

                  if (selectedLocation && selectedLocation.id === p.territoryId && selectedLocation.source === 'territory') {
                    strokeWidth = 2;
                    stroke = teamColors ? teamColors.saturated : stroke;
                    fillOpacity = TERRITORY_OVERVIEW_OPACITY;
                  }
                }
                
                const interactive = reportModeActive ? p.highlighted ? true : false : true; 
                
                return (
                  <path
                    key={p.key}
                    d={p.d}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    style={{ pointerEvents: interactive ? 'auto' : 'none', cursor: interactive ? 'pointer' : 'default', transition: 'fill 120ms ease, fill-opacity 120ms ease, transform 250ms ease', outline: 'none' }}
                    onMouseEnter={() => {
                      handleHover(p)
                      //if (isTouch && !reportModeActive) setPanelState('info', 'off');
                    }}
                    onMouseLeave={() => handleLeave(p)}
                    onMouseDown={(e) => {
                      if (!isTouch) setMouseDownPosition({ x: e.pageX, y: e.pageY });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick(e, p);
                    }}
                    className={ active ? zoom >= 1 ? '-translate-y-0.5' : '-translate-y-1' : '' }
                  />
                );
              })}
            </g>
            { activeLayers.casualties && (
              <g className="hexCasualtyVisual">
                <g id="casualtyRate" opacity={(() => {
                  if (reportModeActive) return 0;
                  switch (hexCasualtyRate) {
                    case 'low': return 0.5;
                    case 'medium': return 0.7;
                    case 'high': return 0.9;
                    default: return 0;
                  }
                })()} filter={(() => {
                  if (reportModeActive) return '';
                  switch (hexCasualtyRate) {
                    case 'low': return 'url(#casualtyRateLow)';
                    case 'medium': return 'url(#casualtyRateMed)';
                    case 'high': return 'url(#casualtyRateHigh)';
                    default: return '';
                  }
                })()}>
                  <path d="M128 5.37604e-06L385 0L514 222L386 444H128L0 222L128 5.37604e-06Z" fill="white" fillOpacity="0.01" />
                  <path d="M381.547 6L507.066 222.011L382.533 438H131.467L6.92578 222L131.467 6H381.547Z" fill="none" stroke={(() => {
                    switch (hexCasualtyRate) {
                      case 'low': return '#EAED10';
                      case 'medium': return '#E55A09';
                      case 'high': return '#FF0000';
                      default: return 'none';
                    }
                  })()} strokeOpacity="0.6" strokeWidth="12"/>
                </g>
                <defs>
                  <filter id="casualtyRateHigh" x="0" y="0" width="514" height="444" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset />
                    <feGaussianBlur stdDeviation="35" />
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                    <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
                    <feBlend mode="normal" in2="shape" result="effect1_innerShadow_716_627" />
                  </filter>

                  <filter id="casualtyRateMed" x="0" y="0" width="514" height="444" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset />
                    <feGaussianBlur stdDeviation="80" />
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0.841346 0 0 0 0 0.308494 0 0 0 0 0 0 0 0 1 0" />
                    <feBlend mode="normal" in2="shape" result="effect1_innerShadow_726_592" />
                  </filter>

                  <filter id="casualtyRateLow" x="0" y="0" width="514" height="444" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset />
                    <feGaussianBlur stdDeviation="45" />
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0.916591 0 0 0 0 0.93109 0 0 0 0 0.0611772 0 0 0 1 0" />
                    <feBlend mode="normal" in2="shape" result="effect1_innerShadow_726_593" />
                  </filter>
                </defs>
              </g>
            )}
            
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
        );
      })}
    </>
  );
}
