import React from 'react';
import { ImageOverlay, useMap } from 'react-leaflet';
import { HEX_LAYOUT, hexToLeafletBounds, HEX_CONFIG } from '../lib/hexLayout';
import { LatLngBounds } from 'leaflet';
import { useMapStore } from '../state/useMapStore';
import { Region } from '../data/regions';

export default function HexTileLayer() {
  const map = useMap();
  const reportMode = useMapStore(s => s.activeReport);
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
        // Try WebP first with PNG fallback for older browsers
        const webpUrl = new URL(`../map/tiles/Map${hex.apiName}${hex.apiName.endsWith('Hex') ? '' : 'Hex'}.webp`, import.meta.url).href;
        const pngUrl = new URL(`../map/tiles/${hex.apiName}`, import.meta.url).href;
        
        // Use WebP with PNG fallback
        const imageUrl = webpUrl;
        console.log(`Adding hex tile: ${hex.apiName} using imageName ${hex.apiName} and img ${imageUrl} at row ${hex.row}, col ${hex.col}`);
        return (
          <ImageOverlay
            key={hex.name == Region.Empty ? `empty-${hex.row}-${hex.col}` : hex.apiName}
            url={hex.name == Region.Empty ? "" : imageUrl}
            bounds={bounds}
            opacity={darken ? 0.6 : 1.0}
            zIndex={1}
          />
        );
      })}
    </>
  );
}
