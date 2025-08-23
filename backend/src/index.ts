import express, { Request, Response } from 'express';
import { pool, redisClient } from './db';
import fs from 'fs';
import path from 'path';

export const app = express();
const port = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function loadJson(fileName: string): any[] {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Failed to load ${fileName}`, err);
    return [];
  }
}

async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  if (!pool) return [];
  try {
    const { rows } = await pool.query(sql, params);
    return rows as T[];
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function getVehicles() {
  if (redisClient) {
    const cached = await redisClient.get('vehicles');
    if (cached) return JSON.parse(cached);
  }
  const vehicles = await query<any>('SELECT * FROM vehicles');
  if (redisClient && vehicles.length) {
    await redisClient.set('vehicles', JSON.stringify(vehicles), { EX: 30 });
  }
  return vehicles;
}

const ALERTS_TTL_MS = 60 * 1000;
let alertsCache: any[] = [];
let alertsCacheTime = 0;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.get('/', (_req: Request, res: Response) => {
  res.send('Cyprus Bus Stop API');
});

app.get('/stops', async (_req: Request, res: Response) => {
  const stops = await query<any>('SELECT * FROM stops');
  res.json(stops);
});

app.get('/routes', async (_req: Request, res: Response) => {
  const routes = await query<any>('SELECT * FROM routes');
  res.json(routes);
});

app.get('/vehicles', async (_req: Request, res: Response) => {
  const vehicles = await getVehicles();
  res.json(vehicles);
});


app.get('/alerts', (_req: Request, res: Response) => {
  const now = Date.now();
  if (now - alertsCacheTime > ALERTS_TTL_MS) {
    alertsCache = loadJson('alerts.json');
    alertsCacheTime = now;
  }
  res.json(alertsCache);
});

app.get('/arrivals/:stopId', async (req: Request, res: Response) => {

  const stopId = req.params.stopId;
  const stops = await query<any>('SELECT * FROM stops WHERE stop_id = $1', [
    stopId,
  ]);
  if (!stops.length) {
    return res.status(404).json({ error: 'Stop not found' });
  }
  const stop = stops[0];
  const stopLat = parseFloat(stop.stop_lat);
  const stopLon = parseFloat(stop.stop_lon);
  const SPEED_METERS_PER_MIN = 250; // ~15 km/h
  const vehicles = await getVehicles();
  const arrivals = vehicles
    .map((v: any) => {
      const dist = distanceMeters(stopLat, stopLon, v.lat, v.lon);
      return {
        vehicleId: v.id,
        distance: dist,
        etaMinutes: dist / SPEED_METERS_PER_MIN,
      };
    })
    .sort((a: any, b: any) => a.etaMinutes - b.etaMinutes)
    .slice(0, 5);
  res.json(arrivals);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
  });
}
