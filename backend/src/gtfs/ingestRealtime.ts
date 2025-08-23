import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { transit_realtime } from 'gtfs-realtime-bindings';

const GTFS_RT_URL = process.env.GTFS_RT_URL || '';
if (!GTFS_RT_URL) {
  console.error('GTFS_RT_URL environment variable not set');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

async function ensureDataDir() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
}

async function ingestRealtime() {
  console.log(`Downloading GTFS-RT feed from ${GTFS_RT_URL}`);
  const res = await fetch(GTFS_RT_URL);
  if (!res.ok) {
    throw new Error(`Failed to download GTFS-RT feed: ${res.statusText}`);
  }
  const buffer = await res.arrayBuffer();
  const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
  const vehicles = feed.entity
    .filter(e => e.vehicle && e.vehicle.position)
    .map(e => ({
      id: e.id,
      lat: e.vehicle!.position!.latitude,
      lon: e.vehicle!.position!.longitude,
      bearing: e.vehicle!.position!.bearing,
      timestamp: e.vehicle!.timestamp ? Number(e.vehicle!.timestamp) : undefined
    }));

  await ensureDataDir();
  await fs.promises.writeFile(
    path.join(DATA_DIR, 'vehicles.json'),
    JSON.stringify(vehicles, null, 2)
  );
  console.log(`Ingested ${vehicles.length} vehicle positions.`);
}

if (require.main === module) {
  ingestRealtime().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
