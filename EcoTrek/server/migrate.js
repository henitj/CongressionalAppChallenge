import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { neon } from '@neondatabase/serverless';

/**
 * Applies db/schema.sql and db/seed.sql to your Neon database.
 *
 *   npm run migrate
 *
 * Both files are written to be safe to run more than once.
 */

const here = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function run(file) {
  const text = readFileSync(join(here, '..', 'db', file), 'utf8');
  console.log(`\nApplying ${file}…`);
  // The driver's http transport runs one statement per call, so split on
  // semicolons that end a line — enough for these files, which use $$ blocks
  // only inside complete statements.
  const statements = splitStatements(text);
  let n = 0;
  for (const stmt of statements) {
    try {
      await sql.query(stmt);
      n++;
    } catch (e) {
      console.error(`\n  Failed:\n${stmt.slice(0, 200)}…\n  ${e.message}\n`);
      throw e;
    }
  }
  console.log(`  ${n} statements applied.`);
}

/** Splits SQL on top-level semicolons, respecting $$ ... $$ blocks and quotes. */
function splitStatements(sqlText) {
  const out = [];
  let buf = '';
  let inDollar = false;
  let inSingle = false;
  let inLineComment = false;

  for (let i = 0; i < sqlText.length; i++) {
    const ch = sqlText[i];
    const next2 = sqlText.slice(i, i + 2);

    if (inLineComment) {
      buf += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (!inSingle && !inDollar && next2 === '--') {
      inLineComment = true;
      buf += ch;
      continue;
    }
    if (!inSingle && next2 === '$$') {
      inDollar = !inDollar;
      buf += next2;
      i++;
      continue;
    }
    if (!inDollar && ch === "'") inSingle = !inSingle;

    if (ch === ';' && !inDollar && !inSingle) {
      push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  push(buf);

  function push(chunk) {
    const trimmed = chunk.trim();
    if (!trimmed) return;
    // A chunk usually carries the comment block that preceded it. Keep those
    // (Postgres is fine with them) but drop chunks that are ONLY comments —
    // checking `startsWith('--')` here instead would throw away every real
    // statement that happens to have a comment above it.
    const withoutComments = trimmed
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    if (withoutComments.length === 0) return;
    out.push(trimmed);
  }

  return out;
}

await run('schema.sql');
await run('seed.sql');
console.log('\nDone. Your Neon database is ready.\n');
