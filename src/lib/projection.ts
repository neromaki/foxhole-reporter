// Foxhole coordinate projection utilities
// Maps normalized WarAPI coordinates (0-1) to Leaflet lat/lng
import { getHexByApiName, hexToLeafletBounds } from './hexLayout';

// World extents from WarAPI documentation (constant for all maps)
export const WORLD_EXTENT = {
  min: { x: -109200, y: -94500 },
  max: { x: 109200, y: 94500 }
};

// Leaflet coordinate system boundaries (arbitrary scaling for map view)
const MAP_SIZE = 1024; // pixels or arbitrary units
const LAT_BOUNDS = [-MAP_SIZE / 2, MAP_SIZE / 2];
const LNG_BOUNDS = [-MAP_SIZE / 2, MAP_SIZE / 2];

/**
 * Convert normalized WarAPI coordinates (0-1) to Leaflet [lat, lng]
 * @param normalized Object with x,y in range [0, 1]
 * @returns [lat, lng] tuple for Leaflet
 */
export function normalizedToLatLng(normalized: { x: number; y: number }): [number, number] {
  // Map normalized [0,1] to lat/lng bounds
  // Note: y coordinate is inverted (0 = top in game, but bottom in map coordinates)
  const lng = LNG_BOUNDS[0] + normalized.x * (LNG_BOUNDS[1] - LNG_BOUNDS[0]);
  const lat = LAT_BOUNDS[1] - normalized.y * (LAT_BOUNDS[1] - LAT_BOUNDS[0]); // invert y
  return [lat, lng];
}

/**
 * Convert game world coordinates to normalized [0-1] range
 * @param world Object with x,y in game world units
 * @returns Normalized {x, y} in range [0, 1]
 */
export function worldToNormalized(world: { x: number; y: number }): { x: number; y: number } {
  const rangeX = WORLD_EXTENT.max.x - WORLD_EXTENT.min.x;
  const rangeY = WORLD_EXTENT.max.y - WORLD_EXTENT.min.y;
  return {
    x: (world.x - WORLD_EXTENT.min.x) / rangeX,
    y: (world.y - WORLD_EXTENT.min.y) / rangeY
  };
}

/**
 * Convert game world coordinates directly to Leaflet [lat, lng]
 * @param world Object with x,y in game world units
 * @returns [lat, lng] tuple for Leaflet
 */
export function worldToLatLng(world: { x: number; y: number }): [number, number] {
  return normalizedToLatLng(worldToNormalized(world));
}

/**
 * Get bounding box for a hex region (approximate size in lat/lng)
 * Each region is roughly the same size; use normalized coords with a fixed tile size
 */
export function getRegionBounds(normalized: { x: number; y: number }): [[number, number], [number, number]] {
  const center = normalizedToLatLng(normalized);
  const tileSize = 40; // Approximate size in map units for each icon/marker
  return [
    [center[0] - tileSize, center[1] - tileSize],
    [center[0] + tileSize, center[1] + tileSize]
  ];
}

/**
 * Project a normalized (0-1) coordinate inside a specific region hex to Leaflet [lat,lng].
 * Uses that hex's image bounds so markers land within the correct tile rather than global space.
 * If region not found, falls back to global normalized mapping.
 */
export function projectRegionPoint(regionName: string, x: number, y: number): [number, number] | null {
  const hex = getHexByApiName(regionName);
  if (!hex) return null;
  const [[south, west], [north, east]] = hexToLeafletBounds(hex);
  const width = east - west;
  const height = north - south;
  const lng = west + x * width;
  const lat = north - y * height; // invert y (0 top in API)
  return [lat, lng];
}
