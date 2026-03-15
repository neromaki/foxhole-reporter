# Foxhole Report — Feature Requirements

**Version:** 1.0 — March 2026  
**Purpose:** Non-technical feature requirements for a ground-up rebuild of Foxhole Report. Each feature is defined by its name, description, priority, and the primary user flows it supports. This document is intended as a working brief for implementation agents and does not prescribe technical solutions.

---

## Priority Scale

| Priority | Label | Rationale |
|----------|-------|-----------|
| **P0** | **Existing** | Features already live on Foxhole Report. Must be preserved in the rebuild. |
| **P1** | **Critical** | Gaps that actively prevent users from choosing Foxhole Report over competitors. Must ship before the rebuild can be considered viable. |
| **P2** | **High Value** | Significant capability gaps vs. competitors. Closes the distance to feature parity. |
| **P3** | **Differentiator** | Features no competitor currently offers. Creates reasons to prefer Foxhole Report. |
| **P4** | **Polish** | UX improvements that reduce friction and improve the experience of existing features. |

---

## Player Archetypes

Features are tagged to the archetypes they primarily serve:

- **Casual** — wants a quick war overview and to know where to deploy
- **Logistics** — plans supply routes and manufacturing operations
- **Partisan** — identifies high-value enemy targets for disruptive strikes
- **Strategist** — assesses frontline strength, momentum, and capability balance

---

## P0 — Existing Features

These features are already live on Foxhole Report and must be carried forward into the rebuild without regression.

---

### F-01 — Territory Hex Map

**Priority:** P0  
**Archetypes:** Casual, Logistics, Partisan, Strategist

**Description:** The primary map view showing the full world as a grid of named hex regions, each coloured by controlling faction (Warden blue / Colonial green). Casualty rates are displayed per region. The map is the central navigational surface of the app — all other features are accessed from or in relation to it.

**Primary user flows:**

1. A player opens the app and immediately sees the current territorial balance across all regions at a glance.
2. A player scans the map to identify which regions are contested (high casualty rates) vs. stable (low or zero casualties).
3. A player uses the map as a spatial reference when reading reports — they can see where a reported structure or event is located.

---

### F-02 — War Status Header

**Priority:** P0  
**Archetypes:** Casual

**Description:** A persistent header or banner showing the current war's key headline figures: Warden and Colonial territory counts, the number of victory towns required to win, the current war number, and a live countdown timer. This gives any player an immediate answer to "who is winning?" without needing to interpret the map.

**Primary user flows:**

1. A player opens the app and reads the territory counts and victory town progress before looking at anything else.
2. A player checks the war timer to understand how long the current war has been running and whether it is likely to end soon.

---

### F-03 — Map Layer System

**Priority:** P0  
**Archetypes:** Casual, Logistics, Partisan, Strategist

**Description:** A toggleable layer system that allows players to show or hide categories of map icons. Layers are grouped by type: Bases (Town, Relic, Keep, Fort, Safe House, Hospital, Forward Base, Troop Ship), Storage (Storage Facility, Seaport), Aircraft (Depot, Factory, Radar, Runway T1/T2), Production (Factory, Mass Production Factory, Refinery), Construction (Vehicle Factory, Shipyard, Construction Yard), Defensive (Storm Cannon, Coastal Gun, Mortar House), Utility (Intel Center, Weather Station, Tech Center, Observation Tower), Rocket (Site, Armed, Target, Ground Zero), and Resources (Salvage, Component, Sulfur, Coal, Oil). Core layers (Territories, Casualties, Labels, Structures) are always available.

**Primary user flows:**

1. A logistics player enables the Resources and Production layers to see the locations of resource nodes and refineries relative to each other.
2. A partisan player enables the Defensive and Production layers to identify clusters of high-value enemy structures.
3. A strategist enables the Defensive layer to assess the enemy's defensive coverage in a contested region.
4. A casual player turns off all structure layers to get a clean territorial overview.

---

### F-04 — Reports Panel

**Priority:** P0  
**Archetypes:** Casual, Logistics, Partisan, Strategist

