import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

interface VercelRewrite {
  readonly destination: string;
  readonly source: string;
}

interface VercelConfig {
  readonly rewrites?: readonly VercelRewrite[];
}

describe("Admin deployment", () => {
  it("rewrites direct client routes to the SPA entrypoint", async () => {
    const config = JSON.parse(
      await readFile(new URL("../vercel.json", import.meta.url), "utf-8")
    ) as VercelConfig;

    expect(config.rewrites).toContainEqual({
      destination: "/index.html",
      source: "/(.*)",
    });
  });
});
