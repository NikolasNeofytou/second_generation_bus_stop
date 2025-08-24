import 'dotenv/config';
import { ingestSIRI } from './ingestSIRI';

const INTERVAL = Number(process.env.SIRI_POLL_INTERVAL_MS || process.env.GTFS_RT_INTERVAL_MS || 15000);

async function loop() {
  try {
    await ingestSIRI();
  } catch (err) {
    console.error('SIRI poll error:', err);
  } finally {
    setTimeout(loop, INTERVAL);
  }
}

loop();