**Description:** A slide-out or overlay panel accessible from the map that contains all structured reports. Reports are grouped by category and selected from a list. The panel sits alongside the map so players can cross-reference report data with the map's spatial context. The panel must be usable on mobile without obscuring the map entirely.

**Primary user flows:**

1. A player taps the Reports button and browses the list of available reports to find what they need.
2. A player selects a report and reads it while the map remains visible in the background.
3. A player closes the report panel to return to full-map view.

---

### F-05 — Overview Report

**Priority:** P0  
**Archetypes:** Casual

**Description:** A summary report showing the current war state: total territory counts by faction, victory town progress, current war day, and a high-level summary of the war's status. This is the default report shown when the app is opened.

**Primary user flows:**

1. A casual player opens the app and reads the Overview report to understand the current war state before deciding where to play.

---

### F-06 — Historical Territory Reports (1 Day / 3 Days / 7 Days / All Time)

**Priority:** P0  
**Archetypes:** Casual, Strategist

**Description:** Reports that show the territorial state at a past point in time, selectable by time window (1 day ago, 3 days ago, 7 days ago, or the start of the war). These are currently implemented as static snapshots of the map at the selected time. **Note:** These are a P0 preserve-and-improve feature — the P1 "True Change Reports" feature (F-16) transforms them from snapshots into genuine diff reports.

**Primary user flows:**

1. A player returning after a day away opens the 1 Day report to see what the map looked like yesterday and mentally compares it to now.
2. A strategist opens the 7 Days report to understand the long-term territorial trend.

---

### F-07 — Casualties Report

**Priority:** P0  
**Archetypes:** Casual, Strategist

**Description:** A report showing current casualty figures — total casualties per faction, casualty rates per hour, and a breakdown by region. Helps players understand where the fighting is most intense.

**Primary user flows:**

1. A casual player reads the Casualties report to identify the most active combat regions.
2. A strategist uses casualty data to assess which faction is absorbing more losses and where.

---

### F-08 — Capability Reports (Major Threats, Defenses, Intel, Naval, Aircraft, Production, Refinement, Construction, Storage)

**Priority:** P0  
**Archetypes:** Partisan, Strategist, Logistics

**Description:** A suite of structured reports showing the count and location of specific structure types for each faction. Each report focuses on a category: Major Threats (storm cannons, coastal guns), Defenses (all defensive structures), Intel (intel centers), Naval (seaports, shipyards, troop ships), Aircraft (depots, factories, radar, runways), Production (factories, mass production factories), Refinement (refineries), Construction (vehicle factories, shipyards, construction yards), and Storage (storage facilities, seaports). Reports show faction totals and highlight regions with notable concentrations.

**Primary user flows:**

1. A partisan player opens the Production report to identify the enemy's most productive backline regions as strike targets.
2. A strategist opens the Naval Capabilities report to assess the enemy's amphibious capacity before planning a coastal operation.
3. A logistics player opens the Storage report to identify where supplies are concentrated.

---

### F-09 — Resource Reports (Salvage, Component, Sulfur, Coal, Oil — by miner type)

**Priority:** P0  
**Archetypes:** Logistics

**Description:** Reports showing the locations and counts of each resource type's mining infrastructure (salvage mines, component mines, sulfur mines, coal mines, oil wells/rigs) per faction. Helps logistics players understand the resource extraction landscape.

**Primary user flows:**

1. A logistics player opens the Salvage report to identify which regions have the most active salvage mining infrastructure.
2. A logistics player compares resource node density in backline regions to plan where to base manufacturing operations.

---

### F-10 — Logistics Zone Reports (Frontline / Midline / Backline)

**Priority:** P0  
**Archetypes:** Logistics

**Description:** Reports that divide the map into three operational zones — Frontline (active combat regions), Midline (staging and support regions), and Backline (production and resource regions) — and show the structure distribution within each zone. Helps logistics players understand the supply chain geography.

**Primary user flows:**

1. A logistics player opens the Frontline report to see which forward regions have storage facilities and seaports that need resupplying.
2. A logistics player opens the Backline report to identify production centres and plan where to pick up supplies.

---

### F-11 — Frontline Pressure Report

