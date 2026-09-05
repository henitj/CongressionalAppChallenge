/**
 * Loads `server/.env` into process.env — no dependencies.
 *
 * This is what makes linking Neon a two-minute job:
 *
 *   cp .env.example .env    # paste your Neon connection string
 *   npm run migrate         # creates the tables
 *   npm start
 *
 * Node only reads real environment variables, so without this file those
 * `KEY=value` lines in .env would silently do nothing. Real environment
 * variables always win over .env, so a platform (Render, Railway, Fly) that
 * injects DATABASE_URL itself is never overridden.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, '.env');

try {
  const text = readFileSync(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Strip matching surrounding quotes, if the pasted value has them.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
} catch {
  // No .env file — fine. Everything can also come from real environment
  // variables, which is how hosted platforms do it.
}
