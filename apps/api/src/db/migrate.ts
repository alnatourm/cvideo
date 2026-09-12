import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const migrationPattern = /^\d{4}_.+\.sql$/;

function findMigrationsDirectory() {
  const configuredDirectory = process.env.CVIDEO_MIGRATIONS_DIR?.trim();
  const candidates = [
    configuredDirectory,
    resolve(process.cwd(), 'database/migrations'),
    resolve(process.cwd(), '../../database/migrations'),
    fileURLToPath(new URL('../../../../database/migrations/', import.meta.url)),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const migrationsDirectory = candidates.find((candidate) => existsSync(candidate));
  if (!migrationsDirectory) {
    throw new Error(`Database migrations directory was not found (checked from ${dirname(fileURLToPath(import.meta.url))})`);
  }

  return migrationsDirectory;
}

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const migrationsDirectory = findMigrationsDirectory();
  const filenames = (await readdir(migrationsDirectory)).filter((filename) => migrationPattern.test(filename)).sort();
  if (filenames.length === 0) throw new Error(`No database migrations found in ${migrationsDirectory}`);

  const client = postgres(databaseUrl, { max: 1 });
  try {
    await client`
      create table if not exists cvideo_schema_migrations (
        filename text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `;
    await client`select pg_advisory_lock(hashtext('cvideo_schema_migrations'))`;

    try {
      for (const filename of filenames) {
        const source = await readFile(resolve(migrationsDirectory, filename), 'utf8');
        const checksum = createHash('sha256').update(source).digest('hex');
        const existing = await client<{ checksum: string }[]>`
          select checksum from cvideo_schema_migrations where filename = ${filename}
        `;

        if (existing[0]) {
          if (existing[0].checksum !== checksum) {
            throw new Error(`Previously applied migration has changed: ${filename}`);
          }
          console.log(JSON.stringify({ level: 'info', service: 'cvideo-migrate', message: 'migration_current', filename }));
          continue;
        }

        await client.begin(async (transaction) => {
          await transaction.unsafe(source);
          await transaction`
            insert into cvideo_schema_migrations (filename, checksum) values (${filename}, ${checksum})
          `;
        });
        console.log(JSON.stringify({ level: 'info', service: 'cvideo-migrate', message: 'migration_applied', filename }));
      }
    } finally {
      await client`select pg_advisory_unlock(hashtext('cvideo_schema_migrations'))`;
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}

migrate().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration failure';
  console.error(JSON.stringify({ level: 'error', service: 'cvideo-migrate', message }));
  process.exitCode = 1;
});
