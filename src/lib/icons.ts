// Map WarAPI iconType to icon image URLs (PNG converted from TGA)
// Uses Vite's import.meta.url to resolve asset paths at build time

export function getIconUrl(iconType: number, owner?: string): string {
  console.log(`Getting icon URL for iconType: ${iconType}, owner: ${owner}`);
  const name = iconTypeToFilename(iconType, owner);
  return new URL(`../map/icons/${name}`, import.meta.url).href;
}

export function iconTypeToFilename(iconType: number, owner?: string): string {
  console.log(`Mapping iconType to filename: ${iconType} with owner: ${owner}`);
  // Map WarAPI iconType codes to local PNG asset filenames
  const map: Record<number, string> = {
    // Common bases and structures
    11: 'Medical',
    12: 'Vehicle',
    17: 'Manufacturing',
    18: 'Shipyard',
    19: 'TechCenter',
    20: 'Salvage',
    21: 'Components',
    22: 'Fuel',
    23: 'Sulfur',
    27: 'Keep',
    28: 'ObservationTower',
    29: 'Fort',
    32: 'SulfurMine',
    33: 'StorageFacility',
    34: 'Factory',
    35: 'Safehouse',
    37: 'RocketSite',
    38: 'SalvageMine',
    39: 'ConstructionYard',
    40: 'ComponentMine',
    45: 'RelicBase',
    51: 'MassProductionFactory',
    52: 'Seaport',
    53: 'CoastalGun',
    54: 'SoulFactory',
    56: 'TownBaseTier1',
    57: 'TownBaseTier2',
    58: 'TownBaseTier3',
    59: 'StormCannon',
    60: 'IntelCenter',
    61: 'Coal',
    62: 'OilWell',
    70: 'RocketTarget',
    71: 'RocketGroundZero',
    72: 'RocketSiteArmed',
    75: 'FacilityMineOilRig',
    83: 'WeatherStation',
    84: 'MortarHouse'
  };
  const base = "MapIcon" + (map[iconType] ?? 'Unknown');
  const suffix = ownerSuffix(owner);
  const filename = base + (suffix ? suffix : '') + ".png";
  console.log(`Mapped iconType ${iconType} to filename: ${filename}`);
  return filename;
}

function ownerSuffix(owner?: string): string | '' {
  if (!owner) return '';
  const normalized = String(owner).trim().toUpperCase();
  if (normalized === 'COLONIAL') return 'Colonial';
  if (normalized === 'WARDEN') return 'Warden';
  if (normalized === 'NONE' || normalized === 'NEUTRAL') return '';
  // If an unexpected value comes through, do not append
  return '';
}

export function getIconSize(iconType: number): [number, number] {
  // Provide reasonable default sizing; adjust specific icons if needed
  switch (iconType) {
    case 56:
    case 57:
    case 58:
      return [24, 24];
    case 37:
    case 59:
      return [24, 24];
    default:
      return [24, 24];
  }
}
