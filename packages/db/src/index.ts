import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';

// Re-export the query operators so consumers import from @atlas/db rather
// than adding drizzle-orm as a direct dependency in every package.
export { and, eq, isNotNull, isNull } from 'drizzle-orm';

export type AtlasDbClient = ReturnType<typeof drizzle<typeof schema>>;

export function createDbClient(connectionString: string): AtlasDbClient {
  const sql = postgres(connectionString, { prepare: false });
  return drizzle(sql, { schema });
}
