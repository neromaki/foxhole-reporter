export interface LocationTile {
  id: string; // unique identifier: mapName-x-y
  owner: 'Colonial' | 'Warden' | 'Neutral';
  x: number; // normalized [0-1]
  y: number; // normalized [0-1]
  region: string; // map name
  iconType: number; // WarAPI icon type (base, factory, etc.)
  flags: number; // bitmask (IsVictoryBase, IsBuildSite, IsScorched, etc.)
}

export interface Snapshot {
  id: string;
  created_at: string;
  war_number: number;
  day_number: number;
  territories: LocationTile[];
  reports?: WarReport[];
}

export interface TerritoryDiffEntry {
  id: string; // tile id
  previousOwner: LocationTile['owner'];
  newOwner: LocationTile['owner'];
  changed_at_snapshot: string; // snapshot id
}

export interface TerritoryDiff {
  period: 'daily' | 'weekly';
  generated_at: string;
  changes: TerritoryDiffEntry[];
}

export interface War {
  war_id: string;
  war_number: number;
  winner: string;
  war_start_time: Date;
  war_end_time: Date;
  required_victory_towns: number;
}

export interface WarReport {
  region: string;
  version: number;
  dayOfWar: number;
  totalEnlistments: number;
  wardenCasualties: number;
  colonialCasualties: number;
}