# Cyprus Bus Stop App

This project aims to provide real-time bus information for Cyprus, including routes, stops, and live vehicle locations.

The repository currently contains:

- `backend`: an Express + TypeScript server skeleton with `/stops`, `/routes`, and `/vehicles` endpoints reading from ingested GTFS data
- `frontend`: a Next.js + TypeScript application

- `backend/src/gtfs/ingestStatic.ts`: downloads a GTFS static feed and writes routes and stops to JSON files
To ingest a GTFS feed: `cd backend && GTFS_STATIC_URL=<feed_url> npm run ingest:gtfs`

- `backend/src/gtfs/ingestRealtime.ts`: fetches a GTFS-RT vehicle positions feed and writes vehicle positions to JSON
To ingest a GTFS-RT feed: `cd backend && GTFS_RT_URL=<feed_url> npm run ingest:gtfs-rt`

See [TODO.md](TODO.md) for the full roadmap.
