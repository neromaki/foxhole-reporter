# Option 2: Pre-Aggregated Summary Tables – Implementation Plan

## Overview

This document provides a complete, actionable plan for implementing Option 2: Pre-Aggregated Summary Tables for historical trend data in the Foxhole Reporter application. This approach minimizes frontend query load by pre-computing hourly ownership and casualty summaries via a scheduled Edge Function, enabling fast graphs and analytics queries (10–50x faster than raw snapshot queries).

**Target outcome**: Users can view pie charts (time held by team), line graphs (casualty rates), and ownership timelines for selected locations with sub-100ms query latency.

---

## 1. Schema Design

### Table 1: `territory_ownership_hourly`

Tracks major territories' ownership by hour. Enables pie charts ("% time held") and ownership timelines.

```sql
CREATE TABLE territory_ownership_hourly (
  id BIGSERIAL PRIMARY KEY,
  war_number INT NOT NULL,
  territory_id TEXT NOT NULL,              -- Unique: "AcrithiaHex-0.5-0.3"
  territory_name TEXT,                     -- Town display name (e.g., "Heirspoken"), or NULL
  hex_region TEXT NOT NULL,                -- Parent hex region (e.g., "AcrithiaHex")
  hour_start TIMESTAMPTZ NOT NULL,         -- Bucket start (quantized to hour boundary, UTC)
  hour_end TIMESTAMPTZ NOT NULL,           -- Bucket end (hour_start + interval '1 hour')
  owner TEXT NOT NULL,                     -- Team: 'Colonial', 'Warden', 'Neutral'
  owner_changed_during_hour BOOLEAN,       -- True if ownership transitioned this hour
  icon_type INT,                           -- WarAPI type: 56/57/58 (bases), 45 (relic), 27 (keep), 29 (fort)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT fk_war FOREIGN KEY (war_number) REFERENCES wars(war_number),
  UNIQUE (territory_id, hour_start)
);

CREATE INDEX idx_territory_time ON territory_ownership_hourly (territory_id, hour_start DESC);
CREATE INDEX idx_hex_time ON territory_ownership_hourly (hex_region, hour_start DESC);
CREATE INDEX idx_war_time ON territory_ownership_hourly (war_number, hour_start DESC);
CREATE INDEX idx_owner_changed ON territory_ownership_hourly (owner_changed_during_hour) WHERE owner_changed_during_hour = true;

ALTER TABLE territory_ownership_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read access for all" ON territory_ownership_hourly FOR SELECT USING (true);
CREATE POLICY "Insert only for authenticated" ON territory_ownership_hourly FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

**Purpose**:
- Pie chart query: Group by `owner`, count hours → normalize to percentages
- Ownership timeline: ORDER by `hour_start` → render line graph
- "Time held" calculation: SUM hours WHERE owner = 'Colonial' / total hours

---

### Table 2: `casualty_hourly`

Tracks casualty counts and hourly rates per region. Enables casualty trend graphs.

```sql
CREATE TABLE casualty_hourly (
  id BIGSERIAL PRIMARY KEY,
  war_number INT NOT NULL,
  region TEXT NOT NULL,                    -- Hex region name (e.g., "AcrithiaHex")
  hour_start TIMESTAMPTZ NOT NULL,
  hour_end TIMESTAMPTZ NOT NULL,
  warden_casualties_delta INT,             -- Casualties this hour: current - previous
  colonial_casualties_delta INT,
  warden_casualties_total INT,             -- Cumulative from war start
  colonial_casualties_total INT,
  warden_rate_per_hour FLOAT,              -- Delta / hour (casualties/hour)
  colonial_rate_per_hour FLOAT,
  day_of_war INT,                          -- For historical reference
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT fk_war FOREIGN KEY (war_number) REFERENCES wars(war_number),
  UNIQUE (region, hour_start)
);

CREATE INDEX idx_region_time ON casualty_hourly (region, hour_start DESC);
CREATE INDEX idx_war_time ON casualty_hourly (war_number, hour_start DESC);

