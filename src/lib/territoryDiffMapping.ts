/**
 * Maps frontend report IDs to backend territory_diffs table periods
 * 
 * Backend stores periods as generic names: 'daily', 'threeDay', 'weekly', 'allTime'
 * Frontend uses prefixed names for clarity: 'territory_daily', etc.
 */

export type TerritoryDiffPeriod = 'daily' | 'threeDay' | 'weekly' | 'allTime';

/**
 * Maps a territory report ID to the corresponding period in the territory_diffs table.
 * Frontend uses 'territory_' prefix for clarity; backend stores without prefix.
 * 
 * @param reportId The ReportSpec ID (e.g., 'territory-daily')
 * @returns The backend period name, or null if not a territory report
 */
export function getTerritoryDiffPeriod(reportId: string): TerritoryDiffPeriod | null {
  switch (reportId) {
    case 'territory-daily':
      return 'daily';
    case 'territory-three-day':
      return 'threeDay';
    case 'territory-weekly':
      return 'weekly';
    case 'territory-all-time':
      return 'allTime';
    default:
      return null;
  }
}
