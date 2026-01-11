# Hourly Aggregates Implementation Summary

This document summarizes the implementation of hourly aggregate tables and visualizations for the Foxhole Reporter application, based on IMPLEMENTATION_OPTION_2_HOURLY_AGGREGATES.md.

## Implementation Status: ✅ COMPLETE

All code has been generated and TypeScript errors resolved. The following steps remain:
1. Deploy the migration: `supabase migration up`
2. Deploy Edge Functions: `supabase functions deploy aggregate-hourly-summaries` and `supabase functions deploy backfill-hourly-aggregates`
3. Run backfill manually: Invoke `backfill-hourly-aggregates` function once
4. Test the UI with aggregated data

---

## Files Created/Modified

### Database Schema
- **`supabase/migrations/20260110_add_hourly_aggregates.sql`**
  - Creates 3 tables: `territory_ownership_hourly`, `casualty_hourly`, `territory_lifecycle`
  - No foreign key constraints (wars.warNumber is not unique)
  - Indexes on time ranges for efficient querying
  - RLS policies: public read access, authenticated insert/update

### Edge Functions
- **`supabase/functions/aggregate-hourly-summaries/index.ts`**
  - Aggregates hourly ownership and casualty data from snapshots
  - Groups snapshots by hour, detects ownership changes, computes casualty deltas/rates
  - Batch upserts 500 rows at a time
  - Scheduled to run daily at 01:00 UTC via cron

- **`supabase/functions/backfill-hourly-aggregates/index.ts`**
  - One-time function to backfill historical data
  - Fetches all wars, processes each day sequentially
  - Triggers aggregate-hourly-summaries for each day

### Configuration
- **`supabase/config.toml`**
  - Added cron schedule: `[functions.aggregate_hourly_summaries]` runs daily at 01:00 UTC
  - Environment variables configured for Edge Functions

### Frontend Query Hooks
- **`src/lib/queries.ts`** (modified)
  - `fetchTerritoryOwnershipHistory()`: Fetches hourly ownership data for a territory (last 7 days)
  - `computeOwnershipPieChart()`: Computes ownership percentage distribution
  - `fetchRegionCasualtyTrend()`: Fetches hourly casualty rates for a region
  - `fetchTerritoryLifecycle()`: Fetches ownership change events for a territory

### React Components
- **`src/components/OwnershipPieChart.tsx`**
  - Uses Recharts PieChart with ResponsiveContainer
  - Filters out Neutral ownership
  - Color-coded by team (Colonial green, Warden blue)

- **`src/components/OwnershipTimelineGraph.tsx`**
  - Uses Recharts LineChart with stepAfter lines
  - Binary series (wardenOwned/colonialOwned as 0/1)
  - X-axis shows time, Y-axis shows "Owned"/"Not Owned"

- **`src/components/CasualtyTrendGraph.tsx`**
  - Uses Recharts LineChart with numeric Y-axis
  - Shows casualty rates per hour for both teams
  - Safe tooltip formatter handling undefined values

- **`src/components/InfoSheet.tsx`** (modified)
  - Added imports for new query functions and graph components
  - Added state management for aggregated data (ownership history, pie data, casualty trend)
  - Added useEffect to fetch data when selection changes
  - Updated OwnershipGraph function to render three charts conditionally:
    1. Ownership Distribution (pie chart)
    2. Ownership Timeline (step chart)
    3. Casualty Trend (line chart, region-level)

### Dependencies
- **`package.json`** (via npm install)
  - Added `recharts` library for data visualization

---

## Key Implementation Decisions

1. **No Foreign Keys**: The `wars` table does not have a unique constraint on `warNumber`, so foreign key constraints were removed from the aggregate tables.

2. **camelCase vs snake_case**: 
   - Database columns use `snake_case` (PostgreSQL convention)
   - TypeScript types use `camelCase` (JavaScript convention)
   - Query functions handle the mapping implicitly via PostgREST

3. **Type Field References**:
   - Code uses `LocationTile.iconType` (camelCase)
   - Database columns use `icon_type` (snake_case)
   - WarReport fields: `wardenCasualties`, `colonialCasualties`, `dayOfWar` (camelCase)

4. **Recharts Component Usage**:
   - Always wrap charts in `ResponsiveContainer`
   - Use `LineChart` + `Line` (not `ResponsiveLineChart`)
   - Use `PieChart` + `Pie` (not `ResponsivePieChart`)

5. **Ownership Timeline Visualization**:
   - Uses binary series (0/1) instead of categorical data
   - `stepAfter` line type shows discrete ownership changes
   - Filters out Neutral ownership from pie chart

6. **Batch Processing**:
   - Edge Function processes up to 500 rows per upsert
   - Backfill processes wars sequentially to avoid overload

7. **Conditional Rendering**:
   - Graphs only render when data is available
   - Territory-level graphs only show for territory selections
   - Casualty trend shows region-level data

---

## Testing Checklist

- [ ] Run migration: `supabase migration up`
- [ ] Deploy aggregate function: `supabase functions deploy aggregate-hourly-summaries`
- [ ] Deploy backfill function: `supabase functions deploy backfill-hourly-aggregates`
- [ ] Invoke backfill manually (one-time): Call backfill-hourly-aggregates function
- [ ] Verify aggregate tables have data: Check `territory_ownership_hourly`, `casualty_hourly`, `territory_lifecycle`
- [ ] Test UI: Select a territory and verify graphs render
- [ ] Verify cron job: Check logs after 01:00 UTC to ensure daily aggregation runs
- [ ] Performance test: Ensure queries are fast (<500ms) with 7 days of data

---

## Next Steps

1. **Deploy and Test**: Run the deployment commands above and verify data flows correctly.
2. **Monitor Performance**: Check query performance with `EXPLAIN ANALYZE` on aggregate queries.
3. **Tune Indexes**: Add additional indexes if specific queries are slow.
4. **Add Error Handling**: Consider adding Sentry or similar error tracking for Edge Functions.
5. **Extend Time Ranges**: Add UI controls to allow users to select different time ranges (24h, 3d, 7d, 14d).
6. **Add Lifecycle Events**: Consider showing territory_lifecycle events in a separate panel or tooltip.

---

## Known Limitations

- **Historical Data**: Backfill function processes all wars sequentially, which may take time for large datasets.
- **Cron Frequency**: Daily aggregation at 01:00 UTC means data is up to 24 hours behind real-time.
- **Territory vs Region**: Ownership graphs show territory-level data, casualty trends show region-level data (different granularity).
- **Mobile Performance**: Three stacked graphs may impact performance on mobile devices; consider lazy loading or pagination.

---

## File Structure

```
foxhole-reporter/
├── supabase/
│   ├── config.toml (updated with cron)
│   ├── functions/
│   │   ├── aggregate-hourly-summaries/
│   │   │   └── index.ts (new)
│   │   └── backfill-hourly-aggregates/
│   │       └── index.ts (new)
│   └── migrations/
│       └── 20260110_add_hourly_aggregates.sql (new)
├── src/
│   ├── components/
│   │   ├── CasualtyTrendGraph.tsx (new)
│   │   ├── InfoSheet.tsx (modified)
│   │   ├── OwnershipPieChart.tsx (new)
│   │   └── OwnershipTimelineGraph.tsx (new)
│   └── lib/
│       └── queries.ts (modified)
└── package.json (recharts added)
```

---

## Questions?

Refer to the original plan document: [IMPLEMENTATION_OPTION_2_HOURLY_AGGREGATES.md](./docs/IMPLEMENTATION_OPTION_2_HOURLY_AGGREGATES.md)