**Priority:** P0  
**Archetypes:** Strategist, Casual

**Description:** A report that visualises the intensity of combat activity along the frontline, using casualty rates to indicate where pressure is highest. Helps strategists identify where the frontline is most contested and where it is quiet.

**Primary user flows:**

1. A strategist opens the Frontline Pressure report to identify the two or three regions under the most intense pressure and assess whether they need reinforcement.
2. A casual player uses the Frontline Pressure report to find where the fighting is and decide where to deploy.

---

### F-12 — Mobile-Responsive Design

**Priority:** P0  
**Archetypes:** Casual, Logistics, Partisan, Strategist

**Description:** The entire app — map, reports panel, layer controls, and all other UI — must be fully usable on a mobile phone without horizontal scrolling, tiny tap targets, or layout breakage. This is Foxhole Report's primary differentiator vs. FoxholeStats and FoxholeHQ, both of which are desktop-only. The mobile experience should be a first-class design target, not a responsive afterthought.

**Primary user flows:**

1. A player checks the app on their phone before logging in to the game to see the current war state.
2. A player on mobile navigates the map by pinching and panning, then opens a report without the panel covering the entire screen.
3. A player on mobile toggles map layers using touch-friendly controls.

---

## P1 — Critical Features

These features address gaps that actively prevent users from choosing Foxhole Report over competitors. They should be treated as the minimum viable feature set for the rebuild to be considered a viable alternative.

---

### F-13 — Live Activity Feed

**Priority:** P1  
**Archetypes:** Casual, Partisan

**Description:** A real-time feed of war events, updating continuously as the war progresses. Events include: structure captures and losses (with faction, region, and location name), structure construction starts, and structure upgrades (T1→T2→T3). Each event is timestamped with both real time and in-game war day. The feed is filterable by region and by event type. On mobile, the feed should be accessible as a card-style panel that does not require leaving the map view.

This is the single most impactful missing feature. FoxholeStats and SigilHQ both implement it; its absence is the primary reason casual and partisan players stay on those apps rather than switching to Foxhole Report.

**Primary user flows:**

1. A casual player opens the app and immediately sees a feed of the last 20 events — captures, losses, and construction — to understand what has happened in the last hour without reading the map.
2. A partisan player filters the feed to show only enemy construction events in a specific region to identify recently-built structures that are likely poorly defended.
3. A player returning after a few hours scrolls back through the feed to catch up on what happened while they were away.

---

### F-14 — Hotspot Indicator

**Priority:** P1  
**Archetypes:** Casual, Strategist

**Description:** A ranked list of the most active regions, ordered by casualty rate (casualties per hour). The list shows the top 5–10 regions with their current casualty rates for each faction, and provides a direct link or tap target to navigate the map to that region. This directly answers the casual player's primary question: "Where is the fighting right now, and where should I deploy?"

SigilHQ's Regions tab implements this as its primary feature and it is the clearest, most immediately useful answer to this question available in any of the competing apps.

**Primary user flows:**

1. A casual player opens the app and taps "Hotspots" to see the five most active regions, then taps one to zoom the map to it.
2. A strategist uses the hotspot list to quickly identify which regions are under the most pressure without manually scanning the map.
3. A player deciding where to deploy reads the hotspot list and joins the most active region.

---

### F-15 — Global Player Count

**Priority:** P1  
**Archetypes:** Casual

**Description:** A display of the current number of players online, shown globally and broken down by shard (Able, Baker, Charlie). This is a basic engagement signal that helps casual players understand whether the war is active and which shard has the most players. FoxholeStats and SigilHQ both show this; its absence makes Foxhole Report feel incomplete.

**Primary user flows:**

1. A casual player checks the player count to decide whether it is worth logging in right now.
2. A player choosing between shards uses the per-shard count to pick the most active server.

---

### F-16 — True "What Changed" Reports

**Priority:** P1  
**Archetypes:** Casual, Strategist

**Description:** Transform the existing 1 Day / 3 Days / 7 Days reports (F-06) from static snapshots into genuine change reports. A change report answers the question: "What is different now compared to X hours or days ago?" It shows territory gained and lost (highlighted hexes), structures built and destroyed during the period, regions that changed hands, and a net summary (e.g. "+3 regions for Wardens, −2 for Colonials"). Changed hexes should be visually highlighted on the map with a colour indicating the direction of change.

