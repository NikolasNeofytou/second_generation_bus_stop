# Cyprus Bus Stop App

This project aims to provide real-time bus information for Cyprus, including routes, stops, and live vehicle locations.

The repository currently contains:

- `backend`: an Express + TypeScript server skeleton
- `frontend`: a Next.js + TypeScript application

- `backend/src/gtfs/ingestStatic.ts`: downloads a GTFS static feed and writes routes and stops to JSON files
To ingest a GTFS feed: `cd backend && GTFS_STATIC_URL=<feed_url> npm run ingest:gtfs`

See [TODO.md](TODO.md) for the full roadmap.
