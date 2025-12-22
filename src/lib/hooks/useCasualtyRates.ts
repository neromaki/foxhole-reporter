import { useMemo } from 'react';
import { WarReport } from '../../types/war';

export type CasualtyRate = { warden: number; colonial: number; source: 'delta' | 'avg' };

/**
 * Compute casualty rates per region from current and previous reports.
 * If previous reports exist and time delta > 0, computes delta rates.
 * Otherwise, computes averages over war duration.
 */
function computeRatesMap(
  currentReports: WarReport[] | undefined,
  previousReports: WarReport[] | undefined,
  currentTimestamp: number | null | undefined,
  previousTimestamp: number | null | undefined
): Map<string, CasualtyRate> {
  const rates = new Map<string, CasualtyRate>();
  if (!currentReports || currentReports.length === 0) return rates;

  const prevByRegion = new Map<string, WarReport>();
  (previousReports ?? []).forEach((r) => prevByRegion.set(r.region, r));

  const dtHours = currentTimestamp != null && previousTimestamp != null
    ? Math.max((currentTimestamp - previousTimestamp) / 3_600_000, 0)
    : null;

  currentReports.forEach((curr) => {
    const prev = prevByRegion.get(curr.region);
    if (prev && dtHours && dtHours > 0) {
      const warden = Math.max(0, (curr.wardenCasualties - prev.wardenCasualties) / dtHours);
      const colonial = Math.max(0, (curr.colonialCasualties - prev.colonialCasualties) / dtHours);
      rates.set(curr.region, { warden, colonial, source: 'delta' });
    } else {
      const hours = curr.dayOfWar * 24;
      const warden = hours > 0 ? curr.wardenCasualties / hours : 0;
      const colonial = hours > 0 ? curr.colonialCasualties / hours : 0;
      rates.set(curr.region, { warden, colonial, source: 'avg' });
    }
  });

  return rates;
}

/**
 * Custom hook to compute and access casualty rates by hex region.
 * Pre-calculates all rates on the first load, then memoizes for efficient lookups.
 * 
 * @param currentReports - Array of current war reports (one per map/hex)
 * @param previousReports - Array of previous war reports for delta calculation
 * @param currentTimestamp - Timestamp of current reports
 * @param previousTimestamp - Timestamp of previous reports
 * @returns Object with:
 *   - `getRate(region)`: Get casualty rate for a specific hex region
 *   - `rates`: Full Map of all rates (for iteration)
 */
export function useCasualtyRates(
  currentReports: WarReport[] | undefined,
  previousReports: WarReport[] | undefined,
  currentTimestamp: number | null | undefined,
  previousTimestamp: number | null | undefined
) {
  const rates = useMemo(
    () => computeRatesMap(currentReports, previousReports, currentTimestamp, previousTimestamp),
    [currentReports, previousReports, currentTimestamp, previousTimestamp]
  );

  return useMemo(
    () => ({
      /**
       * Get casualty rate for a specific hex region.
       * Returns undefined if no data available for that region.
       */
      getRate: (region: string): CasualtyRate | undefined => rates.get(region),
      
      /**
       * Full map of all casualty rates keyed by region.
       */
      rates,
    }),
    [rates]
  );
}
