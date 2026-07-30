/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({
      autoCodeSplitting: true,
      target: "react",
    }),
    react(),
  ],
  resolve: {
    conditions: ["development", "browser"],
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
  },
  test: {
    env: { NODE_ENV: "development" },
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
