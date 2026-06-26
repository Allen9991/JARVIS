import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { existsSync } from "node:fs";
import path from "node:path";

const workspaceRoot = existsSync(path.join(process.cwd(), ".env.local"))
  ? process.cwd()
  : path.resolve(process.cwd(), "../..");

loadEnvConfig(workspaceRoot);

const nextConfig: NextConfig = {
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  },
  transpilePackages: ["@atlas/ui", "@atlas/shared", "@atlas/db"]
};

export default nextConfig;