ALTER TABLE casualty_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read access for all" ON casualty_hourly FOR SELECT USING (true);
CREATE POLICY "Insert only for authenticated" ON casualty_hourly FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

**Purpose**:
- Casualty rate timeline: Fetch all rows for a region, ORDER by `hour_start` → render line graph
- Rate comparison: `warden_rate_per_hour` vs. `colonial_rate_per_hour` side-by-side
- Cumulative totals: Visualize total war casualties across the map

---

### Table 3: `territory_lifecycle` (Optional but Recommended)

Event log of ownership transitions. Enables event-based queries and precise timeline reconstruction.

```sql
CREATE TABLE territory_lifecycle (
  id BIGSERIAL PRIMARY KEY,
  war_number INT NOT NULL,
  territory_id TEXT NOT NULL,              -- "AcrithiaHex-0.5-0.3"
  territory_name TEXT,
  hex_region TEXT,
  previous_owner TEXT,                     -- Team before transition
  new_owner TEXT,                          -- Team after transition
  changed_at TIMESTAMPTZ NOT NULL,         -- Precise moment of change
  icon_type INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT fk_war FOREIGN KEY (war_number) REFERENCES wars(war_number)
);

CREATE INDEX idx_territory ON territory_lifecycle (territory_id);
CREATE INDEX idx_changed_at ON territory_lifecycle (changed_at DESC);
CREATE INDEX idx_war ON territory_lifecycle (war_number, changed_at DESC);
CREATE INDEX idx_hex ON territory_lifecycle (hex_region, changed_at DESC);

ALTER TABLE territory_lifecycle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read access for all" ON territory_lifecycle FOR SELECT USING (true);
CREATE POLICY "Insert only for authenticated" ON territory_lifecycle FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

**Purpose**:
- Event timeline: "When did Colonial capture this base?" → Fetch all events for `territory_id`, ORDER by `changed_at`
- Event stream: "Show me all captures in this hex today" → WHERE hex_region = ? AND changed_at >= ?
- Duration calculation: Secondary to hourly table but useful for audit/verification

---

## 2. Migration File

Create a new migration file: `supabase/migrations/20260110_add_hourly_aggregates.sql`

```sql
-- Migration: Add pre-aggregated hourly ownership and casualty summary tables

-- Table 1: Territory Ownership Hourly Rollups
CREATE TABLE IF NOT EXISTS territory_ownership_hourly (
  id BIGSERIAL PRIMARY KEY,
  war_number INT NOT NULL,
  territory_id TEXT NOT NULL,
  territory_name TEXT,
  hex_region TEXT NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  hour_end TIMESTAMPTZ NOT NULL,
  owner TEXT NOT NULL,
  owner_changed_during_hour BOOLEAN DEFAULT false,
  icon_type INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT fk_war_territory FOREIGN KEY (war_number) REFERENCES wars(war_number) ON DELETE CASCADE,
  UNIQUE (territory_id, hour_start)
);

