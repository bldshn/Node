import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbClient(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'ecommerce',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
  }
  return pool;
}

export async function closeDbClient(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query(text: string, params?: unknown[]): Promise<unknown[]> {
  const client = getDbClient();
  const result = await client.query(text, params);
  return result.rows;
}