This is the feature Foxhole Report was originally built around and should be its primary differentiator. No competitor currently offers this in a clear, accessible format.

**Primary user flows:**

1. A player returning after a day away opens the "Last 24 Hours" change report and immediately sees which regions changed hands, with changed hexes highlighted on the map.
2. A strategist opens the "Last 7 Days" change report to understand the long-term territorial trend and identify which regions have been consistently contested.
3. A casual player reads the change summary ("Wardens gained 4 regions, Colonials gained 2") to understand the war's recent momentum without interpreting the map.

---

### F-17 — Multi-Shard Support

**Priority:** P1  
**Archetypes:** Casual, Logistics, Partisan, Strategist

**Description:** Support for all three active Foxhole shards: Able, Baker, and Charlie. The player can select their shard from a persistent control, and all map data, reports, and live feeds update to reflect the selected shard. The currently selected shard is always visible. This brings Foxhole Report to parity with FoxholeStats and FoxholeHQ, and expands its addressable audience to all Foxhole players.

**Primary user flows:**

1. A player on the Baker shard selects Baker from the shard selector and sees their war's current state.
2. A player compares the war state across shards by switching between them.

---

## P2 — High Value Features

These features close significant capability gaps vs. competitors and should be prioritised immediately after the P1 set is complete.

---

### F-18 — Per-Region Drill-Down

**Priority:** P2  
**Archetypes:** Logistics, Partisan, Strategist

**Description:** Tapping or clicking on a region on the map opens a detail panel for that region. The panel shows: the region's full terrain map with all structure icons and resource nodes, the region's current casualty rate and total casualties for the war, a list of all structures present (by type and faction), recent events in that region (from the live feed), and links to related reports. FoxholeStats and FoxholeHQ both support per-region drill-down; its absence makes Foxhole Report feel incomplete for any player who wants to investigate a specific area.

**Primary user flows:**

1. A partisan player taps a backline enemy region to see all production structures and assess it as a strike target.
2. A logistics player taps a midline region to see storage facilities and seaports before planning a supply run.
3. A strategist taps a contested frontline region to see the full structure picture and recent event history.

---

### F-19 — Casualty Rate Trend Chart

**Priority:** P2  
**Archetypes:** Strategist, Casual

**Description:** A line chart showing Warden and Colonial casualty rates over time, covering at least the last 24–72 hours of the current war. The chart shows both factions on the same axes so players can see which side is absorbing more losses and whether that is changing. A secondary axis or overlay can show territory balance over the same period. SigilHQ implements this as its primary strategic tool and it is the clearest momentum indicator available in any competing app.

**Primary user flows:**

1. A strategist opens the trend chart to assess whether the Wardens or Colonials have been taking more casualties over the last 24 hours and whether the trend is accelerating or reversing.
2. A casual player glances at the trend chart to understand the war's momentum — is one side winning decisively, or is it close?

---

### F-20 — Distance & Travel Time Tool

**Priority:** P2  
**Archetypes:** Logistics, Partisan

**Description:** An interactive measurement tool on the map that allows players to click two points and see the straight-line distance between them in in-game metres. A companion travel time calculator takes that distance and returns estimated travel times for common vehicles: Logistics Truck (road and off-road), Flatbed Truck, Barge, Ironship, Gunboat (Warden and Colonial variants). FoxholeHQ is currently the only app offering this, and it is the primary reason logistics players use FoxholeHQ over Foxhole Report.

**Primary user flows:**

1. A logistics player measures the distance from a backline refinery to a frontline seaport and reads the logistics truck travel time to plan their run schedule.
2. A partisan player measures the distance from a staging area to a target facility to assess whether a strike is feasible within a single game session.
3. A logistics player compares travel times by barge vs. truck for a coastal supply route.

---

### F-21 — Weapon & Structure Range Visualisation

**Priority:** P2  
**Archetypes:** Strategist, Partisan

