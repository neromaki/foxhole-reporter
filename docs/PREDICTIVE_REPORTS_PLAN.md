# Predictive Reports Plan

## Overview
This plan summarizes the current reporting system, the breadth of WarAPI data, and WW2-style intelligence patterns, then proposes report ideas that fit the existing report model (`ReportSpec`, `viewMode`, `highlightType`, `countType`). Each idea includes data requirements and feasibility notes.

## Current Capabilities (Summary)
- Reports are defined in `ReportSpec` with `mapIconTags`, `viewMode`, `highlightType`, and `countType`.
- Territory change reports depend on Supabase `territory_diffs` and snapshot history.
- Threats/Capabilities/Job Views are map-icon filters using tag matching.
- Report UI currently supports stack comparisons but limited per-report analytics.

## WarAPI Data Breadth (Summary)
- War metadata: war number, times, victory requirements.
- Map list: list of active maps.
- Map war reports: casualties, enlistments, day-of-war per map.
- Static map data: labels and static objects.
- Dynamic map data: public items (iconType, teamId, x/y, flags).
- Caching is ETag-based and required for efficient polling.

## WW2 Intelligence Patterns (Summary)
- Order of battle (force composition, structure density, posture).
- Reconnaissance and observation coverage.
- Logistics and supply sustainment.
- Attrition and tempo analysis.
- SITREP-style region summaries.

## Proposed Reports (Prioritized)

### 1) Frontline Pressure Index (Hybrid)
- Insight: Hexes with sustained casualty spikes and recent ownership turnover.
- Data: War reports (casualties) + territory diffs or snapshot history.
- UI: `viewMode=territoryHighlighting`, `highlightType=territory`.
- Feasibility: Needs historical aggregates for casualty trend.

### 2) Supply Network Health (Live + Historical)
- Insight: Logistics nodes (seaport, storage, refinery, factory) and recent losses.
- Data: Dynamic map items; optionally diffs for recent losses.
- UI: `viewMode=territoryDimming`, `highlightType=mapIconTags`.
- Feasibility: Live is quick; loss detection needs snapshots.

### 3) Operational Reach / Staging Depth (Live)
- Insight: How far forward production and storage chains extend.
- Data: Dynamic map items + ownership from current snapshot.
- UI: `viewMode=minimal` or `mapIcons`.
- Feasibility: Live-only; relies on current ownership + adjacency.

### 4) Air/Artillery Threat Coverage (Live)
- Insight: Hexes within range of storm cannons, rocket sites, artillery hubs.
- Data: Dynamic map items for threat structures; range modeling.
- UI: `viewMode=territoryDimming`, `highlightType=mapIconTags`.
- Feasibility: Live-only; requires range math.

### 5) Breakthrough Vulnerability (Hybrid)
- Insight: Regions with thin defenses and recent ownership churn.
- Data: Defense icon density + territory diffs.
- UI: `viewMode=territoryDimming`, `highlightType=mapIconTags`.
- Feasibility: Needs diffs for churn signal.

### 6) Attrition vs Replacement (Historical)
- Insight: Casualty trends vs production capacity (replacement proxy).
- Data: War reports + production structure counts; hourly aggregates ideal.
- UI: `viewMode=none`; panel-only report.
- Feasibility: Requires history for meaningful trend.

### 7) Recon/Observation Gaps (Live)
- Insight: Frontlines lacking watchtower/radar coverage.
- Data: Observation/radar icons + frontline ownership boundary.
- UI: `viewMode=territoryDimming`, `highlightType=mapIconTags`.
- Feasibility: Live-only; needs boundary calc.

### 8) Capture Tempo Tracker (Historical)
- Insight: Regions with accelerating capture rate over last 6-24 hours.
- Data: Territory diffs or snapshot history.
- UI: `viewMode=territoryHighlighting`, `highlightType=territory`.
- Feasibility: Historical-only; depends on diffs.

### 9) Strategic Industry Concentration (Live)
- Insight: Economic clusters and exposed industry hubs.
- Data: Production/refinery/MPF density via map icons.
- UI: `viewMode=territoryDimming`, `highlightType=mapIconTags`.
- Feasibility: Live-only; quick to build.

## Verification Checklist
- Each report maps to WarAPI fields or Supabase tables.
- Each report can be represented with current report primitives.
- Historical reports depend on diffs or hourly aggregates.

## Decisions
- Use both live WarAPI and Supabase history to cover quick-win and advanced reports.
- Favor report designs that fit existing `ReportSpec` fields before expanding UI schema.



----

