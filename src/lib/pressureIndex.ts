/**
 * Frontline Pressure Index (FPI) computation
 *
 * Pure computation — no Supabase calls, no React. Exports computeFPIScores().
 *
 * WW2-informed metrics:
 *   TCI  — Territorial Churn Index: ownership changes per 48h (sector instability)
 *   HTI⁻¹ — Inverse Hold Time: shorter holds = weaker defense
 *   CII  — Casualty Intensity Index: avg combined rate over last 6h
 *   CAI  — Casualty Acceleration Index: 3h vs prior 3h rate delta
 *
 * Composite: FPI = percentile_rank( 0.35*TCI + 0.25*HTI⁻¹ + 0.25*CII + 0.15*CAI )
 */

export type PressureDirection = 'colonial' | 'warden' | 'disputed' | 'stable';

export interface LifecycleRow {
  territory_id: string;
  hex_region: string;
  changed_at: string;
  new_owner: string;
  previous_owner: string;
}

export interface CasualtyRow {
  region: string;
  hour_start: string;
  warden_rate_per_hour: number;
  colonial_rate_per_hour: number;
}

export interface FPIScore {
  /** Composite pressure index 0.0 (stable) → 1.0 (critical) */
  fpi: number;
  /** Which team is applying pressure (or if disputed / stable) */
  pressureDirection: PressureDirection;
  /** Raw ownership change count over 48h */
  tci: number;
  /** Mean hold duration in hours */
  meanHoldHours: number;
  /** Estimated hours until next capture (null if insufficient data) */
  hoursUntilEstimatedCapture: number | null;
  /** Estimated combined casualty cost to next capture (null if insufficient data) */
  estimatedCasualtyCost: number | null;
  /** Normalized casualty intensity 0–1 */
  cii: number;
  /** Normalized casualty acceleration 0–1 (0.5 = steady, 1.0 = rapidly rising) */
  cai: number;
  /** Hex region name this territory belongs to */
  hexRegion: string;
}

function avgRate(rows: CasualtyRow[]): number {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, r) => sum + r.warden_rate_per_hour + r.colonial_rate_per_hour, 0) / rows.length;
}

/**
 * Compute FPI scores for all territories given lifecycle and casualty data.
 *
 * @param lifecycleRows - territory_lifecycle rows for last 48h
 * @param casualtyRows  - casualty_hourly rows for last 12h
 * @returns Record keyed by territory_id
 */
