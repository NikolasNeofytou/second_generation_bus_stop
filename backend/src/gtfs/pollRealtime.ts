import { ingestRealtime } from './ingestRealtime';

const intervalMs = Number(process.env.GTFS_RT_INTERVAL_MS || 15000);

async function loop() {
  while (true) {
    const started = Date.now();
    try {
      await ingestRealtime();
    } catch (err) {
      console.error('GTFS-RT ingest failed:', err);
    }
    const elapsed = Date.now() - started;
    const wait = Math.max(1000, intervalMs - elapsed);
    await new Promise(res => setTimeout(res, wait));
  }
}

if (require.main === module) {
  loop();
}