Plan: Predictive Reports Roadmap
You already have a unified report system (built-in ReportSpec, viewMode, highlightType, countType) with map-icon tag filtering, territory highlighting, and a report panel limited to stack comparisons. Territory change reports rely on Supabase diffs, while most other reports are live map-icon filters. WarAPI provides dynamic map items (iconType/teamId/x/y), static labels, per-map war reports (casualties/enlistments/day), and war metadata. WW2 intelligence patterns translate well to Foxhole as ORBAT-style force/structure inventories, reconnaissance/observation density, logistics/throughput indicators, attrition and tempo analysis, and SITREP-style region summaries. The plan below proposes 9 reports that fit your current data model and can be surfaced with existing viewMode and highlighting, while noting which require historical aggregates.

Steps

Capture current report system constraints and UI slots in reports.ts, useMapStore.ts, ReportModes.tsx, and ReportInfoSheet.tsx to ensure new ideas map to existing primitives (mapIconTags, viewMode, highlightType, countType).
Map WarAPI data fields from warApi.ts and useWarApiDirect.ts to report inputs: dynamic items for structure placement and ownership; war reports for casualties/enlistments; static labels for region context.
Align proposed reports to WW2 intelligence categories to ensure each report provides actionable decision value (ORBAT, reconnaissance, logistics, attrition, SITREP analogs).
Produce the prioritized list below with data source, required inputs, and suggested viewMode/highlightType.
Prioritized Report Ideas (5–10)

Frontline Pressure Index (Hybrid)

Insight: Identify hexes with sustained casualty spikes + recent territory turnover (pressure points).
Data: War reports per map (casualties), territory diffs or snapshot ownership history.
UI: viewMode territoryHighlighting, highlightType territory, countType territories; dim unaffected hexes.
Feasibility: Needs historical aggregates for casualty trend + diff timing.
Supply Network Health (Live + Historical)

Insight: Flag regions where logistics nodes (seaport, storage, refinery, factory) are sparse or lost recently.
Data: Dynamic map items by icon tags; optional territory diffs for “loss in last N hours.”
UI: viewMode territoryDimming, highlightType mapIconTags; stack comparison for node counts per team.
Feasibility: Live is quick; historical loss detection needs snapshots.
Operational Reach / Staging Depth (Live)

Insight: Measure how far forward major production + storage chains extend toward frontline hexes.
Data: Map items and region adjacency; “distance” to enemy-owned hex edges from towns/structures.
UI: viewMode minimal or mapIcons; highlight map icon tags; optional overlay heat.
Feasibility: Live-only with static map geometry and ownership in current snapshot.
Air/Artillery Threat Coverage (Live)

Insight: Identify hexes within influence range of storm cannons, rocket sites, artillery hubs.
Data: Dynamic map items for threat structures; approximate range rings per type.
UI: viewMode territoryDimming, highlightType mapIconTags; overlay range influence.
Feasibility: Live-only; uses existing icon tags and additional range math.
Breakthrough Vulnerability (Hybrid)

Insight: Detect regions with thin defensive structure density and recent ownership churn.
Data: Dynamic map items (defense tags), territory diffs or snapshot deltas.
UI: viewMode territoryDimming, highlightType mapIconTags + territory; count by territory.
Feasibility: Live structure density is quick; “recent churn” needs diffs.
Attrition vs Replacement (Historical)

Insight: Compare casualty rate trends vs production infrastructure count (proxy for replacement capacity).
Data: War reports (casualties), structure counts, optionally hourly aggregates.
UI: viewMode none; report panel shows deltas and per-team ratios; minimal map highlight.
Feasibility: Requires aggregates for meaningful trend, otherwise uses last 24h snapshots.
Recon/Observation Gaps (Live)

Insight: Identify frontlines lacking watchtowers/radar coverage to prioritize intel build.
Data: Dynamic map items by observation/radar tags; proximity to frontline hex boundary.
UI: viewMode territoryDimming, highlightType mapIconTags; dim covered hexes, highlight gaps.
Feasibility: Live-only; requires adjacency/frontline calc.
Capture Tempo Tracker (Historical)

Insight: Regions with accelerating capture rate over last 6–24h (momentum).
Data: Territory diffs or snapshot history with timestamps.
UI: viewMode territoryHighlighting; heat on affected hexes, count by region.
Feasibility: Requires Supabase diffs and time bucketing.
Strategic Industry Concentration (Live)

Insight: Identify economic clusters (factory/refinery/MPF density) and exposed hubs.
Data: Dynamic map items with production tags; ownership.
UI: viewMode territoryDimming, highlightType mapIconTags; stack comparison panel.
Feasibility: Live-only; immediate using tags.
Verification

Each report maps to an existing WarAPI field or Supabase snapshot/diff table.
Each report can be represented with current report primitives in reports.ts and viewModes.ts.
Decisions

Use both live WarAPI and Supabase history to cover quick-win and advanced reports.
Favor report designs that fit existing ReportSpec fields before adding new UI or schema.