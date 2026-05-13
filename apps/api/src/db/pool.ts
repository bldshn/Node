// ─────────────────────────────────────────────────────────────
// Re-export from client.ts for convenience
// The actual pool is defined there following the singleton pattern
// ─────────────────────────────────────────────────────────────

export { pool, getPool, initializePool, query, getClient, withTransaction } from './client';

