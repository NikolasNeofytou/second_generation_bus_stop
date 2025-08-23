import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || '';
const pool = new Pool({ connectionString });

async function run() {
  const sqlPath = path.join(__dirname, '..', 'migrations', '001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  await pool.query(sql);
  await pool.end();
  console.log('Migrations applied');
}

if (require.main === module) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
