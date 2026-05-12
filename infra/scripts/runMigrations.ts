import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function runMigrations() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'ecommerce_db',
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      '../../../apps/api/src/database/001-create-tables.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log('✓ Migration SQL loaded');

    // Run the migration
    await client.query(sql);
    console.log('✓ Migration completed successfully');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📊 Tables created:');
    result.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
