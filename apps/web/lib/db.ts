import { createDbClient, type AtlasDbClient } from "@atlas/db";

let _client: AtlasDbClient | null = null;

export function getDbClient(): AtlasDbClient {
  if (!_client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Missing required environment variable: DATABASE_URL");
    _client = createDbClient(url);
  }
  return _client;
}
