/**
 * Threats highlighting logic for the unified report system
 * Determines which territories should be highlighted based on stack comparison
 */

import type { LocationTile } from '../types/war';
import type { MapIcon } from '../data/map-icons';
import { getTown } from '../data/towns';
import { projectRegionPoint } from './projection';

/**
 * Computes which territories are "threatened" based on stack comparison
 * A territory is threatened if it contains icons from stackComparisonIcons
 * and one team has more of those icons than the other in that territory.
 * 
 * @param territories - All territory tiles from snapshot
 * @param stackComparisonIcons - Icon types to compare (e.g., [MapIcon.Storm_Cannon])
 * @returns Set of territory IDs that should be highlighted
 */
export function MapIconTerritories(
  territories: LocationTile[] | undefined,
  majorLabelsByMap: Map<string, { lat: number; lng: number; text: string }[]>,
  stackComparisonIcons: MapIcon[]
): Set<string> {

  function nearestMajorLabel(region: string, lat: number, lng: number): string | null {
    const arr = majorLabelsByMap.get(region);
    if (!arr || arr.length === 0) return null;
    let bestIdx = -1;
    let bestD = Infinity;
    for (let i = 0; i < arr.length; i++) {
      const lab = arr[i];
      const dx = lab.lat - lat;
      const dy = lab.lng - lng;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    return bestIdx >= 0 ? arr[bestIdx].text : null;
  }
  
  
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
        // Project territory coordinates to match majorLabelsByMap coordinate system
        const projected = projectRegionPoint(region, t.x, t.y);
        if (!projected) continue; // Skip if projection fails
        
        const [lat, lng] = projected;
        // Find the nearest major label (for territory ID)
        const nearestLabel = nearestMajorLabel(region, lat, lng);
        // Get the major town by that label
        const territory = nearestLabel ? getTown(nearestLabel, true) : null;
        // If we haven't already added this territory for highlighting, do so
        if(territory && territory.id && !threatened.has(territory.id)) {
          threatened.add(territory.id);
        }

        if (t.owner === 'Warden') {
          wardenCount++;
        } else if (t.owner === 'Colonial') {
          colonialCount++;
        }
      }
    }
  }

  return threatened;
}
