import { describe, expect, it } from "vitest";

import { sanitizeRedirectPath } from "./sanitize-redirect-path";

describe("sanitizeRedirectPath", () => {
  it("keeps internal paths with query and hash", () => {
    expect(sanitizeRedirectPath("/avin-check/apply?step=2#form")).toBe(
      "/avin-check/apply?step=2#form"
    );
  });

  it.each(["https://attacker.example", "//attacker.example", "/\\attacker"])(
    "falls back for an external redirect: %s",
    (redirectTo) => {
      expect(sanitizeRedirectPath(redirectTo)).toBe("/");
    }
  );
});
