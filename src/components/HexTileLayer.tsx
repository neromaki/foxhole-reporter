import React from 'react';
import { ImageOverlay, useMap } from 'react-leaflet';
import { HEX_LAYOUT, hexToLeafletBounds, HEX_CONFIG } from '../lib/hexLayout';
import { LatLngBounds } from 'leaflet';

export default function HexTileLayer() {
  const map = useMap();

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
            opacity={1.0}
            zIndex={1}
          />
        );
      })}
    </>
  );
}
