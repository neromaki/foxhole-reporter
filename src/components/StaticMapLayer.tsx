import React from 'react';
import { LayerGroup, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useStaticMaps } from '../lib/hooks/useStaticMaps';
import { projectRegionPoint } from '../lib/projection';
import { useMap } from 'react-leaflet';
import { MINOR_LABEL_MIN_ZOOM } from '../lib/mapConfig';
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
  if (!visible && !anyLabelVisible) return null;
  if (isLoading) return null;

  return (
    <LayerGroup>
      {data?.flatMap(entry => {
        const hex = getHexByApiName(entry.mapName);
        if (!hex) return [];

        const iconMarkers = entry.data.mapItems.map((item, idx) => {
          if (typeof item.x !== 'number' || typeof item.y !== 'number') return null;
          const projected = projectRegionPoint(entry.mapName, item.x, item.y);
          if (!projected) return null;
          const [lat, lng] = projected;
          const [w, h] = getIconSize(item.iconType ?? 0);
          const icon = L.icon({
            iconUrl: getIconUrl(item.iconType ?? 0),
            iconSize: [w, h],
            iconAnchor: [w/2, h/2],
            className: 'opacity-90'
          });
          return (
            <Marker position={[lat, lng]} icon={icon} key={`${entry.mapName}-i-${idx}`}>
              <Tooltip>
                <div className='text-xs'>Icon {item.iconType ?? 'N/A'}</div>
              </Tooltip>
            </Marker>
          );
        }).filter(Boolean);

        const textMarkers = entry.data.mapTextItems
          .filter(txt => {
            if (txt.mapMarkerType === 'Major') return majorVisible;
            // Minor labels gated by zoom level
            return minorVisible && zoom >= MINOR_LABEL_MIN_ZOOM;
          })
          .map((txt, idx) => {
            const projected = projectRegionPoint(entry.mapName, txt.x, txt.y);
            if (!projected) return null;
            const [lat, lng] = projected;
            const isMajor = txt.mapMarkerType === 'Major';
            const sizeClass = isMajor ? 'text-[13px] font-extrabold' : 'text-[9px] font-semibold';
            return (
              <Marker position={[lat, lng]} key={`${entry.mapName}-t-${idx}`} icon={L.divIcon({
                className: `map-label ${sizeClass}`,
                html: `<span>${txt.text}</span>`
              })} />
            );
          }).filter(Boolean);

        return [...iconMarkers, ...textMarkers];
      })}
    </LayerGroup>
  );
}
