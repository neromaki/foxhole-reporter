// Hex grid layout for Foxhole world map
// Based on the 13-row hex grid arrangement (43 playable hexes)
// Layout matches official Foxhole map with proper row/column positioning

export interface HexCoordinate {
  row: number;    // 1-13 from top to bottom
  col: number;    // 0-based index within each row
  apiName: string;
  displayName: string;
  imageName: string;
}

// Foxhole world map hex layout (13 rows in hex grid pattern)
// Row count varies: 1,2,3,4,5,4,5,4,5,4,3,2,1 hexes per row
export const HEX_LAYOUT: HexCoordinate[] = [
  // Row 1 (1 hex)
  { row: 1, col: 0, apiName: 'BasinSionnachHex', displayName: "Basin Sionnach", imageName: 'BasinSionnachHex.png' },
  
  // Row 2 (2 hexes)
  { row: 2, col: 0, apiName: 'SpeakingWoodsHex', displayName: "Speaking Woods", imageName: 'SpeakingWoodsHex.png' },
  { row: 2, col: 1, apiName: 'HowlCountyHex', displayName: "Howl County", imageName: 'HowlCountyHex.png' },
  
  // Row 3 (3 hexes)
  { row: 3, col: 0, apiName: 'CallumsCapeHex', displayName: "Callum's Cape", imageName: 'CallumsCapeHex.png' },
  { row: 3, col: 1, apiName: 'ReachingTrailHex', displayName: "Reaching Trail", imageName: 'ReachingTrailHex.png' },
  { row: 3, col: 2, apiName: 'ClansheadValleyHex', displayName: "Clanshead Valley", imageName: 'ClansheadValleyHex.png' },
  
  // Row 4 (4 hexes)
  { row: 4, col: 0, apiName: 'NevishLineHex', displayName: "Nevish Line", imageName: 'NevishLineHex.png' },
  { row: 4, col: 1, apiName: 'MooringCountyHex', displayName: "The Moors", imageName: 'MooringCountyHex.png' },
  { row: 4, col: 2, apiName: 'ViperPitHex', displayName: "Viper Pit", imageName: 'ViperPitHex.png' },
  { row: 4, col: 3, apiName: 'MorgensCrossingHex', displayName: "Morgen's Crossing", imageName: 'MorgensCrossingHex.png' },
  
  // Row 5 (5 hexes)
  { row: 5, col: 0, apiName: 'OarbreakerHex', displayName: "Oarbreaker", imageName: 'OarbreakerHex.png' },
  { row: 5, col: 1, apiName: 'StonecradleHex', displayName: "Stonecradle", imageName: 'StonecradleHex.png' },
  { row: 5, col: 2, apiName: 'CallahansPassageHex', displayName: "Callahan's Passage", imageName: 'CallahansPassageHex.png' },
  { row: 5, col: 3, apiName: 'WeatheredExpanseHex', displayName: "Weathered Expanse", imageName: 'WeatheredExpanseHex.png' },
  { row: 5, col: 4, apiName: 'GodcroftsHex', displayName: "Godcrofts", imageName: 'GodcroftsHex.png' },
  
  // Row 6 (4 hexes)
  { row: 6, col: 0, apiName: 'FarranacCoastHex', displayName: "Farranac Coast", imageName: 'FarranacCoastHex.png' },
  { row: 6, col: 1, apiName: 'LinnMercyHex', displayName: "Linn of Mercy", imageName: 'LinnMercyHex.png' },
  { row: 6, col: 2, apiName: 'MarbanHollow', displayName: "Marban Hollow", imageName: 'MarbanHollowHex.png' },
  { row: 6, col: 3, apiName: 'StlicanShelfHex', displayName: "Stlican Shelf", imageName: 'StlicanShelfHex.png' },
  
  // Row 7 (5 hexes)
  { row: 7, col: 0, apiName: 'FishermansRowHex', displayName: "Fisherman's Row", imageName: 'FishermansRowHex.png' },
  { row: 7, col: 1, apiName: 'KingsCageHex', displayName: "King's Cage", imageName: 'KingsCageHex.png' },
  { row: 7, col: 2, apiName: 'DeadLandsHex', displayName: "Deadlands", imageName: 'DeadLandsHex.png' },
  { row: 7, col: 3, apiName: 'ClahstraHex', displayName: "The Clahstra", imageName: 'ClahstraHex.png' },
  { row: 7, col: 4, apiName: 'TempestIslandHex', displayName: "Tempest Island", imageName: 'TempestIslandHex.png' },
  
  // Row 8 (4 hexes)
  { row: 8, col: 0, apiName: 'WestgateHex', displayName: "Westgate", imageName: 'WestgateHex.png' },
  { row: 8, col: 1, apiName: 'LochMorHex', displayName: "Loch Mór", imageName: 'LochMorHex.png' },
  { row: 8, col: 2, apiName: 'DrownedValeHex', displayName: "Drowned Vale", imageName: 'DrownedValeHex.png' },
  { row: 8, col: 3, apiName: 'EndlessShoreHex', displayName: "Endless Shore", imageName: 'EndlessShoreHex.png' },
  
  // Row 9 (5 hexes)
  { row: 9, col: 0, apiName: 'StemaLandingHex', displayName: "Stema Landing", imageName: 'StemaLandingHex.png' },
  { row: 9, col: 1, apiName: 'SableportHex', displayName: "Sableport", imageName: 'SableportHex.png' },
  { row: 9, col: 2, apiName: 'UmbralWildwoodHex', displayName: "Umbral Wildwood", imageName: 'UmbralWildwoodHex.png' },
  { row: 9, col: 3, apiName: 'AllodsBightHex', displayName: "Allod's Bight", imageName: 'AllodsBightHex.png' },
  { row: 9, col: 4, apiName: 'TheFingersHex', displayName: "The Fingers", imageName: 'TheFingersHex.png' },
  
  // Row 10 (4 hexes)
  { row: 10, col: 0, apiName: 'OriginHex', displayName: "Origin", imageName: 'OriginHex.png' },
  { row: 10, col: 1, apiName: 'HeartlandsHex', displayName: "Heartlands", imageName: 'HeartlandsHex.png' },
  { row: 10, col: 2, apiName: 'ShackledChasmHex', displayName: "Shackled Chasm", imageName: 'ShackledChasmHex.png' },
  { row: 10, col: 3, apiName: 'ReaversPassHex', displayName: "Reaver's Pass", imageName: 'ReaversPassHex.png' },
  
  // Row 11 (3 hexes)
  { row: 11, col: 0, apiName: 'AshFieldsHex', displayName: "Ash Fields", imageName: 'AshFieldsHex.png' },
  { row: 11, col: 1, apiName: 'GreatMarchHex', displayName: "Great March", imageName: 'GreatMarchHex.png' },
  { row: 11, col: 2, apiName: 'TerminusHex', displayName: "Terminus", imageName: 'TerminusHex.png' },
  
  // Row 12 (2 hexes)
  { row: 12, col: 0, apiName: 'RedRiverHex', displayName: "Red River", imageName: 'RedRiverHex.png' },
  { row: 12, col: 1, apiName: 'AcrithiaHex', displayName: "Acrithia", imageName: 'AcrithiaHex.png' },
  
  // Row 13 (1 hex)
  { row: 13, col: 0, apiName: 'KalokaiHex', displayName: "Kalokai", imageName: 'KalokaiHex.png' },
];

