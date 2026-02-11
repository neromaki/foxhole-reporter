import React, { useEffect, useMemo, useState } from 'react';
import tinycolor from "tinycolor2";
import { SVGOverlay, useMap } from 'react-leaflet';
import type { LocationTile } from '../types/war';
import { getHexByApiName, hexToLeafletBounds } from '../lib/hexLayout';
import { MAJOR_LABEL_MIN_ZOOM, MINOR_LABEL_MIN_ZOOM, MAP_MIN_ZOOM, CLICK_DISTANCE_THRESHOLD, TERRITORY_OPACITY_OVERVIEW, TERRITORY_SATURATION_OVERVIEW, TERRITORY_BRIGHTNESS_OVERVIEW, TERRITORY_OPACITY_NORMAL, TERRITORY_SATURATION_NORMAL, TERRITORY_BRIGHTNESS_NORMAL, TERRITORY_OPACITY_REPORT_UNAFFECTED, TERRITORY_SATURATION_REPORT_UNAFFECTED, TERRITORY_BRIGHTNESS_REPORT_UNAFFECTED, TERRITORY_OPACITY_REPORT_AFFECTED, TERRITORY_SATURATION_REPORT_AFFECTED, TERRITORY_BRIGHTNESS_REPORT_AFFECTED, TERRITORY_OPACITY_REPORT_HIGHLIGHTED, TERRITORY_SATURATION_REPORT_HIGHLIGHTED, TERRITORY_BRIGHTNESS_REPORT_HIGHLIGHTED, TERRITORY_SATURATION_ACTIVE_MODIFIER, TERRITORY_BRIGHTNESS_ACTIVE_MODIFIER, TERRITORY_OPACITY_ACTIVE_MODIFIER, TERRITORY_SATURATION_HIGHLIGHT_1, TERRITORY_BRIGHTNESS_HIGHLIGHT_1, TERRITORY_SATURATION_HIGHLIGHT_2, TERRITORY_BRIGHTNESS_HIGHLIGHT_2 } from '../lib/mapConfig';
import { useMapStore, TerritoryHistory, SelectedLocation } from '../state/useMapStore';
import { getTownByApiName, getTownById } from '../data/towns';
import { useSharedTooltip } from '../lib/sharedTooltip';
import { projectRegionPoint } from '../lib/projection';
import { DEBUG_MODE } from '../lib/appConfig';
import { Colors, getTeamColors, getTeamIcon, Teams } from '../data/teams';
import disabledHexOverlay from '../images/disabledHexOverlay.svg';
import { TERRITORY_PATHS } from '../data/territory-paths';
import { VALID_TERRITORY_OWNING_MAPICONS } from '../data/map-icons';
import type { useCasualtyRates } from '../lib/hooks/useCasualtyRates';
import { getTimeSinceLastCapture } from '../lib/time';
import { getViewModeRules } from '../lib/viewModes';
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
  }, [activeReport, hide]);

  // Build territory maps
  const territoryById = useMemo(() => {
    const map = new Map<string, LocationTile>();
    (snapshot?.territories ?? []).forEach((t) => map.set(t.id, t));
    return map;
  }, [snapshot]);

  // Use reportHighlightedSet for territory highlighting (unified report system)
  const changedSet = reportHighlightedSet;
  //console.log("[TerritorySubregion] changedSet:", changedSet);

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
        if (!matchedTown) {
          if (DEBUG_MODE) {
            console.warn(`[TerritorySubregion] No town found for path id "${pathData.id}" in region ${region}`);
          }
          continue;
        }
        
        // Try exact ID match first, but only if it's a valid territory-owning icon
        let territory = matchedTown.id ? territoryById.get(matchedTown.id) : undefined;
        if (territory && !VALID_TERRITORY_OWNING_MAPICONS.includes(territory.iconType)) {
          territory = undefined;
        }
        
        // If no exact match, try fuzzy match by region + approximate coordinates
        if (!territory && matchedTown.id) {
          const townIdParts = matchedTown.id.split('-');
          if (townIdParts.length === 3) {
            const expectedRegion = townIdParts[0];
            const expectedX = parseFloat(townIdParts[1]);
            const expectedY = parseFloat(townIdParts[2]);
            
            // Search for territories in the same region with similar coordinates
            // Only consider territories with valid territory-owning icon types
            for (const [id, t] of territoryById.entries()) {
              if (t.region === expectedRegion && VALID_TERRITORY_OWNING_MAPICONS.includes(t.iconType)) {
                const idParts = id.split('-');
                if (idParts.length === 3) {
                  const dx = Math.abs(parseFloat(idParts[1]) - expectedX);
                  const dy = Math.abs(parseFloat(idParts[2]) - expectedY);
                  // Allow 0.05 tolerance for coordinate drift
                  if (dx < 0.05 && dy < 0.05) {
                    territory = t;
                    if (DEBUG_MODE) {
                      console.log(`[TerritorySubregion] Fuzzy matched "${pathData.id}": expected ${matchedTown.id} -> found ${id}`);
                    }
                    break;
                  }
                }
              }
            }
          }
        }
        
        if (!territory) {
          if (DEBUG_MODE) {
            console.warn(`[TerritorySubregion] No territory data for path "${pathData.id}" (expected id: ${matchedTown.id}) in region ${region}`);
          }
          continue;
        }
        hasAnyTerritory = true;
        const highlighted = !!(changedSet && changedSet.has(territory.id));
        const baseColor = getTeamColors(territory.owner)?.saturated ?? Colors.Neutral;
        const baseOpacity = TERRITORY_OPACITY_NORMAL;
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
  }, [territoryById, changedSet, activeReport]);

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
        reportMode: activeReport?.id ?? null,
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
      reportMode: activeReport?.id ?? null,
    });
    show('selected', { html, lat: locationData.lat, lng: locationData.lng, openDelay: 0, sticky: true });

    if (isTouch) {      
      if (reportModeActive && locationData.lat && locationData.lng) {
        map.panTo([locationData.lat, locationData.lng], { animate: true, duration: 0.5 });
      }
      return;
    }
  };

  if (!snapshot?.territories?.length) {
    return null;
  }

  // Get ViewModeRules for current report
  const viewModeRules = activeReport ? getViewModeRules(activeReport.viewMode) : null;

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
            
            { activeLayers.territories ? ( 
              <g id="Territories" className="transition-opacity duration-150">
                {o.paths.map((p) => {   
                  const affected = p.highlighted; 
                  const active = (hoveredId === p.territoryId) || (selectedLocation?.id === p.territoryId && selectedLocation?.source === 'territory');
                  const hist = historyById.get(p.territoryId || '');  
                  const events = hist?.events ?? [];
                  const teamColors = getTeamColors(p.owner || 'Neutral');
                  
                  const timeLastCaptured = getTimeSinceLastCapture(events) || -1;

                  const strokeZoomModifier = () => {
                    if (zoom == MAP_MIN_ZOOM) return 2;
                    else if (zoom < 0) return 1.5;
                    else if (zoom > 1.5) return 0.5;
                    return 1;
                  }

                  // Normal
                  let fill = p.owner ? teamColors?.base : '#000000';
                  let fillSaturation = TERRITORY_SATURATION_NORMAL;
                  let fillBrightness = TERRITORY_BRIGHTNESS_NORMAL;
                  let fillOpacity = TERRITORY_OPACITY_NORMAL;
                  let stroke = p.stroke;
                  let strokeWidth = p.strokeWidth;


                  // Overview
                  if (zoom === MAP_MIN_ZOOM && (!reportModeActive && !viewModeRules)) {
                    fillSaturation = TERRITORY_SATURATION_OVERVIEW;
                    fillBrightness = TERRITORY_BRIGHTNESS_OVERVIEW;
                    fillOpacity = TERRITORY_OPACITY_OVERVIEW;
                  }

                  // Report mode
                  if (reportModeActive) {

                    // If the report mode has specific rules for territory display
                    if (viewModeRules) {
                      fillSaturation = viewModeRules.territory.unaffectedSaturation;
                      fillBrightness = viewModeRules.territory.unaffectedBrightness;
                      fillOpacity = viewModeRules.territory.unaffectedOpacity;

                      // If the territory is affected in the report
                      if (affected) {
                        fillSaturation = viewModeRules.territory.affectedSaturation;
                        fillBrightness = viewModeRules.territory.affectedBrightness;
                        fillOpacity = viewModeRules.territory.affectedOpacity;
                      }
                    } 
                    // No view mode rules for this report
                    else {
                      // If the territory is affected in the report
                      if (affected) {                    
                          fillSaturation = TERRITORY_SATURATION_REPORT_AFFECTED;
                          fillBrightness = TERRITORY_BRIGHTNESS_REPORT_AFFECTED;
                          fillOpacity = TERRITORY_OPACITY_REPORT_AFFECTED;
                      }
                    }
                  }

                  // Capture highlighting
                  if(timeLastCaptured > 0 && timeLastCaptured <= 6) {
                      fillSaturation += TERRITORY_SATURATION_HIGHLIGHT_1;
                      fillBrightness += TERRITORY_BRIGHTNESS_HIGHLIGHT_1;
                  }
                  else if(timeLastCaptured > 0 && timeLastCaptured <= 24) {
                      fillSaturation += TERRITORY_SATURATION_HIGHLIGHT_2;
                      fillBrightness += TERRITORY_BRIGHTNESS_HIGHLIGHT_2;
                  }

                  if (active) {
                    fillSaturation = 20;
                    fillBrightness = 40;
                    fillOpacity = fillOpacity * TERRITORY_OPACITY_ACTIVE_MODIFIER;
                    strokeWidth = strokeWidth * 2;
                  }

                  fill = tinycolor(fill).saturate(fillSaturation).brighten(fillBrightness).toString();

                  strokeWidth = strokeWidth * strokeZoomModifier();
                  
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
            ) : null }
            
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
