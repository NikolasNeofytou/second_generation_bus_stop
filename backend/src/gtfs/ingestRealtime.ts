import fetch from 'node-fetch';
import { transit_realtime } from 'gtfs-realtime-bindings';
import { pool, redisClient } from '../db';

const GTFS_RT_URL = process.env.GTFS_RT_URL || '';
if (!GTFS_RT_URL) {
  console.error('GTFS_RT_URL environment variable not set');
  process.exit(1);
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

  if (pool) {
    await pool.query('DELETE FROM vehicles');
    for (const v of vehicles) {
      await pool.query(
        'INSERT INTO vehicles (id, lat, lon, bearing, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [v.id, v.lat, v.lon, v.bearing, v.timestamp]
      );
    }
  }
  if (redisClient) {
    await redisClient.set('vehicles', JSON.stringify(vehicles), { EX: 30 });
  }
  console.log(`Ingested ${vehicles.length} vehicle positions.`);
}

if (require.main === module) {
  ingestRealtime().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
