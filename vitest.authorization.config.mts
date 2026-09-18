import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globalSetup: ["./tests/authorization/phase-1-global-setup.ts"],
    fileParallelism: false,
    include: ["tests/authorization/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
});
