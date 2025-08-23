import { Pool } from 'pg';
import { createClient } from 'redis';

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

export const redisClient = process.env.REDIS_URL
  ? createClient({ url: process.env.REDIS_URL })
  : null;

if (redisClient) {
  redisClient.connect().catch(err => {
    console.error('Redis connection error', err);
  });
}