export function computeFPIScores(
  lifecycleRows: LifecycleRow[],
  casualtyRows: CasualtyRow[],
): Record<string, FPIScore> {
  const now = Date.now();
  const H = 60 * 60 * 1000;
  const twentyFourHoursAgo = now - 24 * H;
  const sixHoursAgo = now - 6 * H;
  const threeHoursAgo = now - 3 * H;

  // ── Group lifecycle rows by territory ──────────────────────────────────────
  const byTerritory = new Map<string, LifecycleRow[]>();
  const hexByTerritory = new Map<string, string>();

  for (const row of lifecycleRows) {
    let arr = byTerritory.get(row.territory_id);
    if (!arr) { arr = []; byTerritory.set(row.territory_id, arr); }
    arr.push(row);
    hexByTerritory.set(row.territory_id, row.hex_region);
  }

  // Sort each territory's events newest-first
  for (const events of byTerritory.values()) {
    events.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  }

  // ── Group casualty rows by region ──────────────────────────────────────────
  const casualtyByRegion = new Map<string, CasualtyRow[]>();
  for (const row of casualtyRows) {
    let arr = casualtyByRegion.get(row.region);
    if (!arr) { arr = []; casualtyByRegion.set(row.region, arr); }
    arr.push(row);
  }

  if (byTerritory.size === 0) return {};

  // ── Compute raw metrics per territory ─────────────────────────────────────
  interface RawEntry {
    territoryId: string;
    hexRegion: string;
    tci: number;
    htiInverse: number;
    meanHoldHours: number;
    rawCII: number;    // un-normalised combined casualty rate
    rawCAI: number;    // ratio of change (-Inf..+Inf)
    hoursUntilCapture: number | null;
    recentEvents: LifecycleRow[];
  }

  const rawEntries: RawEntry[] = [];

  for (const [territoryId, events] of byTerritory.entries()) {
    const hexRegion = hexByTerritory.get(territoryId) ?? '';

    // TCI: count of changes in the 48h window (all rows are already within window)
    const tci = events.length;

    // HTI⁻¹: mean hold duration from consecutive events
    let meanHoldHours = 0;
    if (events.length >= 2) {
      let totalMs = 0;
      for (let i = 0; i < events.length - 1; i++) {
        totalMs += new Date(events[i].changed_at).getTime() - new Date(events[i + 1].changed_at).getTime();
      }
      meanHoldHours = totalMs / (events.length - 1) / H;
    } else if (events.length === 1) {
      // Only one capture — hold duration = time held so far
      meanHoldHours = (now - new Date(events[0].changed_at).getTime()) / H;
    }

    const htiInverse = meanHoldHours > 0 ? 1 / (meanHoldHours + 1) : 0;

    // CII: avg combined rate over last 6h for this hex
    const regionRows = casualtyByRegion.get(hexRegion) ?? [];
    const last6h = regionRows.filter(r => new Date(r.hour_start).getTime() >= sixHoursAgo);
    const rawCII = avgRate(last6h);

    // CAI: last 3h vs prior 3h
    const last3h = regionRows.filter(r => new Date(r.hour_start).getTime() >= threeHoursAgo);
    const prior3h = regionRows.filter(r => {
      const t = new Date(r.hour_start).getTime();
      return t >= sixHoursAgo && t < threeHoursAgo;
    });
    const avgL = avgRate(last3h);
    const avgP = avgRate(prior3h);
    const rawCAI = avgP > 0 ? (avgL - avgP) / avgP : (avgL > 0 ? 1 : 0);

    // Time since last capture
    const hoursSinceLast = events.length > 0 ? (now - new Date(events[0].changed_at).getTime()) / H : null;
    const hoursUntilCapture = meanHoldHours > 0 && hoursSinceLast !== null
      ? Math.max(0, meanHoldHours - hoursSinceLast)
      : null;

    // Events in last 24h (for pressure direction)
    const recentEvents = events.filter(e => new Date(e.changed_at).getTime() >= twentyFourHoursAgo);

    rawEntries.push({ territoryId, hexRegion, tci, htiInverse, meanHoldHours, rawCII, rawCAI, hoursUntilCapture, recentEvents });
  }

  // ── Normalise metrics ─────────────────────────────────────────────────────
  const maxTCI     = Math.max(1, ...rawEntries.map(e => e.tci));
  const maxHTI     = Math.max(0.001, ...rawEntries.map(e => e.htiInverse));
  const maxCII     = Math.max(1, ...rawEntries.map(e => e.rawCII));
  const maxCAIAbs  = Math.max(1, ...rawEntries.map(e => Math.abs(e.rawCAI)));

  // ── Compute composite raw score ───────────────────────────────────────────
  const withScore = rawEntries.map(e => {
    const normTCI = e.tci / maxTCI;
    const normHTI = e.htiInverse / maxHTI;
    const normCII = e.rawCII / maxCII;
    // Map rawCAI to [0, 1]: 0.5 = steady, 1.0 = accelerating strongly
    const normCAI = Math.min(1, Math.max(0, (e.rawCAI + maxCAIAbs) / (2 * maxCAIAbs)));

    const rawScore = 0.35 * normTCI + 0.25 * normHTI + 0.25 * normCII + 0.15 * normCAI;
    const estimatedCasualtyCost = e.rawCII > 0 && e.meanHoldHours > 0
      ? Math.round(e.rawCII * e.meanHoldHours)
      : null;

    return { ...e, normCII, normCAI, rawScore, estimatedCasualtyCost };
  });

  // ── Percentile rank → FPI [0, 1] ─────────────────────────────────────────
  const sorted = [...withScore].sort((a, b) => a.rawScore - b.rawScore);
  const n = sorted.length;
  const rankMap = new Map<string, number>();
  sorted.forEach((s, i) => rankMap.set(s.territoryId, n > 1 ? i / (n - 1) : 0.5));

  // ── Determine pressure direction ──────────────────────────────────────────
  const result: Record<string, FPIScore> = {};

  for (const s of withScore) {
    const fpi = rankMap.get(s.territoryId) ?? 0;
    const re = s.recentEvents;

    let pressureDirection: PressureDirection;
    if (re.length === 0) {
      pressureDirection = 'stable';
    } else if (re.length === 1) {
      const owner = re[0].new_owner;
      if (owner === 'Colonial' || owner === 'Colonials') pressureDirection = 'colonial';
      else if (owner === 'Warden' || owner === 'Wardens') pressureDirection = 'warden';
      else pressureDirection = 'stable';
    } else {
      pressureDirection = 'disputed';
    }

    result[s.territoryId] = {
      fpi,
      pressureDirection,
      tci: s.tci,
      meanHoldHours: s.meanHoldHours,
      hoursUntilEstimatedCapture: s.hoursUntilCapture,
      estimatedCasualtyCost: s.estimatedCasualtyCost,
      cii: s.normCII,
      cai: s.normCAI,
      hexRegion: s.hexRegion,
    };
  }

  return result;
}
