/**
 * One command to prove your Neon database is linked and ready:
 *
 *   npm run check
 *
 * It verifies the connection string, connects, reads the server version,
 * checks whether the EcoTrek tables exist, and tells you exactly what to do
 * next. Exit code 0 means "ready", so you can also use it in CI or a
 * platform health check.
 */

import './env.js';
import { neon } from '@neondatabase/serverless';

const TABLES = [
  'users',
  'clubs',
  'club_members',
  'activities',
  'cleanups',
  'points_ledger',
];

function problemsFor(url) {
  const issues = [];
  if (!/^postgres(ql)?:\/\//.test(url)) issues.push('it does not start with postgres://');
  if (url.includes('localhost') || url.includes('127.0.0.1'))
    issues.push('it points at localhost, not Neon');
  if (!/neon\.tech/.test(url)) issues.push('it does not mention a neon.tech host');
  if (!/sslmode=require/.test(url) && /neon\.tech/.test(url))
    issues.push('it is missing ?sslmode=require (Neon requires TLS)');
  return issues;
}

async function main() {
  const url = process.env.DATABASE_URL ?? '';

  console.log('\n  EcoTrek database check\n  ──────────────────────');

  if (!url) {
    console.error(
      '  ✗ DATABASE_URL is not set.\n\n' +
        '    1. Go to console.neon.com and open your project\n' +
        '    2. Click "Connect" and copy the POOLED connection string\n' +
        '       (the host contains "-pooler")\n' +
        '    3. cp .env.example .env  and paste it as DATABASE_URL\n' +
        '    4. Run this command again\n'
    );
    process.exit(1);
  }

  const issues = problemsFor(url);
  if (issues.length) {
    console.warn('  ⚠ The connection string looks unusual:');
    for (const i of issues) console.warn(`      • ${i}`);
    console.warn('    Trying to connect anyway…\n');
  } else {
    console.log('  ✓ DATABASE_URL is set and looks like a Neon pooled string');
  }

  let sql;
  try {
    sql = neon(url);
    const rows = await sql`select version() as v, current_database() as db`;
    console.log('  ✓ Connected to Postgres:', String(rows[0].v).split(',')[0]);
    console.log('  ✓ Database:', rows[0].db);
  } catch (e) {
    console.error('  ✗ Could not connect:', e.message);
    console.error(
      '\n    Common fixes:\n' +
        '    • Use the POOLED string (host contains "-pooler") from the Neon "Connect" panel\n' +
        '    • Keep ?sslmode=require on the end\n' +
        '    • Check the branch is not archived or suspended in the Neon console\n'
    );
    process.exit(1);
  }

  const existing = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public'`;
  const names = new Set(existing.map((r) => r.table_name));
  const missing = TABLES.filter((t) => !names.has(t));

  if (missing.length === 0) {
    const userCount = await sql`select count(*)::int as n from users`;
    console.log(`  ✓ All ${TABLES.length} EcoTrek tables exist (${userCount[0].n} users signed in)`);
    console.log('\n  READY — run "npm start" and point the app at this server.\n');
    process.exit(0);
  }

  console.log(`  ✗ Missing tables: ${missing.join(', ')}`);
  console.log('\n    NEXT STEP: run "npm run migrate" to create them, then "npm run check" again.\n');
  process.exit(2);
}

main().catch((e) => {
  console.error('  ✗ Unexpected error:', e);
  process.exit(1);
});
