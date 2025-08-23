import fetch from 'node-fetch';
import unzipper from 'unzipper';
import csvParser from 'csv-parser';
import fs from 'fs';
import path from 'path';

const GTFS_STATIC_URL = process.env.GTFS_STATIC_URL || '';
if (!GTFS_STATIC_URL) {
  console.error('GTFS_STATIC_URL environment variable not set');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

async function ensureDataDir() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
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

  await ensureDataDir();
  await fs.promises.writeFile(path.join(DATA_DIR, 'stops.json'), JSON.stringify(stops, null, 2));
  await fs.promises.writeFile(path.join(DATA_DIR, 'routes.json'), JSON.stringify(routes, null, 2));
  console.log(`Ingested ${stops.length} stops and ${routes.length} routes.`);
}

if (require.main === module) {
  ingest().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
