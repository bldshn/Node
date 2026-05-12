import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'ecommerce',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigrations() {
  try {
    console.log('Starting database migrations...');

    const migrationPath = join(__dirname, '../../apps/api/src/db/migrations/001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    await pool.query(migrationSQL);

    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
