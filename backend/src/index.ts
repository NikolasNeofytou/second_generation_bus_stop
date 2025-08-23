import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const app = express();
const port = process.env.PORT || 3001;

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadJson(filename: string) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8')
    );
  } catch {
    return [];
  }
}

const stops = loadJson('stops.json');
const routes = loadJson('routes.json');
const vehicles = loadJson('vehicles.json');

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

app.get('/stops', (_req: Request, res: Response) => {
  res.json(stops);
});

app.get('/routes', (_req: Request, res: Response) => {
  res.json(routes);
});

app.get('/vehicles', (_req: Request, res: Response) => {
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

app.get('/arrivals/:stopId', (req: Request, res: Response) => {
  const stopId = req.params.stopId;
  const stop = stops.find((s: any) => s.stop_id === stopId);
  if (!stop) {
    return res.status(404).json({ error: 'Stop not found' });
  }
  const stopLat = parseFloat(stop.stop_lat);
  const stopLon = parseFloat(stop.stop_lon);
  const SPEED_METERS_PER_MIN = 250; // ~15 km/h
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
