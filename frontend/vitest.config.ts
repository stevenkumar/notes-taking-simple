import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Frontend root, used to mirror tsconfig's "@/*": ["./*"] path alias so
 * tests can import app modules the same way source files do.
 */
const root = fileURLToPath(new URL(".", import.meta.url)).replace(
  /[\\/]+$/,
  "",
);

export default defineConfig({
  resolve: {
    alias: { "@": root },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    environment: "node",
  },
});
