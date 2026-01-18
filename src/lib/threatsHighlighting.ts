/**
 * Threats highlighting logic for the unified report system
 * Determines which territories should be highlighted based on stack comparison
 */

import type { LocationTile } from '../types/war';
import type { MapIcon } from '../data/map-icons';

/**
 * Computes which territories are "threatened" based on stack comparison
 * A territory is threatened if it contains icons from stackComparisonIcons
 * and one team has more of those icons than the other in that territory.
 * 
 * @param territories - All territory tiles from snapshot
 * @param stackComparisonIcons - Icon types to compare (e.g., [MapIcon.Storm_Cannon])
 * @returns Set of territory IDs that should be highlighted
 */
export function computeThreatenedTerritories(
  territories: LocationTile[] | undefined,
  stackComparisonIcons: MapIcon[]
): Set<string> {
  const threatened = new Set<string>();
  
  if (!territories || !stackComparisonIcons || stackComparisonIcons.length === 0) {
    return threatened;
  }

  // Group territories by hex region to analyze stacks
  const territoriesByRegion = new Map<string, LocationTile[]>();
  for (const t of territories) {
    if (!territoriesByRegion.has(t.region)) {
      territoriesByRegion.set(t.region, []);
    }
    territoriesByRegion.get(t.region)!.push(t);
  }

  // For each region, analyze stack comparison
  for (const [region, regionTerritories] of territoriesByRegion) {
    // Count icons by team
    let wardenCount = 0;
    let colonialCount = 0;
    
    for (const t of regionTerritories) {
      // Check if this territory has one of the comparison icons
      if (stackComparisonIcons.includes(t.iconType as MapIcon)) {
        if (t.owner === 'Warden') {
          wardenCount++;
        } else if (t.owner === 'Colonial') {
          colonialCount++;
        }
      }
    }

    // If there's an imbalance (one team has more), highlight all territories with those icons
    if (wardenCount > 0 || colonialCount > 0) {
      if (wardenCount !== colonialCount) {
        // Highlight all territories in this region that have the comparison icons
        for (const t of regionTerritories) {
          if (stackComparisonIcons.includes(t.iconType as MapIcon)) {
            threatened.add(t.id);
          }
        }
      }
    }
  }

  return threatened;
}
