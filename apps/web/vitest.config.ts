import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@atlas/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
      "@atlas/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts")
    }
  },
  test: {
    environment: "node",
    globals: false
  }
});
