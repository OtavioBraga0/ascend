import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Testes que usam o banco rodam à parte: npm run test:integracao
    exclude: ["src/**/*.integracao.test.ts"],
  },
});
