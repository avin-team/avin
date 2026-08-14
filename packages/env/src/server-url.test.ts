import { describe, expect, it } from "vitest";

import { resolveBrowserServerURL } from "./server-url";

describe("resolveBrowserServerURL", () => {
  it("uses the frontend origin in production so browser requests include its session cookie", () => {
    expect(
      resolveBrowserServerURL({
        frontendOrigin: "https://www.avin05.com",
        isProduction: true,
        serverURL: "https://avin-server-two.vercel.app",
      })
    ).toBe("https://www.avin05.com");
  });

  it("uses the configured server URL during local development", () => {
    expect(
      resolveBrowserServerURL({
        frontendOrigin: "http://localhost:5173",
        isProduction: false,
        serverURL: "http://localhost:3000",
      })
    ).toBe("http://localhost:3000");
  });
});
