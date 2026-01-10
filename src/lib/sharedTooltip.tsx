import React, { createContext, useContext, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getTeamIcon } from '../data/teams';
import { getIconLabel, getIconWikiUrl } from './icons';
import type { LocationTile } from '../types/war';
import type { SelectedLocation, TerritoryHistory } from '../state/useMapStore';
import { getTimeSinceLastCapture } from './time';
import { useMapStore } from '../state/useMapStore';

dayjs.extend(relativeTime);

type TooltipType = 'hover' | 'selected';
type Platform = 'desktop' | 'mobile';
type Action = 'hover' | 'selected';
type Source = 'mapIcon' | 'territory';

interface TooltipPayload {
  html: string;
  lat: number;
  lng: number;
  openDelay?: number;
  sticky?: boolean;
  interactive?: boolean;
  className?: string;
}

interface ContentBuilderData {
  platform: Platform;
  action: Action;
  source: Source;
  location: SelectedLocation;
  reportMode?: string | null;
  nearbyMajorLabel?: string | null;
  hexName?: string | null;
}

interface SharedTooltipContextValue {
  show(type: TooltipType, payload: TooltipPayload): void;
  hide(type: TooltipType, closeDelay?: number): void;
  hideAll(closeDelay?: number): void;
  refresh(type: TooltipType, payload: Partial<TooltipPayload>): void;
  buildTooltipContent(data: ContentBuilderData): string;
}

const SharedTooltipContext = createContext<SharedTooltipContextValue | null>(null);

export function useSharedTooltip(): SharedTooltipContextValue {
  const ctx = useContext(SharedTooltipContext);
  if (!ctx) throw new Error('useSharedTooltip must be used within SharedTooltipProvider');
  return ctx;
}

