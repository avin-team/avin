import { describe, expect, it } from "vitest";

import { generateUuidV7 } from "./uuid";

describe("generateUuidV7", () => {
  it("generates valid UUID v7 string format", () => {
    const id = generateUuidV7();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
    );
  });

  it("generates time-ordered IDs", () => {
    const id1 = generateUuidV7(1_000_000_000_000);
    const id2 = generateUuidV7(1_000_000_000_001);
    expect(id1 < id2).toBe(true);
  });
});
