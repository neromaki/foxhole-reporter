# Foxhole Report — Archetype Review Checklist

Use this checklist to evaluate Foxhole Report from the perspective of each player archetype as you build. For each review session, work through the **Key Questions** and tick off **Gap Items** as they are addressed. Update the **Current Score** when meaningful progress has been made.

**How to use with an AI assistant:** Share this file and describe the feature(s) you have just built (or are planning to build). Ask: *"Does this address any of the gap items below, and does it meaningfully change the score for any archetype?"* You do not need to have shipped the feature — design descriptions and wireframes are sufficient for a gap assessment.

**Baseline scores** (February 2026, before any new development):

| Archetype | Baseline | Current | Target |
|-----------|----------|---------|--------|
| Casual | 4 / 10 | | 8 / 10 |
| Logistics | 6 / 10 | | 8 / 10 |
| Partisan | 5 / 10 | | 7 / 10 |
| Strategy | 5 / 10 | | 8 / 10 |

---

## Archetype 1 — The Casual

> **Goal:** Understand the current war state at a glance, see what has happened recently, and identify where to deploy.

### Key Questions

These are the questions a casual player needs the app to answer. A score of 8+ requires all three to be fully answered.

| # | Question | Answered? | Notes |
|---|----------|-----------|-------|
| 1 | **What is the overall war state right now?** (territory balance, war score, time remaining) | ✅ Baseline | |
| 2 | **What happened while I was away?** (events, captures, losses since last visit) | ❌ Not yet | Core gap |
| 3 | **Where is the fighting happening right now, and where should I deploy?** | ❌ Not yet | Core gap |

### Gap Items (from roadmap)

Tick each item when it is meaningfully addressed in the app.

- [ ] **P1 — Live Activity Feed:** A real-time or near-real-time feed of structure captures, losses, and construction events, filterable by region or event type.
- [ ] **P1 — "What Changed" Reports:** Time-windowed reports that show *differences* from a previous state (territory gained/lost, structures built/destroyed) rather than a snapshot of current state.
- [ ] **P1 — Hotspot Indicator:** A ranked list or map highlight showing the 5–10 most active regions by casualty rate, with a direct way to navigate to them.
- [ ] **P3 — Returning Player Report:** A personalised summary generated from a "how long were you away?" prompt — territory changes, key events, momentum shift, and a deployment recommendation.
- [ ] **P4 — Report Panel UX (mobile):** The report panel does not overlap the map on small screens; mobile users can switch between map and report without losing context.
- [ ] **P4 — Shareable Deep Links:** A URL that opens the app to a specific report or map state, so players can share a situation with their regiment.

### Scoring Guidance

| Score | Condition |
|-------|-----------|
| 4 (baseline) | War state visible; no events feed; no hotspot; no change reports |
| 5 | Any one of the three key questions newly answered |
| 6 | Two of three key questions answered |
| 7 | All three key questions answered, but with friction (e.g. mobile UX issues remain) |
| 8 | All three key questions answered smoothly on mobile; returning-player report exists |
| 9–10 | Deep links, push notifications, and personalised deployment recommendations |

---

## Archetype 2 — The Logistics Officer

> **Goal:** Identify resource extraction hubs, understand manufacturing capacity, and plan supply routes from backline to frontline.

### Key Questions

| # | Question | Answered? | Notes |
|---|----------|-----------|-------|
| 1 | **Where are the resource nodes, refineries, and factories relative to each other?** | ✅ Baseline | Resource layer exists |
| 2 | **How far is it from point A to point B, and how long will it take by truck / barge / ironship?** | ❌ Not yet | Core gap |
| 3 | **Which supply corridors are under threat or actively contested?** | ⚠️ Partial | Frontline/Midline/Backline views exist but no threat overlay on routes |

### Gap Items

- [ ] **P2 — Distance & Travel Time Tool:** A click-to-measure tool on the map with a vehicle selector (logistics truck road/offroad, barge, ironship, flatbed) that calculates travel time.
- [ ] **P2 — Per-Region Drill-Down:** Clicking a hex opens a detail panel showing that region's structures, resource nodes, casualty rate, and recent events — essential for assessing whether a supply hub is safe.
- [ ] **P3 — Supply Chain Visualisation:** A map overlay that visually connects resource nodes → refineries → factories → seaports/storage, showing the logical flow of materials through a region.
- [ ] **P4 — Shareable Deep Links:** Logistics players frequently share route plans with their regiment; deep links to specific map states are high-value for this archetype.

### Scoring Guidance

| Score | Condition |
|-------|-----------|
| 6 (baseline) | Logistics zone views (F/M/B) exist; resource layer visible; no measurement tools |
| 7 | Distance measurement tool added (even without vehicle time calculator) |
| 8 | Distance + travel time calculator; per-region drill-down available |
| 9 | Supply chain visualisation overlay; shareable route links |

---

## Archetype 3 — The Partisan

> **Goal:** Identify high-value enemy targets — production facilities, supply depots, seaports — and plan disruptive strikes behind enemy lines.

### Key Questions

