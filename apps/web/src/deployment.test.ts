import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

interface VercelHeader {
  readonly key: string;
  readonly value: string;
}

interface VercelHeaderRule {
  readonly headers: readonly VercelHeader[];
  readonly source: string;
}

interface VercelRewrite {
  readonly destination: string;
  readonly source: string;
}

interface VercelConfig {
  readonly headers?: readonly VercelHeaderRule[];
  readonly rewrites?: readonly VercelRewrite[];
}

describe("Web deployment", () => {
  it("proxies Better Auth through the storefront origin before SPA routing", async () => {
    const config = JSON.parse(
      await readFile(path.resolve(process.cwd(), "vercel.json"), "utf-8")
    ) as VercelConfig;

    expect(config.rewrites?.[0]).toEqual({
      destination: "https://avin-server-two.vercel.app/api/auth/:path*",
      source: "/api/auth/:path*",
    });
  });

  it("rewrites direct client routes to the SPA entrypoint", async () => {
    const config = JSON.parse(
      await readFile(path.resolve(process.cwd(), "vercel.json"), "utf-8")
    ) as VercelConfig;

    expect(config.rewrites).toContainEqual({
      destination: "/index.html",
      source: "/(.*)",
    });
  });

  it("sets security and immutable asset cache headers", async () => {
    const config = JSON.parse(
      await readFile(path.resolve(process.cwd(), "vercel.json"), "utf-8")
    ) as VercelConfig;

    const documentHeaders = config.headers?.find(
      ({ source }) => source === "/(.*)"
    )?.headers;
    const assetHeaders = config.headers?.find(
      ({ source }) => source === "/assets/(.*)"
    )?.headers;

    expect(documentHeaders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "Content-Security-Policy" }),
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
      ])
    );
    expect(assetHeaders).toContainEqual({
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    });
  });
});
