export function getServerEnv() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  const missing = [
    supabaseUrl ? null : "SUPABASE_URL",
    supabaseAnonKey ? null : "SUPABASE_ANON_KEY",
    databaseUrl ? null : "DATABASE_URL",
  ].filter((key): key is string => key !== null);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
    databaseUrl: databaseUrl!,
  };
}
