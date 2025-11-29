# Foxhole Reporter

Interactive React + Leaflet map overlaying Foxhole WarAPI territory data with daily and weekly change reports. Frontend is a static Vite + TypeScript app deployable to GitHub Pages. Backend data collection & diff generation runs via Supabase Edge Functions and Postgres tables.

## Tech Stack
- Vite + React + TypeScript
- TailwindCSS for styling
- Leaflet + React-Leaflet for interactive map
- TanStack Query for data fetching/cache
- Zustand for lightweight state (layer toggles)
- Supabase (Postgres, Edge Functions)

## Data Flow
1. `poll-warapi` Edge Function (scheduled every N minutes) fetches WarAPI territory data and inserts a snapshot row.
2. `diff-territory` Edge Function (daily + weekly cron) computes ownership changes between latest and snapshots ~24h / ~7d old and stores diffs.
3. Frontend queries `snapshots` for latest map & `territory_diffs` for overlays indicating changed tiles.

## Setup (Frontend)
```powershell
git clone https://github.com/youruser/foxhole-reporter.git
cd foxhole-reporter
cp .env.example .env  # Add Supabase anon details
pnpm install  # or npm install / yarn
pnpm dev
```

Environment variables in `.env`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Supabase Configuration
Run migrations:
```powershell
supabase migration up
```

Deploy functions:
```powershell
supabase functions deploy poll-warapi
supabase functions deploy diff-territory
```

Add scheduled triggers (Supabase Dashboard -> Functions -> Schedules):
- poll-warapi: every 15m (adjust) POST
- diff-territory: daily 00:05 UTC and weekly Monday 00:10 UTC POST

## GitHub Pages Deployment
Add repo settings: Pages -> Build from GitHub Actions. Workflow below builds and publishes `dist/`.

## Future Enhancements
- Accurate coordinate projection mapping game world to lat/lng.
- Additional layers (mining nodes, logistics hubs) sourced from community datasets.
- Websocket / Realtime channel to push new snapshots.

## License
MIT (add a LICENSE file if desired).
# foxhole-reporter



# TODO
## Data
- Fetch dynamic data in a more efficient manner
- Enable ETags and caching on the WarAPI
- Store snapshops in Supabase

## Icons & filters
- Implement tags to match icons to filters
    - Don't refetch dynamic data when adjusting filters
- Color icons based on faction ownership

## Additional map data
- Draw hex subregions as vectorLayer