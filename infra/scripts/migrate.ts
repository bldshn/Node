#!/usr/bin/env ts-node
/**
 * Legacy migration script — use infra/scripts/runMigrations.ts instead
 * This file is kept for backward compatibility.
 */
import { spawn } from 'child_process';
import path from 'path';

const runMigrationsPath = path.join(__dirname, 'runMigrations.ts');

const child = spawn('ts-node', [runMigrationsPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    TS_NODE_PROJECT: path.join(__dirname, '../tsconfig.json'),
  },
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (error) => {
  console.error('Failed to run migrations:', error);
  process.exit(1);
});

