# Backend

## Run with real government data (Windows PowerShell)

1. Start Postgres and Redis (Docker):
   - `docker compose up -d db redis`

2. Create `.env` from `.env.example` and set:
   - `DATABASE_URL=postgres://cybus:secret@localhost:5432/cybus`
   - `REDIS_URL=redis://localhost:6379`
   - `GTFS_STATIC_URLS=<comma-separated GTFS zip URLs from motionbuscard>`
   - `GTFS_RT_URL=http://20.19.98.194:8328/Api/api/gtfs-realtime`
   - Optional `GTFS_RT_HEADERS` if keys are required (JSON string)

3. Migrate and ingest static:
```
cd backend
$env:DATABASE_URL="postgres://cybus:secret@localhost:5432/cybus"
npm run migrate
$env:GTFS_STATIC_URLS="<url1>,<url2>,..."
npm run ingest:gtfs
```

4. Start server and realtime poller (two terminals):
```
# Terminal A (server)
$env:DATABASE_URL="postgres://cybus:secret@localhost:5432/cybus"; $env:REDIS_URL="redis://localhost:6379"; $env:PORT="3001"; npm run dev

# Terminal B (poller)
$env:DATABASE_URL="postgres://cybus:secret@localhost:5432/cybus"; $env:REDIS_URL="redis://localhost:6379"; $env:GTFS_RT_URL="http://20.19.98.194:8328/Api/api/gtfs-realtime"; $env:GTFS_RT_INTERVAL_MS="15000"; npm run poll:gtfs-rt
```

5. Verify:
```
curl.exe -sS http://localhost:3001/stops | more
curl.exe -sS http://localhost:3001/vehicles | more
```

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
   - `src/siri/ingestSIRI.ts` fetches a SIRI VehicleMonitoring XML feed and writes
      vehicle positions (and optional alerts) to `data/vehicles.json` and `data/alerts.json`.
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
   Or with SIRI VehicleMonitoring:
   ```bash
   SIRI_URL=<siri_vm_url> npm run ingest:siri
   ```
   For .asmx SOAP services (like SiriWS.asmx), use:
   ```bash
   SIRI_URL=http://host/SiriWS.asmx \
   SIRI_METHOD=SOAP_VM \
   SIRI_SOAP_ACTION="http://www.siri.org.uk/siri/GetVehicleMonitoring" \
   SIRI_REQUESTOR_REF=my-client-id \
   npm run ingest:siri
   ```
4. Start the server in development mode:
   ```bash
   npm run dev
   ```
   The server listens on `PORT` (defaults to `3001`).
   For continuous polling, run in another terminal:
   ```bash
   # GTFS-RT
   GTFS_RT_URL=<feed_url> GTFS_RT_INTERVAL_MS=15000 npm run poll:gtfs-rt
   # or SIRI VehicleMonitoring
   # HTTP/XML GET
   SIRI_URL=<siri_vm_url> SIRI_POLL_INTERVAL_MS=15000 npm run poll:siri
   # SOAP .asmx
   SIRI_URL=http://host/SiriWS.asmx SIRI_METHOD=SOAP_VM SIRI_SOAP_ACTION="http://www.siri.org.uk/siri/GetVehicleMonitoring" npm run poll:siri
   ```
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
