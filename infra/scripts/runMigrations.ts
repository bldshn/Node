import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ecommerce',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
  try {
    console.log('🔗 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    // ─────────────────────────────────────────────────────────────
    // Create migrations tracking table if it doesn't exist
    // ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Migrations table ready');

    // ─────────────────────────────────────────────────────────────
    // Read all .sql files in order
    // ─────────────────────────────────────────────────────────────
    const migrationsDir = path.join(__dirname, '../../../apps/backend/src/database');

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }

    const sqlFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (sqlFiles.length === 0) {
      console.log('⚠ No SQL migration files found');
      return;
    }

    console.log(`\n📋 Found ${sqlFiles.length} migration files:`);
    sqlFiles.forEach((file) => console.log(`  - ${file}`));

    // ─────────────────────────────────────────────────────────────
    // Run each migration
    // ─────────────────────────────────────────────────────────────
    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of sqlFiles) {
      // Check if migration has already been applied
      const result = await client.query(
        'SELECT id FROM migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`⊘ Skipping ${file} (already applied)`);
        skippedCount++;
        continue;
      }

      // Read and execute migration
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`\n⚙ Running migration: ${file}`);

      // Start transaction for this migration
      await client.query('BEGIN');

      try {
        // Execute the migration SQL
        await client.query(sql);

        // Record that this migration has been applied
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );

        await client.query('COMMIT');
        console.log(`✓ Successfully applied ${file}`);
        appliedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Failed to apply ${file}: ${(error as Error).message}`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────
    console.log('\n📊 Migration Summary');
    console.log(`  Applied: ${appliedCount}`);
    console.log(`  Skipped: ${skippedCount}`);

    if (appliedCount > 0) {
      // Verify tables were created
      const tableResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);

      console.log(`\n📋 Tables in database (${tableResult.rows.length}):`);
      tableResult.rows.forEach((row) => {
        console.log(`  - ${row.table_name}`);
      });
    }

    console.log('\n✅ Migrations complete');
  } catch (error) {
    console.error('\n❌ Migration failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();