| # | Question | Answered? | Notes |
|---|----------|-----------|-------|
| 1 | **What high-value structures does the enemy have, and where are they?** | ⚠️ Partial | Enemy capability reports exist but no per-structure map drill-down |
| 2 | **Which enemy structures are newly built (and therefore likely poorly defended)?** | ❌ Not yet | Core gap |
| 3 | **What is the safest approach route to a target, and what range do I need to worry about?** | ❌ Not yet | No range visualisation or route tools |

### Gap Items

- [ ] **P1 — Live Activity Feed (construction events):** Newly built structures appear in the event feed, allowing partisans to identify fresh targets before they are fortified.
- [ ] **P2 — Per-Region Drill-Down:** Clicking into a region reveals the specific structures present — essential for target selection.
- [ ] **P2 — Distance Tool:** Measuring approach distances and identifying safe corridors requires a distance tool.
- [ ] **P3 — Capability Balance Dashboard:** A side-by-side count of warden vs. colonial structures by type (storm cannons, factories, refineries, intel centres) gives partisans an at-a-glance view of what is worth striking.
- [ ] **P3 — Weapon Range Visualisation (future):** Placing a range circle on a structure to understand detection or fire coverage — this is currently a FoxholeHQ exclusive and would be a significant differentiator.

### Scoring Guidance

| Score | Condition |
|-------|-----------|
| 5 (baseline) | Enemy capability reports visible; no drill-down; no range tools; no construction events |
| 6 | Per-region drill-down added (can see specific structures in a hex) |
| 7 | Live feed includes construction events; distance tool available |
| 8 | Capability balance dashboard; newly built structures highlighted |
| 9 | Weapon range visualisation |

---

## Archetype 4 — The Strategist

> **Goal:** Assess frontline strength and weakness, understand the balance of capabilities across the map, and identify offensive opportunities and defensive vulnerabilities.

### Key Questions

| # | Question | Answered? | Notes |
|---|----------|-----------|-------|
| 1 | **Where are the frontline weak points — regions with high pressure and thin defences?** | ⚠️ Partial | Frontline Pressure report exists; no defence density overlay |
| 2 | **Is the enemy getting stronger or weaker? Where is momentum shifting?** | ❌ Not yet | Reports are snapshots; no trend data |
| 3 | **What is the overall capability balance — how do our air, naval, and artillery assets compare to theirs?** | ⚠️ Partial | Capability reports exist but show counts, not trends or relative balance |

### Gap Items

- [ ] **P1 — "What Changed" Reports:** Strategy players need to see territory changes over time, not just current state. A hex-diff view showing which regions changed hands in the last 24h is the minimum viable version.
- [ ] **P2 — Casualty Rate Trend Chart:** A line chart of warden vs. colonial casualty rates over 24–72 hours, showing whether momentum is shifting. This is the single most important strategic indicator not currently available.
- [ ] **P2 — Per-Region Drill-Down:** Clicking a contested hex to see its structure density, casualty rate, and recent events is essential for assessing whether a frontline is holding.
- [ ] **P3 — Capability Balance Dashboard:** A structured side-by-side view of key capability categories (aircraft, naval vessels, storm cannons, intel centres, factories) expressed as counts and as a ratio — gives strategists an at-a-glance assessment without map interpretation.
- [ ] **P3 — Frontline Momentum Indicator:** A per-region indicator showing the direction of territory change over the last 24h (gaining / stable / losing), displayed directly on the map or in the Frontline Pressure report.

### Scoring Guidance

| Score | Condition |
|-------|-----------|
| 5 (baseline) | Frontline Pressure and Capability reports exist as snapshots; no trends |
| 6 | "What Changed" hex-diff view added for territory changes |
| 7 | Casualty trend chart added; per-region drill-down available |
| 8 | Capability balance dashboard; frontline momentum indicators on map |
| 9 | All of the above plus weapon range visualisation for defensive analysis |

---

## How to Run a Review Session

A review session should take 10–20 minutes. You do not need to have shipped anything — you can review a feature you are *planning* to build.

**Prompt template for use with an AI assistant:**

> I am building [describe the feature or change]. Here is the current state of Foxhole Report: [brief description or link]. Using the archetype review checklist, assess whether this feature addresses any of the gap items, and give me an updated score for each affected archetype. If the feature partially addresses a gap, explain what would be needed to fully close it.

**What to bring to a review session:**

- A description of what you have built or are planning to build (screenshots, wireframes, or a written description all work)
- Any specific archetype you are most concerned about
- The current version of this checklist (so the AI has the baseline context)

**When to run a review:**

- Before starting a new feature — to confirm it serves at least one archetype's key questions
- After shipping a feature — to update scores and identify the next highest-value gap
- When you feel stuck on what to build next — the lowest-scoring archetype with the highest-priority unchecked items is your answer

---

## Review Log

Use this section to record each review session. Copy the score row after each session.

| Date | Feature reviewed | Casual | Logistics | Partisan | Strategy | Notes |
|------|-----------------|--------|-----------|----------|----------|-------|
| Feb 2026 | Baseline (pre-development) | 4 | 6 | 5 | 5 | Initial analysis |
| | | | | | | |
| | | | | | | |
