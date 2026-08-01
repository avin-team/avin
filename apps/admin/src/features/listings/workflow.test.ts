import { describe, expect, it } from "vitest";

import { getModerationActionLabel, getModerationActions } from "./workflow";

describe("Admin Listing moderation actions", () => {
  it.each([
    ["PUBLISHED", ["HIDE", "ARCHIVE"]],
    ["HIDDEN", ["RESTORE", "ARCHIVE"]],
    ["DRAFT", ["ARCHIVE"]],
    ["PAUSED", ["ARCHIVE"]],
    ["ARCHIVED", []],
  ] as const)("shows the safe actions for a %s Listing", (status, actions) => {
    expect(getModerationActions(status)).toEqual(actions);
  });

  it("uses clear labels for each moderation action", () => {
    expect(getModerationActionLabel("HIDE")).toBe("Ẩn Listing");
    expect(getModerationActionLabel("RESTORE")).toBe("Khôi phục Listing");
    expect(getModerationActionLabel("ARCHIVE")).toBe("Lưu trữ Listing");
  });
});
