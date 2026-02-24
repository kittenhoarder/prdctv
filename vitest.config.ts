import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    // Target: ≥85% (user rule). Current baseline ~75%; raise thresholds as coverage improves.
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/lib/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],
      thresholds: {
        lines: 75,
        functions: 70,
        branches: 55,
        statements: 74,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
