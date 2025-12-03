import React from 'react';
import { ImageOverlay, useMap } from 'react-leaflet';
import { HEX_LAYOUT, hexToLeafletBounds, HEX_CONFIG } from '../lib/hexLayout';
import { LatLngBounds } from 'leaflet';
import { useMapStore } from '../state/useMapStore';

export default function HexTileLayer() {
  const map = useMap();
  const reportMode = useMapStore(s => s.activeReportMode);
  const darken = !!reportMode;

  React.useEffect(() => {
    // Set initial map bounds to show the whole world
    const { north, south, east, west } = HEX_CONFIG.worldBounds;
    map.setMaxBounds([[south, west], [north, east]]);
    map.fitBounds([[south, west], [north, east]]);
  }, [map]);

  return (
    <>
      {HEX_LAYOUT.map((hex) => {
        const bounds = hexToLeafletBounds(hex);
        // Vite will resolve this to the correct path
        const imageUrl = new URL(`../map/tiles/${hex.imageName}`, import.meta.url).href;
        
        return (
          <ImageOverlay
            key={hex.apiName}
            url={imageUrl}
            bounds={bounds}
            opacity={darken ? 0.6 : 1.0}
            zIndex={1}
          />
        );
      })}
    </>
  );
}