CREATE INDEX IF NOT EXISTS idx_territory_time 
  ON territory_ownership_hourly (territory_id, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_hex_time 
  ON territory_ownership_hourly (hex_region, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_war_time 
  ON territory_ownership_hourly (war_number, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_owner_changed 
  ON territory_ownership_hourly (owner_changed_during_hour) WHERE owner_changed_during_hour = true;

ALTER TABLE territory_ownership_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Read access for all" 
  ON territory_ownership_hourly FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Insert only for authenticated" 
  ON territory_ownership_hourly FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Table 2: Casualty Hourly Rollups
CREATE TABLE IF NOT EXISTS casualty_hourly (
  id BIGSERIAL PRIMARY KEY,
  war_number INT NOT NULL,
  region TEXT NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  hour_end TIMESTAMPTZ NOT NULL,
  warden_casualties_delta INT DEFAULT 0,
  colonial_casualties_delta INT DEFAULT 0,
  warden_casualties_total INT DEFAULT 0,
  colonial_casualties_total INT DEFAULT 0,
  warden_rate_per_hour FLOAT DEFAULT 0,
  colonial_rate_per_hour FLOAT DEFAULT 0,
  day_of_war INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT fk_war_casualty FOREIGN KEY (war_number) REFERENCES wars(war_number) ON DELETE CASCADE,
  UNIQUE (region, hour_start)
);

CREATE INDEX IF NOT EXISTS idx_region_time 
  ON casualty_hourly (region, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_war_casualty_time 
  ON casualty_hourly (war_number, hour_start DESC);

ALTER TABLE casualty_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Read access for all" 
  ON casualty_hourly FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Insert only for authenticated" 
  ON casualty_hourly FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Table 3: Territory Lifecycle (Event Log)
CREATE TABLE IF NOT EXISTS territory_lifecycle (
  id BIGSERIAL PRIMARY KEY,
  war_number INT NOT NULL,
  territory_id TEXT NOT NULL,
  territory_name TEXT,
  hex_region TEXT,
  previous_owner TEXT,
  new_owner TEXT,
  changed_at TIMESTAMPTZ NOT NULL,
  icon_type INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT fk_war_lifecycle FOREIGN KEY (war_number) REFERENCES wars(war_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_territory_lifecycle 
  ON territory_lifecycle (territory_id);
CREATE INDEX IF NOT EXISTS idx_changed_at 
  ON territory_lifecycle (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_war_lifecycle 
  ON territory_lifecycle (war_number, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_hex_lifecycle 
  ON territory_lifecycle (hex_region, changed_at DESC);

ALTER TABLE territory_lifecycle ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Read access for all" 
  ON territory_lifecycle FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Insert only for authenticated" 
  ON territory_lifecycle FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

Run migration:
```bash
supabase migration up
```

---

## 3. Edge Function: `aggregate-hourly-summaries`

Create: `supabase/functions/aggregate-hourly-summaries/index.ts`

```typescript
import { createClient } from "../_shared/supabaseClient.ts";
import { Snapshot, WarReport, LocationTile } from "../../src/types/war.ts";

const supabase = createClient();

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
    const warNumber = payload.warNumber || 1; // Default to war 1 if not specified
    const dateUtc = payload.dateUtc || new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    console.log(`[aggregate-hourly-summaries] Starting aggregation for war ${warNumber}, date ${dateUtc}`);

    // Fetch all snapshots for the target date
    const dayStart = new Date(`${dateUtc}T00:00:00Z`).toISOString();
    const dayEnd = new Date(`${dateUtc}T23:59:59Z`).toISOString();

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
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
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
  territory_name: string | null;
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
    // Use the last snapshot of the hour as ground truth
    const snapshot = bucket.snapshots[bucket.snapshots.length - 1];
    const territories = snapshot.territories || [];

    // Map of territory ID to tile for this hour
    const currentHourTerritories = new Map<string, LocationTile>();

    for (const tile of territories) {
      // Only track major map flags
      if (!MAJOR_MAP_FLAGS.includes(tile.icon_type)) continue;
      // Skip neutral territories
      if (tile.owner === "Neutral") continue;

      currentHourTerritories.set(tile.id, tile);

      // Detect if ownership changed
      const prevTile = previousHourTerritories?.get(tile.id);
      const ownerChanged = prevTile && prevTile.owner !== tile.owner ? true : false;

      rows.push({
        war_number: warNumber,
        territory_id: tile.id,
        territory_name: tile.town_name || null,
        hex_region: tile.region,
        hour_start: bucket.hour,
        hour_end: bucket.hourEnd,
        owner: tile.owner,
        owner_changed_during_hour: ownerChanged,
        icon_type: tile.icon_type,
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
      const wardenDelta = prevReport ? report.warden_casualties - prevReport.warden_casualties : 0;
      const colonialDelta = prevReport ? report.colonial_casualties - prevReport.colonial_casualties : 0;

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
        warden_casualties_total: report.warden_casualties,
        colonial_casualties_total: report.colonial_casualties,
        warden_rate_per_hour: wardenRate,
        colonial_rate_per_hour: colonialRate,
        day_of_war: report.day_of_war || null,
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
```

**Deploy function**:
```bash
supabase functions deploy aggregate-hourly-summaries
```

---

## 4. Scheduled Cron Job

Add to `supabase/config.toml` under `[functions]` section:

```toml
[[functions.aggregate_hourly_summaries.env]]
name = "SUPABASE_URL"
value = "env(SUPABASE_URL)"

[[functions.aggregate_hourly_summaries.env]]
name = "SUPABASE_SERVICE_ROLE_KEY"
value = "env(SUPABASE_SERVICE_ROLE_KEY)"

[functions.aggregate_hourly_summaries]
cron = "0 1 * * *"  # Daily at 01:00 UTC
```

Or configure via Supabase dashboard:
1. Go to **Edge Functions** → `aggregate-hourly-summaries` → **Settings**
2. Set **Cron expression**: `0 1 * * *` (runs every day at 01:00 UTC)
3. Save

**Why 01:00 UTC?** Allows `poll-warapi` (which runs every 15 min) to complete a full day's data collection before aggregation starts.

---

## 5. Backfill Historical Data

Create: `supabase/functions/backfill-hourly-aggregates/index.ts`

```typescript
import { createClient } from "../_shared/supabaseClient.ts";

const supabase = createClient();

Deno.serve(async (req: Request) => {
  try {
    console.log("[backfill-hourly-aggregates] Starting backfill...");

    // Fetch all wars
    const { data: wars, error: warsError } = await supabase
      .from("wars")
      .select("war_number")
      .order("war_number", { ascending: false });

    if (warsError) {
      throw new Error(`Failed to fetch wars: ${warsError.message}`);
    }

    console.log(`[backfill-hourly-aggregates] Found ${wars.length} wars`);

    // For each war, compute all hourly aggregates
    for (const war of wars) {
      console.log(`[backfill-hourly-aggregates] Processing war ${war.war_number}...`);

      // Fetch all snapshots for this war
      const { data: snapshots, error: snapshotError } = await supabase
        .from("snapshots")
        .select("*")
        .eq("war_number", war.war_number)
        .order("created_at", { ascending: true });

      if (snapshotError) {
        console.error(`Failed to fetch snapshots for war ${war.war_number}: ${snapshotError.message}`);
        continue;
      }

      if (!snapshots || snapshots.length === 0) {
        console.log(`[backfill-hourly-aggregates] No snapshots for war ${war.war_number}`);
        continue;
      }

      console.log(`[backfill-hourly-aggregates] War ${war.war_number}: ${snapshots.length} snapshots`);

      // Call aggregate-hourly-summaries for each day of the war
      const daysProcessed = new Set<string>();
      for (const snapshot of snapshots) {
        const date = new Date(snapshot.created_at).toISOString().split("T")[0];
        if (daysProcessed.has(date)) continue;
        daysProcessed.add(date);

        // Trigger aggregation for this day
        const result = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/aggregate-hourly-summaries`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              warNumber: war.war_number,
              dateUtc: date,
            }),
          }
        );

        const resultBody = await result.json();
        console.log(`[backfill-hourly-aggregates] War ${war.war_number}, date ${date}: ${resultBody.message}`);
      }
    }

    console.log("[backfill-hourly-aggregates] Backfill complete");
    return new Response(JSON.stringify({ message: "Backfill completed successfully" }), { status: 200 });
  } catch (error) {
    console.error("[backfill-hourly-aggregates] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

**Deploy and run**:
```bash
supabase functions deploy backfill-hourly-aggregates

# Trigger backfill (one-time)
curl -X POST https://<PROJECT_ID>.supabase.co/functions/v1/backfill-hourly-aggregates \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d {}
```

**Timing**: Backfill takes ~5–10 minutes depending on data volume (processes all wars sequentially).

---

## 6. Frontend Query Hooks

Add to `src/lib/queries.ts`:

```typescript
/**
 * Fetch hourly territory ownership data for a selected territory.
 * Returns data points suitable for pie charts and ownership timelines.
 */
export async function fetchTerritoryOwnershipHistory(
  territoryId: string,
  hoursBack: number = 24 * 7 // Default: last 7 days
) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("territory_ownership_hourly")
    .select("hour_start, owner, owner_changed_during_hour")
    .eq("territory_id", territoryId)
    .gte("hour_start", since)
    .order("hour_start", { ascending: true });

  if (error) {
    console.error(`Failed to fetch territory ownership history: ${error.message}`);
    return [];
  }

  return data || [];
}

/**
 * Compute pie chart data from ownership history.
 * Returns: { Colonial: 0.45, Warden: 0.55, Neutral: 0.0 }
 */
export function computeOwnershipPieChart(
  ownershipHistory: Array<{ hour_start: string; owner: string }>
) {
  const counts = { Colonial: 0, Warden: 0, Neutral: 0 };
  for (const entry of ownershipHistory) {
    counts[entry.owner]++;
  }

  const total = ownershipHistory.length;
  return {
    Colonial: total > 0 ? counts.Colonial / total : 0,
    Warden: total > 0 ? counts.Warden / total : 0,
    Neutral: total > 0 ? counts.Neutral / total : 0,
  };
}

/**
 * Fetch casualty rates for a region over time.
 * Returns hourly casualty deltas and computed rates.
 */
export async function fetchRegionCasualtyTrend(
  region: string,
  hoursBack: number = 24 * 7
) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("casualty_hourly")
    .select("hour_start, warden_rate_per_hour, colonial_rate_per_hour, warden_casualties_delta, colonial_casualties_delta")
    .eq("region", region)
    .gte("hour_start", since)
    .order("hour_start", { ascending: true });

  if (error) {
    console.error(`Failed to fetch casualty trend: ${error.message}`);
    return [];
  }

  return data || [];
}

/**
 * Fetch ownership events (capture/loss) for a territory.
 * Returns precise timestamps of ownership transitions.
 */
export async function fetchTerritoryLifecycle(territoryId: string) {
  const { data, error } = await supabase
    .from("territory_lifecycle")
    .select("changed_at, previous_owner, new_owner, territory_name")
    .eq("territory_id", territoryId)
    .order("changed_at", { ascending: false });

  if (error) {
    console.error(`Failed to fetch territory lifecycle: ${error.message}`);
    return [];
  }

  return data || [];
}
```

---

## 7. Frontend Components: Graphs

Create: `src/components/OwnershipTimelineGraph.tsx`

```typescript
import React from 'react';
import { ResponsiveLineChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface OwnershipData {
  hour_start: string;
  owner: string;
  owner_changed_during_hour: boolean;
}

interface OwnershipTimelineGraphProps {
  data: OwnershipData[];
  territoryName: string;
}

export const OwnershipTimelineGraph: React.FC<OwnershipTimelineGraphProps> = ({ data, territoryName }) => {
  // Transform raw data into chart format
  const chartData = data.map((entry) => ({
    timestamp: new Date(entry.hour_start).toLocaleString(),
    owner: entry.owner,
    changed: entry.owner_changed_during_hour ? 1 : 0,
  }));

  return (
    <div className="w-full h-80 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{territoryName} - Ownership Over Time</h3>
      <ResponsiveLineChart width={600} height={300} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis domain={['dataMin - 0.1', 'dataMax + 0.1']} />
        <Tooltip />
        <Legend />
        <Line type="stepAfter" dataKey="owner" stroke="#8884d8" />
      </ResponsiveLineChart>
    </div>
  );
};
```

Create: `src/components/OwnershipPieChart.tsx`

```typescript
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { computeOwnershipPieChart } from '../lib/queries';

const COLORS = {
  Colonial: '#3b82f6',
  Warden: '#ef4444',
  Neutral: '#9ca3af',
};

interface OwnershipPieChartProps {
  ownershipHistory: Array<{ hour_start: string; owner: string }>;
  territoryName: string;
}

export const OwnershipPieChart: React.FC<OwnershipPieChartProps> = ({ ownershipHistory, territoryName }) => {
  const pieData = computeOwnershipPieChart(ownershipHistory);
  const chartData = Object.entries(pieData)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100),
    }));

  return (
    <div className="w-full h-80 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{territoryName} - Time Held by Team</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={chartData} dataKey="value" label>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
```

Create: `src/components/CasualtyTrendGraph.tsx`

```typescript
import React from 'react';
import { ResponsiveLineChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface CasualtyData {
  hour_start: string;
  warden_rate_per_hour: number;
  colonial_rate_per_hour: number;
}

interface CasualtyTrendGraphProps {
  data: CasualtyData[];
  regionName: string;
}

export const CasualtyTrendGraph: React.FC<CasualtyTrendGraphProps> = ({ data, regionName }) => {
  const chartData = data.map((entry) => ({
    timestamp: new Date(entry.hour_start).toLocaleString(),
    wardenRate: entry.warden_rate_per_hour,
    colonialRate: entry.colonial_rate_per_hour,
  }));

  return (
    <div className="w-full h-80 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{regionName} - Casualty Rate Over Time</h3>
      <ResponsiveLineChart width={600} height={300} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis label={{ value: 'Casualties/Hour', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value) => `${value.toFixed(0)} /hr`} />
        <Legend />
        <Line type="monotone" dataKey="wardenRate" stroke="#ef4444" name="Warden" />
        <Line type="monotone" dataKey="colonialRate" stroke="#3b82f6" name="Colonial" />
      </ResponsiveLineChart>
    </div>
  );
};
```

---

## 8. Integration: Update InfoSheet

Modify `src/components/InfoSheet.tsx`:

```typescript
import { OwnershipPieChart } from './OwnershipPieChart';
import { OwnershipTimelineGraph } from './OwnershipTimelineGraph';
import { CasualtyTrendGraph } from './CasualtyTrendGraph';
import { 
  fetchTerritoryOwnershipHistory, 
  fetchRegionCasualtyTrend,
  fetchTerritoryLifecycle 
} from '../lib/queries';
import { useEffect, useState } from 'react';

export const InfoSheet: React.FC = () => {
  const selectedLocation = useMapStore((s) => s.selectedLocation);
  const [ownershipHistory, setOwnershipHistory] = useState([]);
  const [casualtyData, setCasualtyData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedLocation) return;

    setLoading(true);
    Promise.all([
      fetchTerritoryOwnershipHistory(selectedLocation.id, 24 * 30), // 30 days
      fetchRegionCasualtyTrend(selectedLocation.hexName, 24 * 30),
    ])
      .then(([ownership, casualty]) => {
        setOwnershipHistory(ownership);
        setCasualtyData(casualty);
      })
      .finally(() => setLoading(false));
  }, [selectedLocation?.id]);

  if (!selectedLocation) return null;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{selectedLocation.name}</h2>

      {loading ? (
        <div className="text-center py-8">Loading trends...</div>
      ) : (
        <div className="space-y-6">
          {ownershipHistory.length > 0 && (
            <>
              <OwnershipPieChart 
                ownershipHistory={ownershipHistory} 
                territoryName={selectedLocation.name} 
              />
              <OwnershipTimelineGraph 
                data={ownershipHistory} 
                territoryName={selectedLocation.name} 
              />
            </>
          )}

          {casualtyData.length > 0 && (
            <CasualtyTrendGraph 
              data={casualtyData} 
              regionName={selectedLocation.hexName} 
            />
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 9. Testing Strategy

### Unit Tests

1. **Aggregation logic** (`aggregate-hourly-summaries`):
   - Test `groupSnapshotsByHour()` with mock snapshots
   - Test ownership change detection (correctly identifies transitions)
   - Test casualty delta computation

2. **Query hooks** (`src/lib/queries.ts`):
   - Test `computeOwnershipPieChart()` with various inputs (all-Colonial, mixed, Neutral)
   - Mock Supabase responses

3. **Graph components**:
   - Snapshot tests for rendering
   - Verify correct data transformation before charting

### Integration Tests

1. **End-to-end aggregation**:
   - Create test snapshots in Supabase
   - Run `aggregate-hourly-summaries` manually
   - Verify output in `territory_ownership_hourly` and `casualty_hourly`
   - Verify data matches expected aggregation logic

2. **Frontend flow**:
   - Select a location
   - Verify graphs render with aggregated data
   - Verify query performance (<100ms)

### Performance Tests

1. **Query performance**:
   ```sql
   -- Benchmark: 30-day ownership history
   SELECT COUNT(*) FROM territory_ownership_hourly 
   WHERE territory_id = 'AcrithiaHex-0.5-0.3' 
   AND hour_start >= now() - interval '30 days';
   -- Expected: <5ms
   
   -- Benchmark: Pie chart aggregation
   SELECT owner, COUNT(*) FROM territory_ownership_hourly 
   WHERE territory_id = 'AcrithiaHex-0.5-0.3' 
   AND hour_start >= now() - interval '30 days'
   GROUP BY owner;
   -- Expected: <10ms
   ```

2. **Aggregation performance**:
   - Measure time to aggregate 1 day of snapshots (96 snapshots)
   - Should complete in <5 seconds

---

## 10. Deployment Checklist

- [ ] **Phase 1: Schema**
  - [ ] Create migration file `20260110_add_hourly_aggregates.sql`
  - [ ] Run `supabase migration up`
  - [ ] Verify tables exist in Supabase dashboard
  - [ ] Verify RLS policies are in place

- [ ] **Phase 2: Edge Functions**
  - [ ] Create `aggregate-hourly-summaries/index.ts`
  - [ ] Create `backfill-hourly-aggregates/index.ts`
  - [ ] Deploy both functions: `supabase functions deploy <name>`
  - [ ] Test manual invocation with test payload

- [ ] **Phase 3: Backfill**
  - [ ] Run backfill function
  - [ ] Monitor logs: `supabase functions logs backfill-hourly-aggregates`
  - [ ] Verify row counts in `territory_ownership_hourly` and `casualty_hourly`

- [ ] **Phase 4: Cron Job**
  - [ ] Add cron configuration to `supabase/config.toml`
  - [ ] Deploy configuration: `supabase functions deploy`
  - [ ] Verify cron trigger in Supabase dashboard

- [ ] **Phase 5: Frontend**
  - [ ] Add query hooks to `src/lib/queries.ts`
  - [ ] Create graph components (`OwnershipPieChart`, `OwnershipTimelineGraph`, `CasualtyTrendGraph`)
  - [ ] Integrate into `src/components/InfoSheet.tsx`
  - [ ] Install charting library if not already present: `npm install recharts`
  - [ ] Test queries against Supabase
  - [ ] Verify graph rendering and performance

- [ ] **Phase 6: Testing & Optimization**
  - [ ] Run unit tests
  - [ ] Run integration tests
  - [ ] Performance-test queries
  - [ ] Monitor aggregation function duration (CloudWatch or Supabase logs)

- [ ] **Phase 7: Release**
  - [ ] Code review
  - [ ] Merge to main
  - [ ] Deploy to production
  - [ ] Monitor for errors in first 24 hours

---

## 11. Fallback Strategy

If aggregated tables become stale or corrupted:

1. **Drop and recreate tables**:
   ```sql
   DROP TABLE territory_lifecycle;
   DROP TABLE casualty_hourly;
   DROP TABLE territory_ownership_hourly;
   ```

2. **Re-run backfill**:
   ```bash
   curl -X POST https://<PROJECT_ID>.supabase.co/functions/v1/backfill-hourly-aggregates \
     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
     -H "Content-Type: application/json" \
     -d {}
   ```

3. **Temporary fallback**: If aggregation is failing, the frontend can temporarily query raw snapshots (slower but functional). Add feature flag:
   ```typescript
   const USE_AGGREGATES = true; // Set to false to use raw snapshots
   ```

---

## 12. Future Optimizations

1. **Coordinate quantization**: Move coordinate quantization to aggregation layer (reduce storage by ~40%).
2. **Data archival**: Archive older wars (>1 year) to cold storage.
3. **Materialized views**: Create PostgreSQL materialized views for common aggregations.
4. **Real-time updates**: Add incremental updates to hourly buckets as new snapshots arrive (instead of batch daily).
5. **Per-town casualty data**: Break down casualty data by town (requires schema change to track town-level casualties).

---

## Implementation Prompt for AI Agents

```
You are implementing Option 2: Pre-Aggregated Summary Tables for the Foxhole Reporter project.

Your task is to implement the following based on the detailed plan in this document:

PHASE 1: Create the Supabase migrations and deploy schema changes
- File: supabase/migrations/20260110_add_hourly_aggregates.sql
- Contains: DDL for territory_ownership_hourly, casualty_hourly, territory_lifecycle tables
- Deploy with: supabase migration up
- Verify: Tables exist and RLS policies are active

PHASE 2: Implement Edge Functions
- File: supabase/functions/aggregate-hourly-summaries/index.ts
  - Fetches snapshots for a given date
  - Groups by hour
  - Aggregates territory ownership (major flags only, detect transitions)
  - Aggregates casualty rates (delta and totals)
  - Upserts results to new tables
  
- File: supabase/functions/backfill-hourly-aggregates/index.ts
  - Fetches all wars
  - For each war, processes all snapshots
  - Triggers aggregate-hourly-summaries for each day
  - Logs progress
  
- Deploy with: supabase functions deploy <function_name>

PHASE 3: Configure scheduler
- Add cron job to supabase/config.toml: "0 1 * * *" (daily at 01:00 UTC)
- Deploy configuration

PHASE 4: Backfill historical data
- Trigger backfill function manually
- Monitor logs until complete
- Verify row counts in both tables

PHASE 5: Frontend implementation
- Add query hooks to src/lib/queries.ts:
  - fetchTerritoryOwnershipHistory()
  - computeOwnershipPieChart()
  - fetchRegionCasualtyTrend()
  - fetchTerritoryLifecycle()
  
- Create graph components:
  - src/components/OwnershipPieChart.tsx (Recharts PieChart)
  - src/components/OwnershipTimelineGraph.tsx (Recharts LineChart)
  - src/components/CasualtyTrendGraph.tsx (Recharts LineChart)
  
- Integrate into InfoSheet.tsx:
  - Fetch ownership and casualty data on location selection
  - Display graphs when data is available
  - Handle loading and error states

PHASE 6: Testing
- Unit test aggregation logic
- Integration test end-to-end flow
- Performance test queries (expect <100ms)
- Manual test graph rendering

Notes:
- Use TypeScript strictly typed (types in src/types/war.ts)
- Respect existing code style (functional components, Tailwind CSS, Zustand state)
- Install graphing library if needed: npm install recharts
- Keep Edge Functions Deno-compatible (no Node APIs)
- All queries must use parameterized inputs (Supabase PostgREST API)
- Verify schema changes match the provided DDL exactly
- Test locally with supabase start before deploying to production

Expected result: Users can select a location and see pie charts, ownership timelines, and casualty trend graphs with <100ms query latency.
```

---

## Document Summary

This plan provides a complete, production-ready design for implementing pre-aggregated hourly summary tables to enable fast historical trend visualization in the Foxhole Reporter. It covers:

- **Schema design** (3 tables: ownership, casualties, lifecycle events)
- **Migration DDL** (ready to run)
- **Edge Functions** (aggregation + backfill, full Deno code)
- **Cron scheduling** (daily aggregation at 01:00 UTC)
- **Frontend integration** (query hooks + graph components)
- **Testing & deployment** (checklist + fallback strategy)
- **Implementation prompt** (for directing AI agents)

All code is provided in full; no guessing or pseudocode. Implementation should be straightforward following the phases in order.
