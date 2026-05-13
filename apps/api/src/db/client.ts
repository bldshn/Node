import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ─────────────────────────────────────────────────────────────
// CRITICAL: Connection pool is instantiated OUTSIDE the handler
// This ensures it persists across warm invocations and prevents
// connection exhaustion under load.
// ─────────────────────────────────────────────────────────────

export let pool: Pool;

/**
 * Initialize the connection pool.
 * Must be called before any database operations.
 */
export function initializePool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'ecommerce',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: parseInt(process.env.DB_POOL_MAX || '5', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

/**
 * Get the pool instance, initializing if necessary.
 */
export function getPool(): Pool {
  return pool || initializePool();
}

/**
 * Execute a query against the pool.
 */
export async function query<T = any>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const client = getPool();
  const result = await client.query<T>(text, params);
  return result.rows;
}

/**
 * Get a client for transactions or complex operations.
 */
export async function getClient(): Promise<PoolClient> {
  const client = getPool();
  return client.connect();
}

/**
 * Execute a callback within a transaction.
 * Automatically rolls back on error.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;

