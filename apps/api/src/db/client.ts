import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as profileSchema from './schema.js';
import * as securitySchema from './security-schema.js';

const schema = { ...profileSchema, ...securitySchema };

export function createDatabase(databaseUrl: string) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const client = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return {
    client,
    db: drizzle(client, { schema }),
  };
}

export type Database = ReturnType<typeof createDatabase>['db'];
