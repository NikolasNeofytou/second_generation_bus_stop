import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
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

app.get('/', (_req, res) => {
  res.send('Cyprus Bus Stop API');
});

app.get('/stops', (_req, res) => {
  res.json(stops);
});

app.get('/routes', (_req, res) => {
  res.json(routes);
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