**Description:** The ability to place a range circle on the map centred on any structure, showing its effective radius. Pre-defined range presets are available for common structures and weapons: Storm Cannon (1000m), Intelligence Center (2500m), Coastal Gun, Artillery (120mm and 150mm, Warden and Colonial variants), Observation Bunker (T2 and T3), Watchtower (80m), Hades Net (575m), and Rocket Truck. Players can also place a custom radius circle of any size. FoxholeHQ offers this and it is uniquely valuable for both strategic planning and partisan approach-corridor identification.

**Primary user flows:**

1. A strategist places a Storm Cannon range circle on a key chokepoint to see whether it covers the expected enemy approach route.
2. A partisan player places an Intel Center range circle on an enemy facility to identify approach corridors that avoid detection.
3. A strategist places artillery range circles to assess whether a planned gun emplacement can cover a target.

---

### F-22 — "Returning Player" Summary

**Priority:** P2  
**Archetypes:** Casual

**Description:** A dedicated entry point — prominent on the app's home screen — that asks "How long were you away?" and generates a personalised catch-up summary for the selected time window. The summary includes: territory changes (regions gained/lost per faction), key structure events (major captures, losses, construction), momentum shift (which side gained ground), and a deployment recommendation ("The most active region right now is X — casualty rate Y/hr"). This is the feature Foxhole Report was originally conceived around and should be its signature experience.

This feature depends on F-16 (True Change Reports) for its underlying data.

**Primary user flows:**

1. A player returning after a weekend away taps "I've been away for 3 days" and reads a concise summary of everything that happened, ending with a recommendation of where to deploy.
2. A player returning after a single session taps "I've been away for a few hours" and sees the last 6 hours of changes.
3. A player shares their returning-player summary with their regiment to brief them on the war state.

---

## P3 — Differentiator Features

These features do not exist in any competing app. They create unique reasons to prefer Foxhole Report and should be prioritised after the P1 and P2 sets are complete.

---

### F-23 — Supply Chain Visualisation

**Priority:** P3  
**Archetypes:** Logistics

**Description:** A map overlay that visually represents the logical supply chain: resource nodes connect to nearby refineries, refineries connect to nearby factories, factories connect to nearby seaports and storage facilities. The overlay is drawn as directional arrows or flow lines, colour-coded by resource type. This helps logistics players understand the intended flow of materials through the backline and identify gaps or bottlenecks. No competitor offers this as a visual layer.

Note: The War API does not provide actual supply route data. The connections must be inferred from the proximity and type of structures — the visualisation represents the logical supply chain, not observed player behaviour.

**Primary user flows:**

1. A logistics player enables the Supply Chain overlay to see which refineries are connected to which factories in a backline region, and identifies a factory with no nearby refinery as a supply gap.
2. A logistics player traces the supply chain from a resource node to the nearest seaport to plan a full resupply run.
3. A logistics player identifies a region where the supply chain has been disrupted (e.g. a refinery was destroyed) and reports it to their regiment.

---

### F-24 — Capability Balance Dashboard

**Priority:** P3  
**Archetypes:** Strategist, Partisan

**Description:** A side-by-side comparison of Warden vs. Colonial capabilities across key categories, expressed as counts and as a ratio. Categories include: Aircraft (depots, factories, radar, runways), Naval (seaports, shipyards), Storm Cannons, Factories (standard and mass production), Refineries, Intel Centers, and Rocket Sites. The dashboard gives strategists an at-a-glance assessment of the capability balance without needing to interpret the map. No competitor offers this in a structured, comparative format.

**Primary user flows:**

1. A strategist opens the Capability Balance dashboard to see that the Colonials have 40% more aircraft infrastructure than the Wardens and flags this as a strategic vulnerability.
2. A partisan player uses the dashboard to identify which capability category the enemy leads in, then targets that category's infrastructure for disruption.
3. A strategist uses the dashboard before a major operation to assess whether the enemy has the naval capacity to respond to an amphibious landing.

---

### F-25 — Map Annotation & Drawing Tools

**Priority:** P3  
**Archetypes:** Logistics, Strategist, Partisan

