export function getServerEnv() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [
      supabaseUrl ? null : "SUPABASE_URL",
      supabaseAnonKey ? null : "SUPABASE_ANON_KEY"
    ].filter((key): key is string => key !== null);

    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    supabaseUrl,
    supabaseAnonKey
  };
}
