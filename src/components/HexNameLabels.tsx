import React from 'react';
import { LayerGroup, Marker, Pane, useMap } from 'react-leaflet';
import L from 'leaflet';
import { HEX_LAYOUT, hexToLeafletBounds } from '../lib/hexLayout';
import { MAP_MIN_ZOOM } from '../lib/mapConfig';

export default function HexNameLabels() {
  const map = useMap();
  const [zoom, setZoom] = React.useState(map.getZoom());

  React.useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  return (
    <LayerGroup>
      <Pane name="hex-name-pane" style={{ zIndex: 600 }} />
      {HEX_LAYOUT.map((hex) => {
        const [[south, west], [north, east]] = hexToLeafletBounds(hex);
        const centerLat = (south + north) / 2;
        const centerLng = (west + east) / 2;
        const icon = L.divIcon({
          className: `hex-name-label map-label text-center text-[${zoom >= -1 ? '18px' : '14px'}] font-extrabold text-gray-100 drop-shadow`,
          html: `<span>${hex.displayName}</span>`,
          iconSize: [east - west, 30]
        });
        return (
          <Marker
            key={`hex-center-${hex.apiName}`}
            position={[centerLat, centerLng]}
            icon={icon}
            interactive={false}
            pane="hex-name-pane"
          />
        );
      })}
    </LayerGroup>
  );
}
