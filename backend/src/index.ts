import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import { pool, redisClient } from './db';
import { ticketsRouter } from './ticketing';

import path from 'path';

export const app = express();
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '..', '..', 'data');



function loadJson(fileName: string) {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Failed to load ${fileName} from ${DATA_DIR}`, err);
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
  // Try Redis cache first
  if (redisClient) {
    const cached = await redisClient.get('vehicles');
    if (cached) return JSON.parse(cached);
  }
  // Then DB
  const vehicles = await query<any>('SELECT * FROM vehicles');
  if (vehicles.length) {
    if (redisClient) {
      await redisClient.set('vehicles', JSON.stringify(vehicles), { EX: 30 });
    }
    return vehicles;
  }
  // Finally, fallback to file-based data for local/demo mode
  const fileVehicles = loadJson('vehicles.json');
  return Array.isArray(fileVehicles) ? fileVehicles : [];
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

// Ticketing endpoints (dev/demo)
app.use('/tickets', ticketsRouter);

app.get('/stops', async (_req: Request, res: Response) => {
  const stops = await query<any>('SELECT * FROM stops');
  if (stops.length) return res.json(stops);
  // Fallback to file-based stops if DB is not configured
  const fileStops = loadJson('stops.json');
  return res.json(Array.isArray(fileStops) ? fileStops : []);
});

app.get('/routes', async (_req: Request, res: Response) => {
  const routes = await query<any>('SELECT * FROM routes');
  if (routes.length) return res.json(routes);
  const fileRoutes = loadJson('routes.json');
  return res.json(Array.isArray(fileRoutes) ? fileRoutes : []);
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

// Shapes for route polylines
app.get('/shapes', async (_req: Request, res: Response) => {
  // DB support can be added later; for now serve file fallback
  const fileShapes = loadJson('shapes.json');
  return res.json(Array.isArray(fileShapes) ? fileShapes : []);
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

interface BoardStatus {
  uptime: number;
  firmwareVersion: string;
  timestamp: number;
}

const boardStatuses: BoardStatus[] = [];

app.post('/board-status', (req: Request, res: Response) => {
  const { uptime, firmwareVersion } = req.body || {};
  if (typeof uptime !== 'number' || typeof firmwareVersion !== 'string') {
    return res.status(400).json({ error: 'Invalid status payload' });
  }
  const status: BoardStatus = {
    uptime,
    firmwareVersion,
    timestamp: Date.now(),
  };
  boardStatuses.push(status);
  res.status(201).json(status);
});

app.get('/board-status', (_req: Request, res: Response) => {
  res.json(boardStatuses);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
  });
}
