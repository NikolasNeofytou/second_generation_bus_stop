import 'dotenv/config';
import unzipper from 'unzipper';
import csvParser from 'csv-parser';
import { pool } from '../db';
import fs from 'fs';
import path from 'path';

const DEBUG = process.env.DEBUG_GTFS === '1';
const urlsEnv = process.env.GTFS_STATIC_URLS || process.env.GTFS_STATIC_URL || '';
if (!urlsEnv) {
  console.error('GTFS_STATIC_URLS or GTFS_STATIC_URL environment variable not set');
  process.exit(1);
}
const GTFS_STATIC_URLS = urlsEnv.split(',').map(s => s.trim()).filter(Boolean);

async function parseCsvFromZip(zip: unzipper.CentralDirectory, filename: string): Promise<any[]> {
  // Find by basename, case-insensitive, anywhere in the zip
  const target = filename.toLowerCase();
  const file = zip.files.find(f => {
    const p = f.path.replace(/\\/g, '/').toLowerCase();
    const base = p.split('/').pop() || p;
    return base === target;
  });
  if (!file) {
    if (DEBUG) {
      console.warn(`File ${filename} not found in zip. Available files:`, zip.files.map(f => f.path).join(', '));
    } else {
      console.warn(`File ${filename} not found in zip.`);
    }
    return [];
  }
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    file.stream()
      .pipe(csvParser())
      .on('data', (row) => {
        const norm: any = {};
        for (const k of Object.keys(row)) {
          const cleanKey = k.replace(/\uFEFF/g, '').trim().toLowerCase();
          norm[cleanKey] = row[k];
        }
        records.push(norm);
      })
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

async function ingest() {
  const allStops: any[] = [];
  const allRoutes: any[] = [];
  const allShapes: any[] = [];

  for (const url of GTFS_STATIC_URLS) {
    console.log(`Downloading GTFS from ${url}`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed to download GTFS feed: ${res.status} ${res.statusText}`);
        continue;
      }
      const buffer = await res.arrayBuffer();
      let zip: unzipper.CentralDirectory;
      try {
        zip = await unzipper.Open.buffer(Buffer.from(buffer));
      } catch (e) {
        console.error('Failed to open ZIP. Is this a valid GTFS zip?', e);
        continue;
      }
      if (DEBUG) {
        console.log('ZIP contains files:', zip.files.map(f => f.path).join(', '));
      }
      const [stops, routes, shapes] = await Promise.all([
        parseCsvFromZip(zip, 'stops.txt'),
        parseCsvFromZip(zip, 'routes.txt'),
        parseCsvFromZip(zip, 'shapes.txt')
      ]);
      console.log(`Parsed ${stops.length} stops, ${routes.length} routes and ${shapes.length} shapes from this feed.`);
      allStops.push(...stops);
      allRoutes.push(...routes);
      allShapes.push(...shapes);
    } catch (err) {
      console.error('Error processing GTFS URL', url, err);
      continue;
    }
  }

  // Deduplicate by primary keys
  const stopsMap = new Map<string, any>();
  for (const s of allStops) {
    const id = s.stop_id || s["stop_id"]; // still support original just in case
    if (id) stopsMap.set(id, s);
  }
  const routesMap = new Map<string, any>();
  for (const r of allRoutes) {
    const id = r.route_id || r["route_id"];
    if (id) routesMap.set(id, r);
  }

  const stops = Array.from(stopsMap.values());
  const routes = Array.from(routesMap.values());

  // Group shapes by shape_id and sort by shape_pt_sequence
  const shapesGrouped: Record<string, { lat: number; lon: number }[]> = {};
  for (const sh of allShapes) {
    const id = sh.shape_id;
    if (!id) continue;
    const seq = Number(sh.shape_pt_sequence ?? sh.shape_pt_sequence);
    const lat = Number(sh.shape_pt_lat ?? sh.shape_pt_lat);
    const lon = Number(sh.shape_pt_lon ?? sh.shape_pt_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (!shapesGrouped[id]) shapesGrouped[id] = [] as any[];
    // Temporarily store with sequence to sort; we’ll clean after
    (shapesGrouped[id] as any).push({ seq, lat, lon });
  }
  const shapes: { shape_id: string; points: { lat: number; lon: number }[] }[] = [];
  for (const [id, arr] of Object.entries(shapesGrouped)) {
    const pts = (arr as any[])
      .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
      .map(({ lat, lon }) => ({ lat, lon }));
    if (pts.length) shapes.push({ shape_id: id, points: pts });
  }

  if (pool) {
    try {
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
    } catch (err) {
      console.error('Database not available; skipping DB writes for static GTFS ingest.', err);
    }
  }
  // Write JSON fallbacks for local/dev usage only if we parsed something
  // Keep fallbacks colocated with the backend so the API can serve them without DB
  const DATA_DIR = path.join(__dirname, '..', '..', 'data');
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  if (stops.length > 0) {
    await fs.promises.writeFile(path.join(DATA_DIR, 'stops.json'), JSON.stringify(stops, null, 2));
  } else {
    console.warn('No stops parsed; keeping existing data/stops.json if present.');
  }
  if (routes.length > 0) {
    await fs.promises.writeFile(path.join(DATA_DIR, 'routes.json'), JSON.stringify(routes, null, 2));
  } else {
    console.warn('No routes parsed; keeping existing data/routes.json if present.');
  }
  if (shapes.length > 0) {
    await fs.promises.writeFile(path.join(DATA_DIR, 'shapes.json'), JSON.stringify(shapes, null, 2));
  } else {
    console.warn('No shapes parsed; keeping existing data/shapes.json if present.');
  }

  console.log(`Ingested ${stops.length} stops, ${routes.length} routes and ${shapes.length} shapes (from ${GTFS_STATIC_URLS.length} feeds).`);
}

if (require.main === module) {
  ingest().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
