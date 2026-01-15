import { getServiceClient } from "../_shared/supabaseClient.ts";

// Workspace TypeScript may not have Deno types; declare to satisfy editor.
declare const Deno: any;

// Import types - note: types need to be Deno-compatible
interface LocationTile {
  id: string;
  owner: 'Colonial' | 'Warden' | 'Neutral';
  x: number;
  y: number;
  region: string;
  iconType: number;
  flags: number;
}

interface WarReport {
  region: string;
  version: number;
  dayOfWar: number;
  totalEnlistments: number;
  wardenCasualties: number;
  colonialCasualties: number;
}

interface Snapshot {
  id: string;
  created_at: string;
  war_number: number;
  day_number: number;
  territories: LocationTile[];
  reports?: WarReport[];
}

const supabase = getServiceClient();

// Major map flags: bases, relics, keeps, forts
const MAJOR_MAP_FLAGS = [56, 57, 58, 45, 27, 29];

interface AggregationInput {
  warNumber: number;
  dateUtc: string; // ISO date string (e.g., "2026-01-09")
}

Deno.serve(async (req: Request) => {
  try {
    // Allow manual trigger or scheduled invocation
    const payload = await req.json().catch(() => ({}));
    let warNumber = payload.warNumber;
    const dateUtc = payload.dateUtc || new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    if (!warNumber) {
        console.log(`[aggregate-hourly-summaries] No warNumber provided, getting latest war.`);
        // Fetch all wars
        const { data: wars, error: warsError } = await supabase
        .from("wars")
        .select("warNumber")
        .order("warNumber", { ascending: false })
        .limit(1);

        if (warsError) {
            throw new Error(`Failed to fetch wars: ${warsError.message}`);
        }
        console.log(`[aggregate-hourly-summaries] Found latest war: ${wars[0]?.warNumber}   `);
        warNumber = wars[0]?.warNumber;
    }

    if (!warNumber) {
      console.log(`[aggregate-hourly-summaries] No warNumber provided. Exiting.`);
      return new Response(JSON.stringify({ message: `No warNumber provided (${warNumber})`, skipped: true }), {
        status: 500,
      });
    }
      
    // Fetch all snapshots for the target date
    const dayStart = new Date(`${dateUtc}T00:00:00Z`).toISOString();
    const dayEnd = new Date(`${dateUtc}T23:59:59Z`).toISOString();
    
    console.log(`[aggregate-hourly-summaries] Starting aggregation for war ${warNumber}, between ${dayStart} and ${dayEnd}`);
      
    const { data: snapshots, error: snapshotError } = await supabase
      .from("snapshots")
      .select("*")
      .eq("war_number", warNumber)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .order("created_at", { ascending: true });

    if (snapshotError) {
      throw new Error(`Failed to fetch snapshots: ${snapshotError.message}`);
    }

    if (!snapshots || snapshots.length === 0) {
      console.log(`[aggregate-hourly-summaries] No snapshots found for ${dateUtc}. Skipping.`);
      return new Response(JSON.stringify({ message: "No snapshots found", skipped: true }), {
        status: 200,
      });
    }

    console.log(`[aggregate-hourly-summaries] Fetched ${snapshots.length} snapshots`);

    // Group snapshots by hour
    const hourlyBuckets = groupSnapshotsByHour(snapshots as Snapshot[]);
    console.log(`[aggregate-hourly-summaries] Grouped into ${hourlyBuckets.length} hourly buckets`);

    // Aggregate territory ownership
    const territoryRows = await aggregateTerritoryOwnership(hourlyBuckets, warNumber);
    console.log(`[aggregate-hourly-summaries] Generated ${territoryRows.length} territory ownership rows`);

    // Aggregate casualty data
    const casualtyRows = await aggregateCasualties(hourlyBuckets, warNumber);
    console.log(`[aggregate-hourly-summaries] Generated ${casualtyRows.length} casualty rows`);

    // Upsert all rows
    await upsertTerritoryOwnership(territoryRows);
    await upsertCasualties(casualtyRows);

    console.log(`[aggregate-hourly-summaries] Aggregation complete`);
    return new Response(
      JSON.stringify({
        message: "Aggregation completed successfully",
        war_number: warNumber,
        date: dateUtc,
        territory_rows_upserted: territoryRows.length,
        casualty_rows_upserted: casualtyRows.length,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("[aggregate-hourly-summaries] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});

interface HourlyBucket {
  hour: string; // ISO hour boundary (e.g., "2026-01-09T14:00:00Z")
  hourEnd: string; // Hour + 1 hour
  snapshots: Snapshot[];
}

function groupSnapshotsByHour(snapshots: Snapshot[]): HourlyBucket[] {
  const buckets = new Map<string, Snapshot[]>();

  for (const snapshot of snapshots) {
    const date = new Date(snapshot.created_at);
    const hour = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours()));
    const hourKey = hour.toISOString();

    if (!buckets.has(hourKey)) {
      buckets.set(hourKey, []);
    }
    buckets.get(hourKey)!.push(snapshot);
  }

  return Array.from(buckets.entries()).map(([hour, snapshots]) => {
    const hourEnd = new Date(new Date(hour).getTime() + 60 * 60 * 1000).toISOString();
    return { hour, hourEnd, snapshots };
  });
}

interface TerritoryOwnershipRow {
  war_number: number;
  territory_id: string;
  hex_region: string;
  hour_start: string;
  hour_end: string;
  owner: string;
  owner_changed_during_hour: boolean;
  icon_type: number | null;
}

async function aggregateTerritoryOwnership(
  buckets: HourlyBucket[],
  warNumber: number
): Promise<TerritoryOwnershipRow[]> {
  const rows: TerritoryOwnershipRow[] = [];

  // Track previous hour's ownership for change detection
  let previousHourTerritories: Map<string, LocationTile> | null = null;

  for (const bucket of buckets) {
    // Use the last snapshot of the hour as ground truth (hour-level detection; earlier snapshots in the same hour are superseded)
    const snapshot = bucket.snapshots[bucket.snapshots.length - 1];
    const territories = snapshot.territories || [];

    // Map of territory ID to tile for this hour
    const currentHourTerritories = new Map<string, LocationTile>();

    for (const tile of territories) {
      // Only track major map flags
      if (!MAJOR_MAP_FLAGS.includes(tile.iconType)) continue;
      // Skip neutral territories
      if (tile.owner === "Neutral") continue;

      currentHourTerritories.set(tile.id, tile);

      // Detect if ownership changed
      const prevTile = previousHourTerritories?.get(tile.id);
      const ownerChanged = prevTile && prevTile.owner !== tile.owner ? true : false;

      rows.push({
        war_number: warNumber,
        territory_id: tile.id,
        hex_region: tile.region,
        hour_start: bucket.hour,
        hour_end: bucket.hourEnd,
        owner: tile.owner,
        owner_changed_during_hour: ownerChanged,
        icon_type: tile.iconType,
      });
    }

    previousHourTerritories = currentHourTerritories;
  }

  return rows;
}

interface CasualtyRow {
  war_number: number;
  region: string;
  hour_start: string;
  hour_end: string;
  warden_casualties_delta: number;
  colonial_casualties_delta: number;
  warden_casualties_total: number;
  colonial_casualties_total: number;
  warden_rate_per_hour: number;
  colonial_rate_per_hour: number;
  day_of_war: number | null;
}

async function aggregateCasualties(buckets: HourlyBucket[], warNumber: number): Promise<CasualtyRow[]> {
  const rows: CasualtyRow[] = [];

  // Track previous hour's casualty counts for deltas
  let previousHourReports: Map<string, WarReport> | null = null;

  for (const bucket of buckets) {
    // Use the last snapshot of the hour
    const snapshot = bucket.snapshots[bucket.snapshots.length - 1];
    const reports = snapshot.reports || [];

    const currentHourReports = new Map<string, WarReport>();

    for (const report of reports) {
      currentHourReports.set(report.region, report);

      const prevReport = previousHourReports?.get(report.region);
      // First-hour delta is 0 (no prior baseline); subsequent hours compute current - previous
      const wardenDelta = prevReport ? report.wardenCasualties - prevReport.wardenCasualties : 0;
      const colonialDelta = prevReport ? report.colonialCasualties - prevReport.colonialCasualties : 0;

      // Rate is delta / hour duration (always 1 hour)
      const wardenRate = wardenDelta;
      const colonialRate = colonialDelta;

      rows.push({
        war_number: warNumber,
        region: report.region,
        hour_start: bucket.hour,
        hour_end: bucket.hourEnd,
        warden_casualties_delta: wardenDelta,
        colonial_casualties_delta: colonialDelta,
        warden_casualties_total: report.wardenCasualties,
        colonial_casualties_total: report.colonialCasualties,
        warden_rate_per_hour: wardenRate,
        colonial_rate_per_hour: colonialRate,
        day_of_war: report.dayOfWar || null,
      });
    }

    previousHourReports = currentHourReports;
  }

  return rows;
}

async function upsertTerritoryOwnership(rows: TerritoryOwnershipRow[]) {
  if (rows.length === 0) return;

  // Upsert in batches to avoid payload size issues
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("territory_ownership_hourly").upsert(batch, {
      onConflict: "territory_id,hour_start",
    });

    if (error) {
      throw new Error(`Failed to upsert territory ownership: ${error.message}`);
    }
  }
}

async function upsertCasualties(rows: CasualtyRow[]) {
  if (rows.length === 0) return;

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("casualty_hourly").upsert(batch, {
      onConflict: "region,hour_start",
    });

    if (error) {
      throw new Error(`Failed to upsert casualty data: ${error.message}`);
    }
  }
}
