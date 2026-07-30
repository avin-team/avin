import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

dotenv.config({
  path: path.resolve(import.meta.dirname, "../../apps/server/.env"),
});

export default defineConfig({
  test: {
    environment: "node",
  },
});
