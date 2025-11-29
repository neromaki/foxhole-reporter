// Map WarAPI iconType to icon image URLs (PNG converted from TGA)
// Uses Vite's import.meta.url to resolve asset paths at build time

export function getIconUrl(iconType: number): string {
  const name = iconTypeToFilename(iconType);
  return new URL(`../map/icons/${name}`, import.meta.url).href;
}

export function iconTypeToFilename(iconType: number): string {
  const map: Record<number, string> = {
    // Common bases and structures
    11: 'Hospital.png',
    12: 'VehicleFactory.png',
    17: 'Refinery.png',
    18: 'Shipyard.png',
    19: 'EngineeringCenter.png',
    20: 'SalvageField.png',
    21: 'ComponentField.png',
    22: 'FuelField.png',
    23: 'SulfurField.png',
    27: 'Keep.png',
    28: 'ObservationTower.png',
    29: 'Fort.png',
    32: 'SulfurMine.png',
    33: 'StorageFacility.png',
    34: 'Factory.png',
    35: 'GarrisonStation.png',
    37: 'RocketSite.png',
    38: 'SalvageMine.png',
    39: 'ConstructionYard.png',
    40: 'ComponentMine.png',
    45: 'RelicBase.png',
    51: 'MassProductionFactory.png',
    52: 'Seaport.png',
    53: 'CoastalGun.png',
    54: 'SoulFactory.png',
    56: 'TownBase1.png',
    57: 'TownBase2.png',
    58: 'TownBase3.png',
    59: 'StormCannon.png',
    60: 'IntelCenter.png',
    61: 'CoalField.png',
    62: 'OilField.png',
    70: 'RocketTarget.png',
    71: 'RocketGroundZero.png',
    72: 'RocketSiteArmed.png',
    75: 'OilRig.png',
    83: 'WeatherStation.png',
    84: 'MortarHouse.png'
  };
  return map[iconType] ?? 'Unknown.png';
}

export function getIconSize(iconType: number): [number, number] {
  // Provide reasonable default sizing; adjust specific icons if needed
  switch (iconType) {
    case 56:
    case 57:
    case 58:
      return [22, 22];
    case 37:
    case 59:
      return [24, 24];
    default:
      return [18, 18];
  }
}