const hexWidth = 512;
const hexHeight = 444;

// Hex grid rendering parameters
export const HEX_CONFIG = {
  // Visual dimensions for rendering
  hexWidth: hexWidth,    // Width of each hex tile image in pixels
  hexHeight: hexHeight,   // Height of each hex tile image
  
  // Leaflet bounds for the entire world
  worldBounds: {
    north: 3500,
    south: -3500,
    east: 3000,
    west: -3000
  },
  
  // Spacing between hexes (calculated for seamless tiling)
  horizontalSpacing: 770,  // 3/4 width for hex offset
  verticalSpacing: 221,   // sqrt(3)/2 for hex height
  
  // Row configuration: how many hexes in each row
  rowWidths: [1, 2, 3, 4, 5, 4, 5, 4, 5, 4, 3, 2, 1],
  maxRowWidth: 5  // Maximum hexes in any row (used for centering)
};

/**
 * Convert hex grid coordinates to Leaflet bounds
 * Diamond/rhombus layout with rows expanding then contracting
 */
export function hexToLeafletBounds(hex: HexCoordinate): [[number, number], [number, number]] {
  const { row, col } = hex;
  const { hexWidth, hexHeight, horizontalSpacing, verticalSpacing, rowWidths, maxRowWidth } = HEX_CONFIG;
  
  // Get the number of hexes in this row
  const hexesInRow = rowWidths[row - 1]; // row is 1-indexed
  
  // Calculate horizontal offset to center each row
  // Rows with fewer hexes are centered relative to the widest row
  const rowCenterOffset = ((maxRowWidth - hexesInRow) * horizontalSpacing) / 2;
  
  // Calculate position
  const x = col * horizontalSpacing + rowCenterOffset - (maxRowWidth * horizontalSpacing) / 2;
  const y = -(row - 1) * verticalSpacing + (13 * verticalSpacing) / 2; // Center vertically (13 rows)
  
  // Return bounds as [[south, west], [north, east]]
  return [
    [y - hexHeight, x],           // Bottom-left
    [y, x + hexWidth]             // Top-right
  ];
}

/**
 * Get hex coordinate by API name
 */
export function getHexByApiName(apiName: string): HexCoordinate | undefined {
  return HEX_LAYOUT.find(h => h.apiName === apiName);
}

/**
 * Get all hex coordinates
 */
export function getAllHexes(): HexCoordinate[] {
  return HEX_LAYOUT;
}
