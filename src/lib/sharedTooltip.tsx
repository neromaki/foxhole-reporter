import React, { createContext, useContext, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface SharedTooltipContextValue {
  show(html: string, lat: number, lng: number, openDelay?: number): void;
  hide(closeDelay?: number): void;
}

const SharedTooltipContext = createContext<SharedTooltipContextValue | null>(null);

export function useSharedTooltip(): SharedTooltipContextValue {
  const ctx = useContext(SharedTooltipContext);
  if (!ctx) throw new Error('useSharedTooltip must be used within SharedTooltipProvider');
  return ctx;
}

export const SharedTooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const map = useMap();
  const tooltipRef = useRef<L.Tooltip | null>(null);
  const openTimeoutRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const tooltip = L.tooltip({
      permanent: false,
      direction: 'top',
      offset: [0, -10],
      className: 'shared-tooltip'
    });
    tooltipRef.current = tooltip;
    return () => {
      tooltip.remove();
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [map]);

  const show = (html: string, lat: number, lng: number, openDelay: number = 120) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    openTimeoutRef.current = window.setTimeout(() => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      tooltip.setLatLng([lat, lng] as any);
      tooltip.setContent(html);
      tooltip.addTo(map);
    }, openDelay);
  };

  const hide = (closeDelay: number = 220) => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = window.setTimeout(() => {
      const tooltip = tooltipRef.current;
      if (tooltip) tooltip.remove();
    }, closeDelay);
  };

  return (
    <SharedTooltipContext.Provider value={{ show, hide }}>
      {children}
    </SharedTooltipContext.Provider>
  );
};
