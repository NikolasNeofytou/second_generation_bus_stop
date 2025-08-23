# Backend Architecture & Guide

This backend powers the Cyprus Bus Stop App using **Express** and **TypeScript**.
It exposes REST endpoints backed by data ingested from GTFS static feeds and
a GTFS‑RT real‑time feed.

## Overview
- **Server**: `src/index.ts` creates an Express app and serves bus stop, route,
  vehicle, alert and arrival information.
- **Ingestion Scripts**:
  - `src/gtfs/ingestStatic.ts` downloads a GTFS ZIP, extracts `stops.txt` and
    `routes.txt`, and stores them as JSON under `data/`.
  - `src/gtfs/ingestRealtime.ts` fetches a GTFS‑RT feed and writes vehicle
    positions and alerts to `data/vehicles.json` and `data/alerts.json`.
- **Data Loading**: The server reads JSON from `data/` at startup. Alerts are
  cached in memory for 60 seconds when served.
- **Endpoints**:
  - `GET /` – health message.
  - `GET /stops` – list of all stops.
  - `GET /routes` – list of routes.
  - `GET /vehicles` – latest vehicle positions.
  - `GET /alerts` – latest service alerts (cached for 60s).
  - `GET /arrivals/:stopId` – approximate ETAs for a stop based on vehicle
    distance calculations.

## Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Ingest static GTFS data:
   ```bash
   GTFS_STATIC_URL=<feed_url> npm run ingest:gtfs
   ```
3. Ingest real‑time vehicle positions and alerts:
   ```bash
   GTFS_RT_URL=<feed_url> npm run ingest:gtfs-rt
   ```
4. Start the server in development mode:
   ```bash
   npm run dev
   ```
   The server listens on `PORT` (defaults to `3001`).
5. Run tests:
   ```bash
   npm test
   ```

## Project Structure
```
backend/
├── data/                # Generated JSON data from ingestion scripts
├── src/
│   ├── gtfs/            # GTFS ingestion scripts
│   ├── index.ts         # Express application
│   └── index.test.ts    # API tests
└── package.json
```

This document provides a quick reference for contributors working on the
backend service.
