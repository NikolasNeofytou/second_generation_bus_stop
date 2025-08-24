import 'dotenv/config';
import { transit_realtime } from 'gtfs-realtime-bindings';
import { pool, redisClient } from '../db';
import fs from 'fs';
import path from 'path';

const GTFS_RT_URL = process.env.GTFS_RT_URL || '';
const GTFS_RT_HEADERS = process.env.GTFS_RT_HEADERS ? JSON.parse(process.env.GTFS_RT_HEADERS) as Record<string,string> : undefined;
if (!GTFS_RT_URL) {
  console.error('GTFS_RT_URL environment variable not set');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

async function ensureDataDir() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
}

export async function ingestRealtime() {
  const base = GTFS_RT_URL;
  const needsAppend = /gtfs-realtime\/?$/i.test(base);
  const url = needsAppend ? `${base.replace(/\/?$/, '')}/VehiclePositions` : base;
  console.log(`Downloading GTFS-RT feed from ${url}`);
  const res = await fetch(url, { headers: GTFS_RT_HEADERS });
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
      const headerTranslations: Record<string, string> = {};
      for (const tr of alert.headerText?.translation ?? []) {
        const lang = (tr.language ?? undefined) as string | undefined;
        const text = (tr.text ?? undefined) as string | undefined;
        if (lang && text) headerTranslations[lang] = text;
      }
      const descriptionTranslations: Record<string, string> = {};
      for (const tr of alert.descriptionText?.translation ?? []) {
        const lang = (tr.language ?? undefined) as string | undefined;
        const text = (tr.text ?? undefined) as string | undefined;
        if (lang && text) descriptionTranslations[lang] = text;
      }
      const url = alert.url?.translation?.[0]?.text;
      return {
        id: e.id,
        headerTranslations,
        descriptionTranslations,
        url,
        effect: alert.effect,
        severity: alert.severityLevel,
      };
    });

  // Persist vehicles to DB when available
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM vehicles');
        if (vehicles.length) {
          const values: string[] = [];
          const params: any[] = [];
          let i = 1;
          for (const v of vehicles) {
            values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
            params.push(v.id, v.lat, v.lon, v.bearing ?? null, v.timestamp ?? null);
          }
          await client.query(
            `INSERT INTO vehicles (id, lat, lon, bearing, timestamp) VALUES ${values.join(',')}`,
            params
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Failed to persist vehicles to DB:', err);
    }
  }

  // Cache vehicles in Redis for fast reads
  if (redisClient) {
    try {
      await redisClient.set('vehicles', JSON.stringify(vehicles), { EX: 30 });
    } catch (err) {
      console.error('Failed to cache vehicles in Redis:', err);
    }
  }

  // Always write alerts and vehicles to disk as a fallback
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