export const SharedTooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const map = useMap();
  
  // Separate refs for each tooltip type
  const hoverTooltipRef = useRef<L.Tooltip | null>(null);
  const selectedTooltipRef = useRef<L.Tooltip | null>(null);
  
  const hoverOpenTimeoutRef = useRef<number | null>(null);
  const hoverCloseTimeoutRef = useRef<number | null>(null);
  const selectedOpenTimeoutRef = useRef<number | null>(null);
  const selectedCloseTimeoutRef = useRef<number | null>(null);
  
  const hoverEnterHandlerRef = useRef<((e: Event) => void) | null>(null);
  const hoverLeaveHandlerRef = useRef<((e: Event) => void) | null>(null);
  const selectedEnterHandlerRef = useRef<((e: Event) => void) | null>(null);
  const selectedLeaveHandlerRef = useRef<((e: Event) => void) | null>(null);

  const setPanelState = useMapStore((s) => s.setPanelState);
  const setSelectedLocation = useMapStore((s) => s.setSelectedLocation);
  const selectedLocation = useMapStore((s) => s.selectedLocation);
  const infoPanelState = useMapStore((s) => s.panelState.info);

  // Create both tooltip instances
  useEffect(() => {
    const hoverTooltip = L.tooltip({
      permanent: false,
      direction: 'top',
      offset: [0, -10],
      className: 'shared-tooltip shared-tooltip-hover',
      interactive: false,
      sticky: true
    });
    hoverTooltipRef.current = hoverTooltip;

    const selectedTooltip = L.tooltip({
      permanent: false,
      direction: 'top',
      offset: [0, -10],
      className: 'shared-tooltip shared-tooltip-selected',
      interactive: true,
      sticky: true
    });
    selectedTooltipRef.current = selectedTooltip;

    return () => {
      hoverTooltip.remove();
      selectedTooltip.remove();
      if (hoverOpenTimeoutRef.current) clearTimeout(hoverOpenTimeoutRef.current);
      if (hoverCloseTimeoutRef.current) clearTimeout(hoverCloseTimeoutRef.current);
      if (selectedOpenTimeoutRef.current) clearTimeout(selectedOpenTimeoutRef.current);
      if (selectedCloseTimeoutRef.current) clearTimeout(selectedCloseTimeoutRef.current);
    };
  }, [map]);

  // Hide selected tooltip when info panel closes or selection is cleared
  useEffect(() => {
    if (!selectedLocation || infoPanelState === 'off') {
      hide('selected', 250);
    }
  }, [selectedLocation, infoPanelState]);

  // ESC handler to close info panel and clear selection
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPanelState('info', 'off');
        setSelectedLocation(null);
        hide('selected', 250);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [setPanelState, setSelectedLocation]);

  const getTooltipRefs = (type: TooltipType) => {
    if (type === 'hover') {
      return {
        tooltip: hoverTooltipRef,
        openTimeout: hoverOpenTimeoutRef,
        closeTimeout: hoverCloseTimeoutRef,
        enterHandler: hoverEnterHandlerRef,
        leaveHandler: hoverLeaveHandlerRef,
      };
    } else {
      return {
        tooltip: selectedTooltipRef,
        openTimeout: selectedOpenTimeoutRef,
        closeTimeout: selectedCloseTimeoutRef,
        enterHandler: selectedEnterHandlerRef,
        leaveHandler: selectedLeaveHandlerRef,
      };
    }
  };

  const show = (type: TooltipType, payload: TooltipPayload) => {
    const { html, lat, lng, openDelay = 120, sticky = false, className } = payload;
    const refs = getTooltipRefs(type);

    if (refs.closeTimeout.current) {
      clearTimeout(refs.closeTimeout.current);
      refs.closeTimeout.current = null;
    }
    if (refs.openTimeout.current) clearTimeout(refs.openTimeout.current);
    
    refs.openTimeout.current = window.setTimeout(() => {
      const tooltip = refs.tooltip.current;
      if (!tooltip) return;
      
      tooltip.setLatLng([lat, lng] as any);
      tooltip.setContent(html);
      if (className) {
        const baseClasses = type === 'hover' ? 'shared-tooltip shared-tooltip-hover' : 'shared-tooltip shared-tooltip-selected';
        (tooltip as any).options.className = `${baseClasses} ${className}`;
      }
      tooltip.addTo(map);

      // Bring selected tooltip to front
      if (type === 'selected') {
        const el = (tooltip as any).getElement?.() || (tooltip as any)._container;
        if (el) el.style.zIndex = '600';
      }

      // Setup event listeners
      const el = (tooltip as any).getElement?.() || (tooltip as any)._container;
      if (el) {
        // Remove old listeners if present
        if (refs.enterHandler.current) {
          el.removeEventListener('mouseenter', refs.enterHandler.current);
        }
        if (refs.leaveHandler.current) {
          el.removeEventListener('mouseleave', refs.leaveHandler.current);
        }

        const enterHandler = () => {
          if (refs.closeTimeout.current) {
            clearTimeout(refs.closeTimeout.current);
            refs.closeTimeout.current = null;
          }
        };
        refs.enterHandler.current = enterHandler;
        el.addEventListener('mouseenter', enterHandler);

        if (!sticky) {
          const leaveHandler = () => hide(type, 150);
          refs.leaveHandler.current = leaveHandler;
          el.addEventListener('mouseleave', leaveHandler);
        } else {
          refs.leaveHandler.current = null;
        }
      }
    }, openDelay);
  };

  const hide = (type: TooltipType, closeDelay: number = 220) => {
    const refs = getTooltipRefs(type);
    
    if (refs.openTimeout.current) {
      clearTimeout(refs.openTimeout.current);
      refs.openTimeout.current = null;
    }
    if (refs.closeTimeout.current) clearTimeout(refs.closeTimeout.current);
    
    refs.closeTimeout.current = window.setTimeout(() => {
      const tooltip = refs.tooltip.current;
      if (tooltip) tooltip.remove();
    }, closeDelay);
  };

  const hideAll = (closeDelay: number = 220) => {
    hide('hover', closeDelay);
    hide('selected', closeDelay);
  };

  const refresh = (type: TooltipType, payload: Partial<TooltipPayload>) => {
    const refs = getTooltipRefs(type);
    const tooltip = refs.tooltip.current;
    if (!tooltip || !map.hasLayer(tooltip)) return;

    if (payload.html !== undefined) {
      tooltip.setContent(payload.html);
    }
    if (payload.lat !== undefined && payload.lng !== undefined) {
      tooltip.setLatLng([payload.lat, payload.lng] as any);
    }
  };

  const buildTooltipContent = (data: ContentBuilderData): string => {
    const { platform, action, source, location, reportMode, nearbyMajorLabel, hexName } = data;
    const lines: string[] = [];

    if (source === 'mapIcon') {
      // Map icon tooltip
      const tile = location.tile;
      const isVictoryBase = (tile.flags & 0x01) !== 0;
      const isScorched = (tile.flags & 0x10) !== 0;
      const isBuildSite = (tile.flags & 0x04) !== 0;

      const wikiUrl = getIconWikiUrl(tile.iconType);
      const labelHtml = wikiUrl
        ? `<a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" class="font-medium underline decoration-dotted">${getIconLabel(tile.iconType)}</a>`
        : `<span class="font-semibold">${getIconLabel(tile.iconType)}</span>`;
      lines.push(labelHtml);

      if (nearbyMajorLabel) lines.push(`<div class="font-semibold">${nearbyMajorLabel}</div>`);
      if (hexName) lines.push(`<div class="text-gray-800">${hexName}</div>`);
      if (tile.owner !== 'Neutral') {
        lines.push(`<div class="flex"><img src="${getTeamIcon(tile.owner)}" alt="${tile.owner}" class="inline-block w-4 h-4 mr-1"/>${tile.owner}</div>`);
      }
      if (isVictoryBase) lines.push('<div class="text-amber-400">Victory Base</div>');
      if (isScorched) lines.push('<div class="text-red-400">Scorched</div>');
      if (isBuildSite) lines.push('<div class="text-blue-400">Build Site</div>');

      return `<div class="text-xs">${lines.join('')}</div>`;
    } else {
      // Territory tooltip
      const name = location.name ?? location.id;
      const owner = location.owner ?? 'Neutral';
      const hist = location.history;
      const events = hist?.events ?? [];

      lines.push(`<div class="font-semibold">${name}</div>`);
      lines.push(`<div class="flex"><img src="${getTeamIcon(owner)}" alt="${owner}" class="inline-block w-4 h-4 mr-1"/>${owner}${reportMode ? ' gain' : ''}</div>`);

      if (action === 'selected' || platform === 'desktop') {
        if (reportMode) {
          if (reportMode === 'daily') {
            lines.push('<div class="mt-1 font-semibold">History:</div>');
            if (events.length === 0) {
              lines.push(`<div class="flex">
                    <img src="${getTeamIcon(owner)}" alt="${owner}" class="inline-block w-4 h-4 mr-1"/>
                    <span class="mr-2">${owner}</span>
                    <span>(>24 hrs ago)</span>
                </div>`);
            } else {
              events.forEach((ev: any) => {
                if (ev.owner !== 'Neutral') {
                  lines.push(
                    `<div class="flex">
                      <img src="${getTeamIcon(ev.owner)}" alt="${ev.owner}" class="inline-block w-4 h-4 mr-1"/>
                      <span class="mr-2">${ev.owner}</span>
                      <span>(${dayjs(ev.at).fromNow()})</span>
                    </div>`
                  );
                }
              });
            }
          }
        } else {
          const timeLastCaptured = getTimeSinceLastCapture(events) || -1;
          if (timeLastCaptured >= 0) {
            lines.push(`<div>Captured <span style="font-weight:bold;">${timeLastCaptured} hrs</span> ago</div>`);
          }
        }
      }

      return `<div class="text-xs flex flex-col">${lines.join('')}</div>`;
    }
  };

  return (
    <SharedTooltipContext.Provider value={{ show, hide, hideAll, refresh, buildTooltipContent }}>
      {children}
    </SharedTooltipContext.Provider>
  );
};
