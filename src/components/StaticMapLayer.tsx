import React from 'react';
import { LayerGroup, Marker, useMap } from 'react-leaflet';
import { useSharedTooltip } from '../lib/sharedTooltip';
import L from 'leaflet';
import { useStaticMaps } from '../lib/hooks/useStaticMaps';
import { projectRegionPoint } from '../lib/projection';
import { MINOR_LABEL_MIN_ZOOM, MAJOR_LABEL_MIN_ZOOM } from '../lib/mapConfig';
import { getIconUrl, getIconSize } from '../lib/icons';
import { getHexByApiName } from '../lib/hexLayout';

export default function StaticMapLayer({ visible, majorVisible, minorVisible }: { visible: boolean; majorVisible: boolean; minorVisible: boolean }) {
  const map = useMap();
  const [zoom, setZoom] = React.useState(map.getZoom());
  React.useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  const anyLabelVisible = majorVisible || minorVisible;
  const { data, isLoading } = useStaticMaps(visible || anyLabelVisible);

  // Pre-project all static items (icons + text) once per data load
  type ProjectedIcon = { key: string; lat: number; lng: number; iconType: number };
  type ProjectedLabel = { key: string; lat: number; lng: number; text: string; isMajor: boolean };
  const projectedIcons = React.useMemo<ProjectedIcon[]>(() => {
    const out: ProjectedIcon[] = [];
    data?.forEach(entry => {
      entry.data.mapItems.forEach((item, idx) => {
        if (typeof item.x !== 'number' || typeof item.y !== 'number') return;
        const projected = projectRegionPoint(entry.mapName, item.x, item.y);
        if (!projected) return;
        const [lat, lng] = projected;
        out.push({ key: `${entry.mapName}-i-${idx}`, lat, lng, iconType: item.iconType ?? 0 });
      });
    });
    return out;
  }, [data]);

  const projectedLabels = React.useMemo<ProjectedLabel[]>(() => {
    const out: ProjectedLabel[] = [];
    data?.forEach(entry => {
      entry.data.mapTextItems.forEach((txt, idx) => {
        const projected = projectRegionPoint(entry.mapName, txt.x, txt.y);
        if (!projected) return;
        const [lat, lng] = projected;
        out.push({ key: `${entry.mapName}-t-${idx}`, lat, lng, text: txt.text, isMajor: txt.mapMarkerType === 'Major' });
      });
    });
    return out;
  }, [data]);

  // Viewport culling with padding
  const [visibleIcons, setVisibleIcons] = React.useState<ProjectedIcon[]>([]);
  const [visibleLabels, setVisibleLabels] = React.useState<ProjectedLabel[]>([]);

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
    const PAD = 20; // padding similar to territory layer
    const recompute = () => {
      const bounds = map.getBounds();
      if (visible) {
        setVisibleIcons(projectedIcons.filter(i => isInBounds(i.lat, i.lng, bounds, PAD)));
      } else {
        setVisibleIcons([]);
      }
      if (anyLabelVisible) {
        setVisibleLabels(projectedLabels.filter(l => isInBounds(l.lat, l.lng, bounds, PAD)));
      } else {
        setVisibleLabels([]);
      }
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
  }, [map, projectedIcons, projectedLabels, visible, anyLabelVisible]);

  // Shared tooltip for static icons (labels are text only, no tooltip for them here)
  const { show, hide } = useSharedTooltip();

  const getIconTooltipContent = React.useCallback((iconType: number) => {
    return `<div class="text-xs">Icon ${iconType}</div>`;
  }, []);

  const handleMouseOver = React.useCallback((icon: ProjectedIcon) => {
    show(getIconTooltipContent(icon.iconType), icon.lat, icon.lng, 120);
  }, [show, getIconTooltipContent]);

  const handleMouseOut = React.useCallback(() => {
    hide(220);
  }, [hide]);

  // Guarded early exits must occur after hooks to preserve order
  if (!visible && !anyLabelVisible) return null;
  if (isLoading) return null;

  return (
    <LayerGroup>
      {visibleIcons.map(icon => {
        const [w, h] = getIconSize(icon.iconType);
        const leafletIcon = L.icon({
          iconUrl: getIconUrl(icon.iconType),
          iconSize: [w, h],
          iconAnchor: [w/2, h/2],
          className: 'opacity-90'
        });
        return (
          <Marker
            position={[icon.lat, icon.lng]}
            icon={leafletIcon}
            key={icon.key}
            eventHandlers={{
              mouseover: () => handleMouseOver(icon),
              mouseout: handleMouseOut
            }}
          />
        );
      })}
      {visibleLabels
        .filter(l => (l.isMajor ? (majorVisible && zoom >= MAJOR_LABEL_MIN_ZOOM) : (minorVisible && zoom >= MINOR_LABEL_MIN_ZOOM)))
        .map(label => {
          const sizeClass = label.isMajor ? 'text-[13px] font-extrabold' : 'text-[9px] font-semibold';
          return (
            <Marker position={[label.lat, label.lng]} key={label.key} icon={L.divIcon({
              className: `map-label ${sizeClass}`,
              html: `<span>${label.text}</span>`
            })} />
          );
        })}
    </LayerGroup>
  );
}