**Description:** Tools that allow players to draw on the map: freehand lines, arrows, rectangles, and circles. Annotations can be labelled with text. Drawings are saved locally in the browser and persist between sessions. A shareable link exports the current map state including annotations so players can share plans with their regiment. FoxholeHQ offers drawing tools but without the shareable link feature.

**Primary user flows:**

1. A logistics player draws a supply route from a backline refinery to a frontline seaport and shares the annotated map link with their regiment.
2. A strategist draws attack vectors and defensive lines on the map to plan an operation and shares the plan with their commander.
3. A partisan player marks high-value targets and planned approach routes on the map for a strike mission.

---

### F-26 — Victory Point Tracking

**Priority:** P3  
**Archetypes:** Casual, Strategist

**Description:** Display of which towns are currently designated as Victory Points (VPs) for the current war, their current controlling faction, and how many VPs each faction currently holds vs. the number required to win. VPs change each war and are a critical strategic objective. SigilHQ tracks this; no other competitor does. The War API exposes the `IsVictoryBase` flag on map icons.

**Primary user flows:**

1. A casual player opens the app and sees at a glance how many VPs each faction holds and how close either side is to winning.
2. A strategist identifies which contested regions contain VPs and prioritises them for offensive or defensive operations.

---

### F-27 — Shareable Deep Links

**Priority:** P3  
**Archetypes:** Casual, Strategist, Logistics, Partisan

**Description:** Every significant app state — a specific report, a map view centred on a region, a set of active layers, an annotated map — can be shared via a URL. The URL encodes the current state so that anyone opening it sees exactly what the sharer saw. This enables organic sharing and community adoption, and is essential for regiment coordination.

**Primary user flows:**

1. A player finds an interesting frontline situation and shares a link to the map view with their Discord server.
2. A strategist shares a link to a specific capability report with their commander before a planning session.
3. A logistics player shares a link to an annotated supply route map with their regiment.

---

## P4 — Polish Features

These features improve the experience of existing functionality without adding new capabilities. They should be addressed continuously throughout development rather than treated as a separate phase.

---

### F-28 — Report Panel UX (Mobile)

**Priority:** P4  
**Archetypes:** Casual, Logistics, Partisan, Strategist

**Description:** On mobile, the current report panel overlaps the map entirely when open, removing the spatial context that makes reports useful. The rebuilt panel should use a bottom-sheet or side-drawer pattern on mobile, allowing the map to remain partially visible behind the panel. The panel should be dismissible with a swipe gesture. On desktop, the panel should sit alongside the map as a persistent sidebar.

**Primary user flows:**

1. A mobile player opens a report and can still see the map in the background, maintaining spatial context.
2. A mobile player swipes down to dismiss the report panel and return to the full map.

---

### F-29 — Onboarding & Contextual Help

**Priority:** P4  
**Archetypes:** Casual

**Description:** A brief first-run onboarding flow that explains the app's key features to new players: what the map shows, how to read casualty rates, how to use reports, and how to find the hotspot indicator. Contextual tooltips on less-obvious UI elements (e.g. what "Frontline Pressure" means, what the difference between Midline and Backline is). This reduces the learning curve for new players who are not already familiar with Foxhole's terminology.

**Primary user flows:**

1. A new player opens the app for the first time and is guided through the key features in under 60 seconds.
2. A player hovers over or taps an unfamiliar term and sees a brief explanation.

---

### F-30 — Data Freshness Indicators

**Priority:** P4  
**Archetypes:** Casual, Strategist

**Description:** Every data element that has a refresh rate should display a "last updated" timestamp or a live indicator showing how fresh the data is. The War API updates dynamic map data every 3 seconds and war reports every 3 seconds, but some data (static map) never changes. Players should be able to tell at a glance whether they are looking at live data or a cached snapshot.

**Primary user flows:**

1. A player sees a "Live — updated 2s ago" indicator on the territory map and trusts that it reflects the current state.
2. A player sees a "Last updated: 4 minutes ago" indicator on a report and knows to refresh if they need current data.

---

### F-31 — Accessibility & Colour-Blind Mode

**Priority:** P4  
**Archetypes:** Casual, Logistics, Partisan, Strategist

