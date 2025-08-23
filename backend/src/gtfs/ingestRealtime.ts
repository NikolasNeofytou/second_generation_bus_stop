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


  const alerts = feed.entity
    .filter(e => e.alert)
    .map(e => {
      const alert = e.alert!;
      const header = alert.header_text?.translation?.[0]?.text;
      const description = alert.description_text?.translation?.[0]?.text;
      const url = alert.url?.translation?.[0]?.text;
      return {
        id: e.id,
        header,
        description,
        url,
        effect: alert.effect,
        severity: alert.severity_level,
      };
    });

  await ensureDataDir();
  await fs.promises.writeFile(
    path.join(DATA_DIR, 'vehicles.json'),
    JSON.stringify(vehicles, null, 2)
  );
  await fs.promises.writeFile(
    path.join(DATA_DIR, 'alerts.json'),
    JSON.stringify(alerts, null, 2)
  );

  console.log(`Ingested ${vehicles.length} vehicle positions.`);
  console.log(`Ingested ${alerts.length} alerts.`);
}

if (require.main === module) {
  ingestRealtime().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
