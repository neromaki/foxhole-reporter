// Hex grid layout for Foxhole world map
// Based on the 13-row hex grid arrangement (43 playable hexes)
// Layout matches official Foxhole map with proper row/column positioning
import { Region, regions, RegionStruct, getRegionByApiName, getRegion } from '../data/regions';

export interface HexCoordinate {
  row: number;    // 1-13 from top to bottom
  col: number;    // 0-based index within each row
  region: Region; // Optional region enum for reference
}

// Foxhole world map hex layout (13 rows in hex grid pattern)
// Row count varies: 1,2,3,4,5,4,5,4,5,4,3,2,1 hexes per row
export const HEX_LAYOUT = regions;

const hexWidth = 512;
const hexHeight = 444;

// Hex grid rendering parameters
export const HEX_CONFIG = {
  // Visual dimensions for rendering
  hexWidth: hexWidth,    // Width of each hex tile image in pixels
  hexHeight: hexHeight,   // Height of each hex tile image
  
  // Leaflet bounds for the entire world
  worldBounds: {
    north: 3000,
    south: -3000,
    east: 3000,
    west: -3000
  },
  
  // Spacing between hexes (calculated for seamless tiling)
  horizontalSpacing: 770,  // 3/4 width for hex offset
  verticalSpacing: 221,   // sqrt(3)/2 for hex height
  
  // Row configuration: how many hexes in each row
  rowWidths: [1, 2, 5, 6, 7, 6, 5, 6, 7, 6, 5, 2, 1],
  maxRowWidth: 7  // Maximum hexes in any row (used for centering)
};

/**
 * Convert hex grid coordinates to Leaflet bounds
 * Diamond/rhombus layout with rows expanding then contracting
 */
export function hexToLeafletBounds(hex: RegionStruct): [[number, number], [number, number]] {

  const { hexWidth, hexHeight, horizontalSpacing, verticalSpacing, rowWidths, maxRowWidth } = HEX_CONFIG;
  
  // Get the number of hexes in this row
  const hexesInRow = rowWidths[hex.row - 1]; // row is 1-indexed
  
  // Calculate horizontal offset to center each row
  // Rows with fewer hexes are centered relative to the widest row
  const rowCenterOffset = ((maxRowWidth - hexesInRow) * horizontalSpacing) / 2;
  
  // Calculate position
  const x = hex.col * horizontalSpacing + rowCenterOffset - (maxRowWidth * horizontalSpacing) / 2;
  const y = -(hex.row - 1) * verticalSpacing + (13 * verticalSpacing) / 2; // Center vertically (13 rows)
  
  // Return bounds as [[south, west], [north, east]]
  return [
    [y - hexHeight, x],           // Bottom-left
    [y, x + hexWidth]             // Top-right
  ];
}

/**
 * Get hex coordinate by API name
 */
export function getHexByApiName(apiName: string): RegionStruct | undefined {
  return HEX_LAYOUT.find(h => h.apiName === apiName);
}

export function getHexRegion(region: Region): RegionStruct | undefined {
  return getRegion(region) || undefined;
}

/**
 * Get all hex coordinates
 */
export function getAllHexes(): RegionStruct[] {
  return HEX_LAYOUT;
}
