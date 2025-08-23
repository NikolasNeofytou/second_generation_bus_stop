import fetch from 'node-fetch';
import unzipper from 'unzipper';
import csvParser from 'csv-parser';
import { pool } from '../db';

const GTFS_STATIC_URL = process.env.GTFS_STATIC_URL || '';
if (!GTFS_STATIC_URL) {
  console.error('GTFS_STATIC_URL environment variable not set');
  process.exit(1);
}

async function parseCsvFromZip(zip: unzipper.CentralDirectory, filename: string): Promise<any[]> {
  const file = zip.files.find(f => f.path === filename);
  if (!file) {
    return [];
  }
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    file.stream()
      .pipe(csvParser())
      .on('data', (row) => records.push(row))
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

async function ingest() {
  console.log(`Downloading GTFS from ${GTFS_STATIC_URL}`);
  const res = await fetch(GTFS_STATIC_URL);
  if (!res.ok) {
    throw new Error(`Failed to download GTFS feed: ${res.statusText}`);
  }
  const buffer = await res.arrayBuffer();
  const zip = await unzipper.Open.buffer(Buffer.from(buffer));

  const [stops, routes] = await Promise.all([
    parseCsvFromZip(zip, 'stops.txt'),
    parseCsvFromZip(zip, 'routes.txt')
  ]);

  if (pool) {
    await pool.query('DELETE FROM stops');
    await pool.query('DELETE FROM routes');
    // Batch insert stops
    if (stops.length > 0) {
      const stopValues = [];
      const stopParams = [];
      let paramIdx = 1;
      for (const s of stops) {
        stopValues.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3})`);
        stopParams.push(s.stop_id, s.stop_name, s.stop_lat, s.stop_lon);
        paramIdx += 4;
      }
      const stopInsertQuery = `INSERT INTO stops (stop_id, stop_name, stop_lat, stop_lon) VALUES ${stopValues.join(',')}`;
      await pool.query(stopInsertQuery, stopParams);
    }
    // Batch insert routes
    if (routes.length > 0) {
      const routeValues = [];
      const routeParams = [];
      let paramIdx = 1;
      for (const r of routes) {
        routeValues.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3})`);
        routeParams.push(r.route_id, r.route_short_name, r.route_long_name, r.route_type);
        paramIdx += 4;
      }
      const routeInsertQuery = `INSERT INTO routes (route_id, route_short_name, route_long_name, route_type) VALUES ${routeValues.join(',')}`;
      await pool.query(routeInsertQuery, routeParams);
    }
  }
  console.log(`Ingested ${stops.length} stops and ${routes.length} routes.`);
}

if (require.main === module) {
  ingest().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