**Description:** An alternative colour scheme for the map and reports that replaces the Warden blue / Colonial green distinction with a colour-blind-accessible palette (e.g. blue / orange, or using patterns in addition to colour). All interactive elements must meet WCAG AA contrast requirements. The app should be fully navigable by keyboard on desktop.

**Primary user flows:**

1. A colour-blind player enables the accessible colour scheme and can clearly distinguish Warden and Colonial territory.
2. A player using a keyboard navigates the app without needing a mouse.

---

## Feature Summary

| ID | Feature | Priority | Archetypes |
|----|---------|----------|------------|
| F-01 | Territory Hex Map | P0 | All |
| F-02 | War Status Header | P0 | Casual |
| F-03 | Map Layer System | P0 | All |
| F-04 | Reports Panel | P0 | All |
| F-05 | Overview Report | P0 | Casual |
| F-06 | Historical Territory Reports | P0 → P1 upgrade via F-16 | Casual, Strategist |
| F-07 | Casualties Report | P0 | Casual, Strategist |
| F-08 | Capability Reports (9 types) | P0 | Partisan, Strategist, Logistics |
| F-09 | Resource Reports (5 types) | P0 | Logistics |
| F-10 | Logistics Zone Reports (F/M/B) | P0 | Logistics |
| F-11 | Frontline Pressure Report | P0 | Strategist, Casual |
| F-12 | Mobile-Responsive Design | P0 | All |
| F-13 | Live Activity Feed | P1 | Casual, Partisan |
| F-14 | Hotspot Indicator | P1 | Casual, Strategist |
| F-15 | Global Player Count | P1 | Casual |
| F-16 | True "What Changed" Reports | P1 | Casual, Strategist |
| F-17 | Multi-Shard Support | P1 | All |
| F-18 | Per-Region Drill-Down | P2 | Logistics, Partisan, Strategist |
| F-19 | Casualty Rate Trend Chart | P2 | Strategist, Casual |
| F-20 | Distance & Travel Time Tool | P2 | Logistics, Partisan |
| F-21 | Weapon & Structure Range Visualisation | P2 | Strategist, Partisan |
| F-22 | "Returning Player" Summary | P2 | Casual |
| F-23 | Supply Chain Visualisation | P3 | Logistics |
| F-24 | Capability Balance Dashboard | P3 | Strategist, Partisan |
| F-25 | Map Annotation & Drawing Tools | P3 | Logistics, Strategist, Partisan |
| F-26 | Victory Point Tracking | P3 | Casual, Strategist |
| F-27 | Shareable Deep Links | P3 | All |
| F-28 | Report Panel UX (Mobile) | P4 | All |
| F-29 | Onboarding & Contextual Help | P4 | Casual |
| F-30 | Data Freshness Indicators | P4 | Casual, Strategist |
| F-31 | Accessibility & Colour-Blind Mode | P4 | All |

---

## Dependencies

Some features depend on others being in place first:

| Feature | Depends on |
|---------|-----------|
| F-16 True Change Reports | Requires historical snapshot storage to be implemented before diffs can be computed |
| F-22 Returning Player Summary | Depends on F-16 (True Change Reports) for its underlying data |
| F-19 Casualty Rate Trend Chart | Requires time-series storage of warReport data |
| F-13 Live Activity Feed | Requires continuous polling and event diffing of dynamic map data |
| F-25 Map Annotation & Drawing | F-27 (Shareable Deep Links) is required for the share-plan user flow |

---

## Competitive Positioning Note

SigilHQ's crowdsourced screenshot intelligence — faction tech progression, storage contents, and base inventories — is data the public War API does not expose. This creates a structural advantage for SigilHQ with partisan and high-engagement strategy players that cannot be closed through the API alone. Foxhole Report's counter-position is not to replicate this data, but to be the app that requires **zero setup** and delivers the maximum value from publicly available data, presented beautifully on mobile. No login, no Discord, no screenshot submissions — just open the app and understand the war.

---

*Document generated from the Foxhole App Comparison analysis (March 2026). Scores and competitive assessments are based on app state at time of analysis and should be re-evaluated as apps are updated.*
