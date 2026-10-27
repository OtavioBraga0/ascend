import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Testes contra o Postgres de DATABASE_URL (use o banco local do docker compose).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./test/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integracao.test.ts"],
    setupFiles: ["dotenv/config"],
    fileParallelism: false,
  },
});
