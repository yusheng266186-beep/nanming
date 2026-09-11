import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "apps/web/test/**/*.test.ts",
      "apps/web-paper/test/**/*.test.ts", "apps/api/test/**/*.test.ts"],
    environment: "node",
    coverage: { enabled: false }
  }
});
